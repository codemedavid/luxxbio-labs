import React, { useState, useEffect } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, ArrowRight, ExternalLink, ArrowLeft, History, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ORDER_HISTORY_KEY = 'luxxbio_order_history';

interface OrderHistoryEntry {
    order_number: string;
    placed_at: string;
    customer_name?: string;
    customer_email?: string;
    total?: number;
    item_count?: number;
}

const loadOrderHistory = (): OrderHistoryEntry[] => {
    try {
        const raw = localStorage.getItem(ORDER_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const GOLD = '#B8941F';
const INK = '#0A0A0A';
const MUTED = '#6b6b6b';
const LINE = 'rgba(10,10,10,0.08)';
const SURFACE = '#fafaf7';
const ADMIN_FEE = 300;

interface TrackingOrder {
    id: string;
    order_number: string | null;
    order_status: string;
    payment_status: string;
    tracking_number: string | null;
    shipping_provider: string | null;
    shipping_note: string | null;
    total_price: number;
    shipping_fee: number;
    order_items: {
        product_name: string;
        quantity: number;
    }[];
    created_at: string;
    promo_code: string | null;
    discount_applied: number | null;
}

const OrderTracking: React.FC = () => {
    const [orderId, setOrderId] = useState('');
    const [order, setOrder] = useState<TrackingOrder | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);

    useEffect(() => {
        setOrderHistory(loadOrderHistory());
    }, []);

    const trackOrderByNumber = async (rawId: string) => {
        const trimmed = rawId.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        setOrder(null);
        setHasSearched(true);

        try {
            const { data, error } = await supabase
                .rpc('get_order_details', { order_id_input: trimmed })
                .maybeSingle();

            if (error) {
                throw error;
            } else if (data) {
                setOrder(data as TrackingOrder);
            } else {
                setError('Order not found. Please check your Order ID and try again.');
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            setError('An error occurred while fetching your order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        await trackOrderByNumber(orderId);
    };

    const handleHistoryClick = async (entry: OrderHistoryEntry) => {
        setOrderId(entry.order_number);
        await trackOrderByNumber(entry.order_number);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRemoveHistory = (orderNumber: string) => {
        const next = orderHistory.filter(e => e.order_number !== orderNumber);
        setOrderHistory(next);
        try {
            localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }
    };

    const handleClearHistory = () => {
        if (!confirm('Clear all saved order numbers from this device?')) return;
        setOrderHistory([]);
        try {
            localStorage.removeItem(ORDER_HISTORY_KEY);
        } catch {
            /* ignore */
        }
    };

    const getStatusStep = (status: string) => {
        const steps = ['new', 'confirmed', 'processing', 'shipped', 'delivered'];
        const statusIndex = steps.indexOf(status);
        if (status === 'cancelled') return -1;
        return statusIndex;
    };

    const currentStep = order ? getStatusStep(order.order_status) : 0;

    const providerLabel = (p: string | null) => {
        switch (p) {
            case 'lalamove': return 'Lalamove';
            case 'maxim': return 'Maxim';
            case 'spx': return 'SPX Express';
            default: return 'J&T Express';
        }
    };

    const trackHref = (p: string | null, num: string) => {
        switch (p) {
            case 'lalamove': return 'https://web.lalamove.com/';
            case 'maxim': return 'https://taximaxim.com/';
            case 'spx': return 'https://spx.ph/track';
            default: return `https://www.jtexpress.ph/index/query/gzquery.html?bills=${num}`;
        }
    };

    return (
        <div className="min-h-screen" style={{ background: '#ffffff' }}>
            {/* Editorial header */}
            <div className="relative overflow-hidden" style={{ background: INK }}>
                <div
                    className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)`, opacity: 0.18, filter: 'blur(40px)' }}
                />
                <div className="container mx-auto px-5 md:px-8 py-14 md:py-20 max-w-3xl relative z-10">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-sans font-medium uppercase tracking-[0.12em] mb-8 group"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Back to Shop
                    </a>

                    <div className="text-center">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                        >
                            <Truck className="w-3.5 h-3.5" style={{ color: GOLD }} />
                            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em]" style={{ color: '#F5E6C8' }}>
                                Order Tracking
                            </span>
                        </div>
                        <h1
                            className="font-heading font-light text-white mb-4"
                            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', letterSpacing: '-0.02em' }}
                        >
                            Track your <em className="italic" style={{ color: GOLD }}>order</em>
                        </h1>
                        <p
                            className="font-sans text-sm md:text-base max-w-xl mx-auto leading-relaxed"
                            style={{ color: 'rgba(255,255,255,0.65)' }}
                        >
                            Enter your order number to check the current status of your shipment.
                            {orderHistory.length > 0 && (
                                <span className="block mt-2 text-xs" style={{ color: GOLD }}>
                                    Forgot your order number? Check your saved history below.
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-5 md:px-8 py-12 md:py-16 max-w-3xl">

                {/* Search */}
                <div
                    className="rounded-2xl p-5 md:p-6 mb-8"
                    style={{ background: SURFACE, border: `1px solid ${LINE}` }}
                >
                    <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Enter order number (e.g., TBS-1234)"
                                className="w-full pl-11 pr-4 py-3.5 rounded-full font-sans text-sm focus:outline-none transition-all"
                                style={{
                                    background: '#ffffff',
                                    border: `1px solid ${LINE}`,
                                    color: INK,
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !orderId.trim()}
                            className="px-7 py-3.5 rounded-full font-sans font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: INK,
                                color: '#fff',
                                boxShadow: '0 4px 14px rgba(10,10,10,0.18)',
                            }}
                            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = GOLD; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Searching
                                </>
                            ) : (
                                <>
                                    Track Order
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Order History (saved on this device) */}
                {orderHistory.length > 0 && (
                    <div
                        className="rounded-2xl p-5 md:p-6 mb-8"
                        style={{ background: '#ffffff', border: `1px solid ${LINE}` }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4" style={{ color: GOLD }} />
                                <h3 className="font-heading font-semibold text-sm" style={{ color: INK }}>
                                    Recent orders on this device
                                </h3>
                            </div>
                            <button
                                onClick={handleClearHistory}
                                className="text-[10px] font-sans uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
                                style={{ color: MUTED }}
                            >
                                Clear all
                            </button>
                        </div>
                        <p className="font-sans text-xs mb-4" style={{ color: MUTED }}>
                            Tap an order to track it instantly. Stored locally — clears if you wipe browser data.
                        </p>
                        <ul className="space-y-2">
                            {orderHistory.map((entry) => (
                                <li
                                    key={entry.order_number}
                                    className="flex items-center gap-2"
                                >
                                    <button
                                        onClick={() => handleHistoryClick(entry)}
                                        className="flex-1 flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all hover:shadow-sm"
                                        style={{ background: SURFACE, border: `1px solid ${LINE}` }}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-mono text-sm font-semibold" style={{ color: INK }}>
                                                {entry.order_number}
                                            </p>
                                            <p className="font-sans text-[11px] mt-0.5" style={{ color: MUTED }}>
                                                {new Date(entry.placed_at).toLocaleString('en-PH', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                })}
                                                {entry.item_count != null && ` · ${entry.item_count} item${entry.item_count === 1 ? '' : 's'}`}
                                                {entry.total != null && ` · ₱${entry.total.toLocaleString()}`}
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                                    </button>
                                    <button
                                        onClick={() => handleRemoveHistory(entry.order_number)}
                                        className="p-2 rounded-xl transition-colors hover:bg-gray-100"
                                        title="Remove from history"
                                        aria-label="Remove from history"
                                    >
                                        <Trash2 className="w-4 h-4" style={{ color: MUTED }} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div
                        className="rounded-xl p-4 flex items-center gap-3 mb-6"
                        style={{ background: '#fdf2f2', border: '1px solid rgba(180,30,30,0.18)', color: '#7a1e1e' }}
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-sans text-sm">{error}</p>
                    </div>
                )}

                {/* Order */}
                {hasSearched && order && (
                    <div className="space-y-5">
                        {/* Status Card */}
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{ background: '#ffffff', border: `1px solid ${LINE}`, boxShadow: '0 8px 30px -12px rgba(10,10,10,0.10)' }}
                        >
                            <div
                                className="p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                style={{ background: INK }}
                            >
                                <div>
                                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: GOLD }}>
                                        Order Status
                                    </p>
                                    <h2 className="font-heading font-semibold text-2xl capitalize flex items-center gap-2.5 text-white">
                                        {order.order_status === 'new' && <Clock className="w-5 h-5" style={{ color: GOLD }} />}
                                        {order.order_status === 'confirmed' && <CheckCircle className="w-5 h-5" style={{ color: GOLD }} />}
                                        {order.order_status === 'processing' && <Package className="w-5 h-5" style={{ color: GOLD }} />}
                                        {order.order_status === 'shipped' && <Truck className="w-5 h-5" style={{ color: GOLD }} />}
                                        {order.order_status === 'delivered' && <CheckCircle className="w-5 h-5" style={{ color: '#9bd99b' }} />}
                                        {order.order_status === 'cancelled' && <AlertCircle className="w-5 h-5" style={{ color: '#e57373' }} />}
                                        {order.order_status}
                                    </h2>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                        Order Number
                                    </p>
                                    <p className="font-mono text-base mt-1" style={{ color: '#fff' }}>
                                        {order.order_number || order.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 md:p-8">
                                {/* Progress */}
                                {order.order_status !== 'cancelled' ? (
                                    <div className="mb-8">
                                        <div className="relative">
                                            <div className="absolute top-4 left-0 w-full h-[2px] -translate-y-1/2 rounded-full" style={{ background: LINE }} />
                                            <div
                                                className="absolute top-4 left-0 h-[2px] -translate-y-1/2 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(0, currentStep * 25))}%`, background: GOLD }}
                                            />
                                            <div className="relative flex justify-between">
                                                {['Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map((step, index) => {
                                                    const isCompleted = index <= currentStep;
                                                    const isCurrent = index === currentStep;
                                                    return (
                                                        <div key={step} className="flex flex-col items-center gap-2">
                                                            <div
                                                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                                                                style={{
                                                                    background: isCompleted ? GOLD : '#ffffff',
                                                                    border: `2px solid ${isCompleted ? GOLD : LINE}`,
                                                                    boxShadow: isCurrent ? `0 0 0 4px rgba(184,148,31,0.18)` : 'none',
                                                                    transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                                                                }}
                                                            >
                                                                {index < currentStep ? (
                                                                    <CheckCircle className="w-4 h-4" style={{ color: '#fff' }} />
                                                                ) : (
                                                                    <div
                                                                        className="w-2 h-2 rounded-full"
                                                                        style={{ background: isCompleted ? '#fff' : '#d0d0d0' }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <span
                                                                className="text-[10px] md:text-xs font-sans font-medium uppercase tracking-wide text-center"
                                                                style={{ color: isCompleted ? INK : MUTED }}
                                                            >
                                                                {step}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="rounded-xl p-4 mb-6 flex items-center gap-3"
                                        style={{ background: '#fdf2f2', border: '1px solid rgba(180,30,30,0.18)' }}
                                    >
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#a83232' }} />
                                        <div>
                                            <p className="font-heading font-semibold text-sm" style={{ color: '#7a1e1e' }}>Order Cancelled</p>
                                            <p className="font-sans text-xs mt-0.5" style={{ color: '#7a1e1e' }}>
                                                Please contact support if you think this is a mistake.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Tracking */}
                                    <div className="rounded-xl p-5" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
                                        <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: INK }}>
                                            <Truck className="w-4 h-4" style={{ color: GOLD }} />
                                            Tracking Information
                                        </h3>

                                        {order.tracking_number ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: MUTED }}>
                                                        Tracking · {providerLabel(order.shipping_provider)}
                                                    </p>
                                                    <p className="font-mono text-base font-semibold tracking-wide" style={{ color: INK }}>
                                                        {order.tracking_number}
                                                    </p>
                                                </div>

                                                <a
                                                    href={trackHref(order.shipping_provider, order.tracking_number)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full py-3 text-center rounded-full font-sans font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
                                                    style={{ background: INK, color: '#fff' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = GOLD; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
                                                >
                                                    Track on {providerLabel(order.shipping_provider)}
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <Truck className="w-8 h-8 mx-auto mb-2" style={{ color: '#d0d0d0' }} />
                                                <p className="font-sans text-sm" style={{ color: MUTED }}>No tracking number yet.</p>
                                                <p className="font-sans text-xs mt-1" style={{ color: '#9a9a9a' }}>
                                                    Check back when your order is shipped.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right column */}
                                    <div className="space-y-4">
                                        {order.shipping_note && (
                                            <div
                                                className="rounded-xl p-5"
                                                style={{ background: INK }}
                                            >
                                                <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2 text-white">
                                                    <Package className="w-4 h-4" style={{ color: GOLD }} />
                                                    Shipping Update
                                                </h3>
                                                <p className="font-sans text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                                                    {order.shipping_note}
                                                </p>
                                            </div>
                                        )}

                                        <div className="rounded-xl p-5" style={{ background: '#ffffff', border: `1px solid ${LINE}` }}>
                                            <h3 className="font-heading font-semibold text-[10px] uppercase tracking-[0.14em] mb-3 pb-2" style={{ color: GOLD, borderBottom: `1px solid ${LINE}` }}>
                                                Order Summary
                                            </h3>
                                            <div className="space-y-2 mb-3">
                                                {order.order_items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between font-sans text-sm" style={{ color: '#2a2a2a' }}>
                                                        <span>{item.quantity}× {item.product_name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-1.5 pt-2 mb-1 border-t" style={{ borderColor: LINE }}>
                                                <div className="flex justify-between font-sans text-xs pt-2" style={{ color: MUTED }}>
                                                    <span>Subtotal</span>
                                                    <span style={{ color: INK }}>₱{order.total_price.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between font-sans text-xs" style={{ color: MUTED }}>
                                                    <span>Shipping Fee</span>
                                                    <span style={{ color: INK }}>₱{(order.shipping_fee || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between font-sans text-xs" style={{ color: MUTED }}>
                                                    <span>Admin Fee</span>
                                                    <span style={{ color: INK }}>₱{ADMIN_FEE.toLocaleString()}</span>
                                                </div>
                                                {order.discount_applied && order.discount_applied > 0 && (
                                                    <div className="flex justify-between font-sans text-xs" style={{ color: GOLD }}>
                                                        <span>Discount ({order.promo_code || 'Promo'})</span>
                                                        <span>−₱{order.discount_applied.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center pt-3 mt-1 font-heading font-semibold text-base" style={{ color: INK, borderTop: `1px solid ${LINE}` }}>
                                                <span>Total</span>
                                                <span>₱{(order.total_price + (order.shipping_fee || 0) + ADMIN_FEE).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrderTracking;
