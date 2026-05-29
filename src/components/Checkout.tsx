import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Package, CreditCard, Activity, Copy, Check, MessageCircle, Tag, Upload, Database, Lock, Truck } from 'lucide-react';
import type { CartItem } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useShippingLocations } from '../hooks/useShippingLocations';
import { useCouriers } from '../hooks/useCouriers';
import { supabase } from '../lib/supabase';
import { useImageUpload } from '../hooks/useImageUpload';

interface CheckoutProps {
    cartItems: CartItem[];
    totalPrice: number;
    onBack: () => void;
    clearCart: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack, clearCart }) => {
    const { paymentMethods } = usePaymentMethods();
    const { locations: shippingLocations } = useShippingLocations();
    const { couriers } = useCouriers();
    const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');

    // Customer Details
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Shipping Details
    const [address, setAddress] = useState('');
    const [barangay, setBarangay] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [selectedCourierId, setSelectedCourierId] = useState('');
    const [shippingLocation, setShippingLocation] = useState<string>('');

    // Payment
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [notes, setNotes] = useState('');

    const [orderMessage, setOrderMessage] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [contactOpened] = useState(false);

    const [orderNumber, setOrderNumber] = useState<string>('');

    // Terms & Conditions
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [hasScrolledTerms, setHasScrolledTerms] = useState(false);

    // Payment Proof
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const { uploadImage, uploading: isUploadingProof } = useImageUpload('payment-proofs');

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    React.useEffect(() => {
        if (paymentMethods.length > 0 && !selectedPaymentMethod) {
            setSelectedPaymentMethod(paymentMethods[0].id);
        }
    }, [paymentMethods, selectedPaymentMethod]);

    // Calculate shipping fee based on location
    const selectedLocation = shippingLocations.find(loc => loc.id === shippingLocation);
    const shippingFee = selectedLocation ? selectedLocation.fee : 0;

    const ADMIN_FEE = 300;

    // Calculate final total (Subtotal + Shipping + Admin Fee - Discount)
    const finalTotal = Math.max(0, totalPrice + shippingFee + ADMIN_FEE - discountAmount);

    // Handle Promo Code Application
    const handleApplyPromoCode = async () => {
        setPromoError('');
        setPromoSuccess('');
        setAppliedPromo(null);
        setDiscountAmount(0);

        const code = promoCode.trim().toUpperCase();
        if (!code) {
            setPromoError('Please enter a promo code');
            return;
        }

        setIsApplyingPromo(true);

        try {
            const { data: promo, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', code)
                .eq('active', true)
                .single();

            if (error || !promo) {
                setPromoError('Invalid or inactive promo code');
                setIsApplyingPromo(false);
                return;
            }

            // Check date validity
            const now = new Date();
            if (promo.start_date && new Date(promo.start_date) > now) {
                setPromoError('Promo code is not yet valid');
                setIsApplyingPromo(false);
                return;
            }
            if (promo.end_date && new Date(promo.end_date) < now) {
                setPromoError('Promo code has expired');
                setIsApplyingPromo(false);
                return;
            }

            // Check usage limits
            if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
                setPromoError('Promo code usage limit reached');
                setIsApplyingPromo(false);
                return;
            }

            // Check minimum purchase
            if (totalPrice < promo.min_purchase_amount) {
                setPromoError(`Minimum purchase of ₱${promo.min_purchase_amount} required`);
                setIsApplyingPromo(false);
                return;
            }

            // Calculate discount
            let discount = 0;
            if (promo.discount_type === 'percentage') {
                discount = (totalPrice * promo.discount_value) / 100;
                if (promo.max_discount_amount) {
                    discount = Math.min(discount, promo.max_discount_amount);
                }
            } else {
                discount = promo.discount_value;
            }

            discount = Math.min(discount, totalPrice);

            setDiscountAmount(discount);
            setAppliedPromo(promo);
            setPromoSuccess(`Promo code applied! You saved ₱${discount.toLocaleString()}`);
        } catch (err) {
            console.error('Error applying promo:', err);
            setPromoError('Failed to apply promo code');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const isDetailsValid =
        fullName.trim() !== '' &&
        email.trim() !== '' &&
        phone.trim() !== '' &&
        address.trim() !== '' &&
        barangay.trim() !== '' &&
        city.trim() !== '' &&
        state.trim() !== '' &&
        zipCode.trim() !== '' &&
        selectedCourierId !== '' &&
        shippingLocation !== '';

    const handleProceedToPayment = () => {
        if (isDetailsValid) {
            setStep('payment');
        }
    };


    const handlePlaceOrder = async () => {
        if (!shippingLocation) {
            alert('Please select your shipping location.');
            return;
        }

        if (!paymentProof) {
            alert('Please upload a screenshot of your payment proof to proceed.');
            return;
        }

        if (!agreedToTerms) {
            alert('Please read and agree to the Terms & Conditions before placing your order.');
            return;
        }

        const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);

        try {
            // 1. Upload Payment Proof First
            let paymentProofUrl = null;
            if (paymentProof) {
                try {
                    paymentProofUrl = await uploadImage(paymentProof);
                } catch (uploadError: any) {
                    console.error('Failed to upload payment proof:', uploadError);
                    alert(`Failed to upload payment proof: ${uploadError.message}`);
                    return;
                }
            }

            const orderItems = cartItems.map(item => {
                const basePrice = item.variation ? item.variation.price : item.product.base_price;
                let currentPrice = basePrice;
                const isDiscounted = item.variation
                    ? (item.variation.discount_active && item.variation.discount_price !== null && item.variation.discount_price < basePrice)
                    : (item.product.discount_active && item.product.discount_price !== null && item.product.discount_price < item.product.base_price);
                if (isDiscounted) {
                    currentPrice = item.variation?.discount_price ?? item.product.discount_price ?? basePrice;
                }

                return {
                    product_id: item.product.id,
                    product_name: item.product.name,
                    variation_id: item.variation?.id || null,
                    variation_name: item.variation?.name || null,
                    quantity: item.quantity,
                    price: currentPrice,
                    total: currentPrice * item.quantity,
                    purity_percentage: item.product.purity_percentage
                };
            });

            // Generate order number before saving
            const randomDigits = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
            const customOrderNumber = `BRC-${randomDigits}`;

            // Save order to database
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    customer_name: fullName,
                    customer_email: email,
                    customer_phone: phone,
                    shipping_address: address,
                    shipping_barangay: barangay,
                    shipping_city: city,
                    shipping_state: state,
                    shipping_zip_code: zipCode,
                    order_items: orderItems,
                    total_price: Math.max(0, totalPrice - discountAmount), // Store subtotal minus discount (not including shipping)
                    shipping_fee: shippingFee,
                    courier_id: selectedCourierId || null,
                    shipping_location: shippingLocation,
                    payment_method_id: paymentMethod?.id || null,
                    payment_method_name: paymentMethod?.name || null,
                    payment_proof_url: paymentProofUrl,
                    contact_method: 'whatsapp',
                    notes: notes.trim() || null,
                    order_status: 'new',
                    payment_status: 'pending',
                    promo_code_id: appliedPromo?.id || null,
                    promo_code: appliedPromo?.code || null,
                    discount_applied: discountAmount,
                    order_number: customOrderNumber
                }])
                .select()
                .single();

            if (orderError) {
                console.error('❌ Error saving order:', orderError);

                const errorMessage = orderError.message;
                console.error('Order error details:', { code: orderError.code, details: orderError.details, hint: orderError.hint });

                alert(`Failed to save order: ${errorMessage}\n\nPlease contact support if this issue persists.`);
                return;
            }

            // Update promo code usage count
            if (appliedPromo) {
                const { error: promoUpdateError } = await supabase
                    .from('promo_codes')
                    .update({ usage_count: appliedPromo.usage_count + 1 })
                    .eq('id', appliedPromo.id);

                if (promoUpdateError) {
                    console.error('Failed to update promo usage count:', promoUpdateError);
                }
            }

            console.log('✅ Order saved to database:', orderData);

            setOrderNumber(customOrderNumber);

            try {
                const HISTORY_KEY = 'luxxbio_order_history';
                const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
                const entry = {
                    order_number: customOrderNumber,
                    placed_at: new Date().toISOString(),
                    customer_name: fullName,
                    customer_email: email,
                    total: finalTotal,
                    item_count: cartItems.reduce((sum, i) => sum + i.quantity, 0),
                };
                const filtered = existing.filter((e: any) => e.order_number !== customOrderNumber);
                const next = [entry, ...filtered].slice(0, 20);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn('Could not save order to local history:', e);
            }

            // Get current date and time
            const now = new Date();
            const dateTimeStamp = now.toLocaleString('en-PH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            const orderDetails = `
✨ LUXXBIO LABS - NEW ORDER

📅 ORDER DATE & TIME
${dateTimeStamp}

👤 CUSTOMER INFORMATION
Name: ${fullName}
Email: ${email}
Phone: ${phone}

📦 SHIPPING ADDRESS
${address}
${barangay}
${city}, ${state} ${zipCode}
Courier: ${couriers.find(c => c.id === selectedCourierId)?.name || 'N/A'}

🛒 ORDER DETAILS
${cartItems.map(item => {
                let line = `• ${item.product.name}`;
                if (item.variation) {
                    line += ` (${item.variation.name})`;
                }
                const basePrice = item.variation ? item.variation.price : item.product.base_price;
                let currentPrice = basePrice;
                const isDiscounted = item.variation
                    ? (item.variation.discount_active && item.variation.discount_price !== null && item.variation.discount_price < basePrice)
                    : (item.product.discount_active && item.product.discount_price !== null && item.product.discount_price < item.product.base_price);
                if (isDiscounted) {
                    currentPrice = item.variation?.discount_price ?? item.product.discount_price ?? basePrice;
                }

                line += ` x${item.quantity} - ₱${(currentPrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
                if (item.product.purity_percentage && item.product.purity_percentage > 0) {
                    line += `\n  Purity: ${item.product.purity_percentage}%`;
                }
                return line;
            }).join('\n\n')}

💰 PRICING
Product Total: ₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
Shipping Fee: ₱${shippingFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })} (${shippingLocation.replace('_', ' & ')})
Admin Fee: ₱${ADMIN_FEE.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
${discountAmount > 0 ? `Discount (${appliedPromo?.code}): -₱${discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}\n` : ''}Grand Total: ₱${finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}

💳 PAYMENT METHOD
${paymentMethod?.name || 'N/A'}
      ${paymentMethod ? `Account: ${paymentMethod.account_number}` : ''}

📸 PROOF OF PAYMENT
${paymentProofUrl ? 'Screenshot attached to order.' : 'Pending'}

📱 PREFERRED CONTACT METHOD
WhatsApp — 09696187009

📋 ORDER NUMBER: ${customOrderNumber}

Please confirm this order. Thank you!
      `.trim();

            setOrderMessage(orderDetails);

            // Auto-copy to clipboard
            try {
                await navigator.clipboard.writeText(orderDetails);
                setCopied(true);
            } catch (err) {
                console.error('Failed to auto-copy:', err);
            }

            // Clear the cart now that the order is saved
            clearCart();

            // Show confirmation
            setStep('confirmation');

            // Auto-open WhatsApp
            setTimeout(() => {
                const url = `https://wa.me/639696187009?text=${encodeURIComponent(orderDetails)}`;
                window.open(url, '_blank');
            }, 1500);
        } catch (error) {
            console.error('❌ Error placing order:', error);
            alert(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
        }
    };

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(orderMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback
            alert('Failed to copy. Please manually select and copy the message.');
        }
    };

    const handleOpenWhatsApp = () => {
        const url = `https://wa.me/639696187009?text=${encodeURIComponent(orderMessage)}`;
        window.open(url, '_blank');
    };

    if (step === 'confirmation') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
                <div className="max-w-2xl w-full">
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 md:p-12 text-center border border-gray-100">
                        <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <ShieldCheck className="w-12 h-12 text-emerald-600" />
                        </div>
                        <h1 className="font-heading text-3xl md:text-4xl font-bold text-charcoal-900 mb-4 tracking-tight">
                            Order Confirmed
                        </h1>
                        <p className="text-gray-600 mb-4 text-base md:text-lg leading-relaxed">
                            Your order details have been pre-filled. Send them via WhatsApp to finalize your order!
                        </p>

                        {/* Order ID Display */}
                        {orderNumber && (
                            <div className="bg-brand-50/20 border border-brand-100 rounded-lg p-4 mb-6">
                                <p className="text-sm text-brand-700 mb-1 font-bold uppercase tracking-wider">Order Reference</p>
                                <p className="text-2xl font-bold text-charcoal-900 font-mono">
                                    {orderNumber}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">Use this reference for tracking and support</p>
                                <p className="text-xs text-emerald-700 mt-2 flex items-center justify-center gap-1.5">
                                    <Check className="w-3.5 h-3.5" />
                                    Saved to this device — you can find it later under <a href="/track-order" className="underline font-semibold ml-1">Track Order</a>.
                                </p>
                            </div>
                        )}

                        {/* Order Message Display */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-charcoal-900 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-brand-600" />
                                    Order Details
                                </h3>
                                <button
                                    onClick={handleCopyMessage}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded font-medium transition-all text-sm shadow-sm"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="bg-white rounded p-4 border border-gray-300 max-h-64 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                    {orderMessage}
                                </pre>
                            </div>
                            {copied && (
                                <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1 font-medium">
                                    <Check className="w-4 h-4" />
                                    Copied to clipboard! Ready to send.
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 mb-8">
                            <button
                                onClick={handleOpenWhatsApp}
                                className="w-full py-4 text-base flex items-center justify-center gap-2 shadow-lg rounded bg-[#25D366] hover:bg-[#1ebe5d] text-white font-medium transition-all"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Open WhatsApp & Send
                            </button>

                            <p className="text-sm text-gray-500">
                                Your order details are auto-copied. Send the message via <span className="font-bold">WhatsApp 09696187009</span>.
                            </p>
                        </div>

                        <div className="bg-brand-50/20 rounded-lg p-6 mb-8 text-left border border-brand-100">
                            <h3 className="font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-brand-600" />
                                Next Steps
                            </h3>
                            <ul className="space-y-3 text-sm text-gray-700">
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">1.</span>
                                    <span>Confirmation within 24 hours of payment receipt.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">2.</span>
                                    <span>Research-grade packaging and secure handling.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">3.</span>
                                    <span>Shipping every Wednesday and Saturday only.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">4.</span>
                                    <span>Tracking details sent via your selected contact method after dispatch.</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                window.location.href = '/';
                            }}
                            className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to Catalog
                        </button>
                    </div>
                </div>
            </div >
        );
    }

    // Payment Step
    if (step === 'payment') {
        return (
            <div className="min-h-screen bg-white py-8 md:py-12">
                <div className="container mx-auto px-4 max-w-6xl">
                    <button
                        onClick={() => setStep('details')}
                        className="text-gray-500 hover:text-brand-600 font-medium mb-6 flex items-center gap-2 transition-colors group text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Details</span>
                    </button>

                    {/* Stepper */}
                    <div className="flex items-center gap-2 mb-8 text-xs font-semibold tracking-wide">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check className="w-4 h-4" />
                            </div>
                            <span className="hidden sm:inline">DETAILS</span>
                        </div>
                        <div className="h-px flex-1 bg-brand-300" />
                        <div className="flex items-center gap-2 text-brand-700">
                            <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center">2</div>
                            <span className="hidden sm:inline">PAYMENT</span>
                        </div>
                        <div className="h-px flex-1 bg-gray-200" />
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">3</div>
                            <span className="hidden sm:inline">CONFIRM</span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h1 className="font-heading text-3xl md:text-4xl font-bold text-charcoal-900 tracking-tight flex items-center gap-3">
                            Payment & Verification
                            <Lock className="w-6 h-6 text-brand-600" />
                        </h1>
                        <p className="text-gray-500 text-sm mt-2">Secure your order with a quick payment confirmation.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">

                            {/* Payment Methods */}
                            <div className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-brand-600" />
                                    Select Payment Method
                                </h2>
                                <div className="space-y-3">
                                    {paymentMethods.map((method) => (
                                        <div key={method.id}>
                                            <label
                                                className={`block p-4 rounded border cursor-pointer transition-all ${selectedPaymentMethod === method.id
                                                    ? 'border-brand-500 bg-brand-50/20 ring-1 ring-brand-500'
                                                    : 'border-gray-200 hover:border-brand-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value={method.id}
                                                        checked={selectedPaymentMethod === method.id}
                                                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                        className="text-brand-600 focus:ring-brand-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-charcoal-900">{method.name}</p>
                                                                <p className="text-sm text-gray-600 font-mono mt-1">{method.account_number}</p>
                                                                {method.account_name && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">Account Name: {method.account_name}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </label>

                                            {/* Show QR Code if this method is selected and has a QR code */}
                                            {selectedPaymentMethod === method.id && method.qr_code_url && (
                                                <div className="mt-2 ml-8 mb-4 p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Scan to Pay</p>
                                                    <div className="flex justify-center">
                                                        <img
                                                            src={method.qr_code_url}
                                                            alt={`${method.name} QR Code`}
                                                            className="max-w-[200px] w-full h-auto rounded-lg border border-gray-200"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-center text-gray-400 mt-2">
                                                        Screenshot your payment and upload it below
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Proof Upload */}
                            <div className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-brand-600" />
                                    Upload Proof of Payment
                                </h2>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-400 transition-colors bg-gray-50/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setPaymentProof(e.target.files[0]);
                                            }
                                        }}
                                        className="hidden"
                                        id="payment-proof-upload"
                                    />
                                    <label htmlFor="payment-proof-upload" className="cursor-pointer flex flex-col items-center">
                                        {paymentProof ? (
                                            <>
                                                <Check className="w-12 h-12 text-emerald-600 mb-3" />
                                                <p className="font-medium text-charcoal-900">{paymentProof.name}</p>
                                                <p className="text-sm text-gray-500 mt-1">Click to change file</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                                <p className="font-medium text-charcoal-900">Click to upload screenshot</p>
                                                <p className="text-xs text-gray-500 mt-1">Gcash/Bank transfer receipt</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4">
                                    Additional Notes (Optional)
                                </h2>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm h-24"
                                    placeholder="Special instructions for delivery..."
                                />
                            </div>

                            {/* Terms & Conditions */}
                            <div className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-brand-600" />
                                    Terms & Conditions
                                </h2>
                                <p className="text-xs text-gray-500 mb-3">
                                    Please scroll through and read our Terms & Conditions before placing your order.
                                </p>
                                <div
                                    onScroll={(e) => {
                                        const el = e.currentTarget;
                                        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
                                            setHasScrolledTerms(true);
                                        }
                                    }}
                                    className="h-48 overflow-y-auto border border-gray-200 rounded p-4 bg-gray-50 text-xs text-gray-700 leading-relaxed space-y-3"
                                >
                                    <p><strong>1. Research Use Only.</strong> All products sold by LuxxBio Labs are intended strictly for in-vitro research and laboratory use. They are not for human or animal consumption, diagnostic, therapeutic, cosmetic, or any other clinical use. By placing this order you confirm that you are a qualified researcher and will use the products solely for lawful research purposes.</p>
                                    <p><strong>2. Eligibility.</strong> You must be at least 21 years of age and legally permitted to purchase research compounds in your jurisdiction. You are solely responsible for ensuring that ordering, receiving, and handling these products complies with the laws of your country, state, and locality.</p>
                                    <p><strong>3. Order Acceptance & Payment.</strong> All orders are subject to verification and acceptance. Payment must be completed in full and proof of payment submitted before the order is processed. Orders without verified payment will not be released.</p>
                                    <p><strong>4. Shipping & Delivery.</strong> Delivery timelines are estimates and may vary based on courier, location, and external factors beyond our control. Risk of loss transfers to you once the package is handed to the courier. Tracking will be provided once your order has shipped.</p>
                                    <p><strong>5. Returns & Refunds.</strong> Due to the sensitive nature of research compounds, all sales are final. Refunds or replacements are issued only if the item arrives damaged, defective, or incorrect, and only when reported within 48 hours of delivery with photographic evidence.</p>
                                    <p><strong>6. Limitation of Liability.</strong> LuxxBio Labs is not liable for any direct, indirect, incidental, or consequential damages arising from the misuse, handling, or storage of our products. The customer assumes full responsibility upon receipt.</p>
                                    <p><strong>7. Privacy.</strong> Information you provide is used only to process your order and fulfill delivery. We do not sell or share your data with third parties beyond what is necessary for shipping and payment processing.</p>
                                    <p><strong>8. Agreement.</strong> By checking the box below, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions.</p>
                                </div>

                                <label className={`mt-4 flex items-start gap-3 cursor-pointer select-none ${!hasScrolledTerms ? 'opacity-60' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        disabled={!hasScrolledTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="mt-1 w-4 h-4 accent-brand-600 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <span className="text-sm text-charcoal-900">
                                        I have read and agree to the Terms & Conditions.
                                        {!hasScrolledTerms && (
                                            <span className="block text-xs text-gray-500 mt-0.5">
                                                Scroll to the bottom of the terms to enable this checkbox.
                                            </span>
                                        )}
                                    </span>
                                </label>
                            </div>

                            <button
                                onClick={handlePlaceOrder}
                                disabled={!paymentProof || isUploadingProof || !agreedToTerms}
                                className="w-full btn-primary py-4 text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isUploadingProof ? 'Uploading Proof...' : 'Complete Order'}
                            </button>
                        </div>

                        {/* Sidebar Summary (Reused logic, simplified UI) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded shadow-clinical p-6 sticky top-24 border border-gray-100">
                                <h3 className="font-heading font-bold text-charcoal-900 mb-4">Order Summary</h3>
                                <div className="space-y-2 mb-4">
                                    {cartItems.map((item, idx) => {
                                        const basePrice = item.variation ? item.variation.price : item.product.base_price;
                                        let currentPrice = basePrice;
                                        const isDiscounted = item.variation
                                            ? (item.variation.discount_active && item.variation.discount_price !== null && item.variation.discount_price < basePrice)
                                            : (item.product.discount_active && item.product.discount_price !== null && item.product.discount_price < item.product.base_price);
                                        if (isDiscounted) {
                                            currentPrice = item.variation?.discount_price ?? item.product.discount_price ?? basePrice;
                                        }

                                        return (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                                                <span className="font-medium">₱{(currentPrice * item.quantity).toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span>₱{totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Shipping</span>
                                        <span>₱{shippingFee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Admin Fee</span>
                                        <span>₱{ADMIN_FEE.toLocaleString()}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-emerald-600 font-medium">
                                            <span>Discount</span>
                                            <span>-₱{discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-charcoal-900 text-lg pt-2">
                                        <span>Total</span>
                                        <span>₱{finalTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    // Details Step
    return (
        <div className="min-h-screen py-8 md:py-12" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAF7 100%)' }}>
            <div className="container mx-auto px-4 max-w-6xl">
                <button
                    onClick={onBack}
                    className="text-gray-500 hover:text-brand-600 font-medium mb-6 flex items-center gap-2 transition-colors group text-sm"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Cart</span>
                </button>

                <div className="mb-10">
                    <span className="inline-block text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#B8941F' }}>
                        Secure Checkout
                    </span>
                    <h1 className="font-heading text-3xl md:text-4xl font-semibold text-charcoal-900 flex items-center gap-3">
                        Checkout Information
                        <span className="inline-block h-px flex-1 max-w-[120px]" style={{ background: 'linear-gradient(90deg, #D4AF37, transparent)' }} />
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Information */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(10,10,10,0.04), 0 8px 28px rgba(10,10,10,0.05)' }}>
                            <div className="flex items-center justify-between mb-6 pb-5 border-b" style={{ borderColor: 'rgba(10,10,10,0.06)' }}>
                                <h2 className="font-heading text-xl font-semibold text-charcoal-900 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFE388 100%)', color: '#957515' }}>
                                        <Package className="w-5 h-5" />
                                    </div>
                                    Customer Details
                                </h2>
                                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#B8941F' }}>Step 1 / 2</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="input-field"
                                        placeholder="Juan Dela Cruz"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field"
                                        placeholder="juan@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="input-field"
                                        placeholder="09XX XXX XXXX"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(10,10,10,0.04), 0 8px 28px rgba(10,10,10,0.05)' }}>
                            <div className="flex items-center mb-6 pb-5 border-b" style={{ borderColor: 'rgba(10,10,10,0.06)' }}>
                                <h2 className="font-heading text-xl font-semibold text-charcoal-900 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFE388 100%)', color: '#957515' }}>
                                        <Database className="w-5 h-5" />
                                    </div>
                                    Shipping Address
                                </h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                        Street Address *
                                    </label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="input-field"
                                        placeholder="House/Unit, Street Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                        Barangay *
                                    </label>
                                    <input
                                        type="text"
                                        value={barangay}
                                        onChange={(e) => setBarangay(e.target.value)}
                                        className="input-field"
                                        placeholder="Brgy. Name"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="input-field"
                                            placeholder="City"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                            Province *
                                        </label>
                                        <input
                                            type="text"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            className="input-field"
                                            placeholder="Province"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2">
                                        ZIP/Postal Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={zipCode}
                                        onChange={(e) => setZipCode(e.target.value)}
                                        className="input-field"
                                        placeholder="ZIP Code"
                                        required
                                    />
                                </div>
                            </div>
                        </div>


                    {/* Courier Selection */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(10,10,10,0.04), 0 8px 28px rgba(10,10,10,0.05)' }}>
                        <div className="flex items-center mb-5 pb-5 border-b" style={{ borderColor: 'rgba(10,10,10,0.06)' }}>
                            <h2 className="font-heading text-xl font-semibold text-charcoal-900 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFE388 100%)', color: '#957515' }}>
                                    <Truck className="w-5 h-5" />
                                </div>
                                Select Courier Provider
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {couriers
                                .filter(c => c.is_active)
                                .map((courier) => (
                                    <button
                                        key={courier.id}
                                        onClick={() => {
                                            setSelectedCourierId(courier.id);
                                            setShippingLocation(''); // Reset location when courier changes
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${selectedCourierId === courier.id
                                            ? 'border-brand-500 bg-brand-50/40 shadow-[0_4px_18px_rgba(212,175,55,0.18)]'
                                            : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/20'
                                            }`}
                                    >
                                        <div className="font-semibold text-charcoal-900 text-sm">{courier.name}</div>
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Shipping Location Selection */}
                    <div className={`bg-white rounded-2xl p-6 md:p-8 border border-gray-100 transition-opacity duration-300 ${!selectedCourierId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`} style={{ boxShadow: '0 1px 3px rgba(10,10,10,0.04), 0 8px 28px rgba(10,10,10,0.05)' }}>
                        <h2 className="font-heading text-xl font-semibold text-charcoal-900 mb-3 flex items-center gap-3">
                            Choose Shipping Region
                        </h2>
                        <p className="text-xs text-charcoal-600 mb-6 p-3 rounded-lg border" style={{ background: '#FFFCF0', borderColor: 'rgba(212,175,55,0.30)' }}>
                            {selectedCourierId
                                ? 'Select the rate applicable to your location.'
                                : 'Please select a courier provider above first.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                                if (!selectedCourierId) return [];
                                const courier = couriers.find(c => c.id === selectedCourierId);
                                if (!courier) return [];

                                const code = courier.code.toLowerCase();
                                const matched = shippingLocations.filter(loc =>
                                    loc.id.toLowerCase().includes(code) ||
                                    loc.name.toLowerCase().includes(code)
                                );

                                // Fallback: if no locations match this courier's code,
                                // show all active locations so the user isn't stuck.
                                return matched.length > 0 ? matched : shippingLocations;
                            })()
                                .map((loc) => (
                                    <button
                                        key={loc.id}
                                        onClick={() => setShippingLocation(loc.id)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${shippingLocation === loc.id
                                            ? 'border-brand-500 bg-brand-50/40 shadow-[0_4px_18px_rgba(212,175,55,0.18)]'
                                            : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/20'
                                            }`}
                                    >
                                        <p className="font-semibold text-charcoal-900 text-sm mb-1">{loc.name || loc.id.replace('_', ' & ')}</p>
                                        <p className="text-xs font-semibold" style={{ color: '#B8941F' }}>₱{loc.fee}</p>
                                    </button>
                                ))}
                        </div>
                    </div>

                    <button
                        onClick={handleProceedToPayment}
                        disabled={!isDetailsValid}
                        className={`w-full py-4 rounded font-bold text-base transition-all transform shadow-md ${isDetailsValid
                            ? 'btn-primary hover:scale-[1.01]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Proceed to Payment
                    </button>
                    </div>
                </div>

                {/* Order Summary Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl p-6 md:p-7 sticky top-24 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(10,10,10,0.04), 0 12px 32px rgba(10,10,10,0.06)' }}>
                        <div className="flex items-center justify-between mb-6 pb-5 border-b" style={{ borderColor: 'rgba(10,10,10,0.06)' }}>
                            <h2 className="font-heading text-xl font-semibold text-charcoal-900">
                                Order Summary
                            </h2>
                            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFE388 100%)', color: '#957515' }}>
                                <Activity className="w-4 h-4" />
                            </span>
                        </div>

                        <div className="space-y-4 mb-6">
                            {cartItems.map((item, index) => {
                                const basePrice = item.variation ? item.variation.price : item.product.base_price;
                                let currentPrice = basePrice;
                                const isDiscounted = item.variation
                                    ? (item.variation.discount_active && item.variation.discount_price !== null && item.variation.discount_price < basePrice)
                                    : (item.product.discount_active && item.product.discount_price !== null && item.product.discount_price < item.product.base_price);

                                if (isDiscounted) {
                                    currentPrice = item.variation?.discount_price ?? item.product.discount_price ?? basePrice;
                                }

                                return (
                                    <div key={index} className="pb-4 border-b border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-charcoal-900 text-sm">{item.product.name}</h4>
                                                {item.variation && (
                                                    <p className="text-xs text-gray-600 mt-0.5">{item.variation.name}</p>
                                                )}
                                            </div>
                                            <span className="font-bold text-charcoal-900 text-sm">
                                                ₱{(currentPrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Promo Code */}
                        <div className="mb-6 pt-2">
                            <p className="text-[11px] font-semibold text-charcoal-700 uppercase tracking-[0.14em] mb-2 flex items-center gap-1.5">
                                <Tag className="w-3 h-3" style={{ color: '#B8941F' }} /> Promo Code
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    placeholder="ENTER CODE"
                                    className="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500 outline-none uppercase tracking-wider transition-all"
                                    disabled={!!appliedPromo || isApplyingPromo}
                                />
                                {appliedPromo ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAppliedPromo(null);
                                            setDiscountAmount(0);
                                            setPromoCode('');
                                            setPromoSuccess('');
                                        }}
                                        className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 shrink-0 whitespace-nowrap transition-all"
                                    >
                                        REMOVE
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleApplyPromoCode}
                                        disabled={!promoCode || isApplyingPromo}
                                        className="px-4 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50 shrink-0 whitespace-nowrap transition-all"
                                        style={{ background: '#0A0A0A', color: '#FFE388' }}
                                    >
                                        APPLY
                                    </button>
                                )}
                            </div>
                            {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
                            {promoSuccess && <p className="text-emerald-600 text-xs mt-1 font-medium">{promoSuccess}</p>}
                        </div>

                        <div className="space-y-2.5 text-sm text-gray-700 border-t border-gray-100 pt-5">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-charcoal-900">₱{totalPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Admin Fee</span>
                                <span className="font-medium text-charcoal-900">₱{ADMIN_FEE.toLocaleString()}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-medium">
                                    <span>Discount</span>
                                    <span>-₱{discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-charcoal-900 text-lg pt-3 mt-2 border-t" style={{ borderColor: 'rgba(212,175,55,0.30)' }}>
                                <span>Total Estimate</span>
                                <span style={{ color: '#957515' }}>₱{Math.max(0, totalPrice + ADMIN_FEE - discountAmount).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-400 text-right italic">+ Shipping fee added at payment</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
