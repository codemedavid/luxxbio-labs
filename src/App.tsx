import { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useCart } from './hooks/useCart';
import Header from './components/Header';
import SubNav from './components/SubNav';
import Menu from './components/Menu';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import FloatingCartButton from './components/FloatingCartButton';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load route components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const COA = lazy(() => import('./components/COA'));
const FAQ = lazy(() => import('./components/FAQ'));
const PeptideCalculator = lazy(() => import('./components/PeptideCalculator'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));
const ProtocolGuide = lazy(() => import('./components/ProtocolGuide'));

import { useMenu } from './hooks/useMenu';
// import { useCOAPageSetting } from './hooks/useCOAPageSetting';

function MainApp() {
    const cart = useCart();
    const { menuItems, refreshProducts } = useMenu();
    const [currentView, setCurrentView] = useState<'menu' | 'cart' | 'checkout'>('menu');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const handleViewChange = (view: 'menu' | 'cart' | 'checkout') => {
        setCurrentView(view);
        // Scroll to top when changing views
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCategoryClick = (categoryId: string) => {
        setSelectedCategory(categoryId);
    };

    // Only show available products on the storefront; filter by category on top of that
    const availableItems = menuItems.filter(item => item.available);
    const filteredProducts = selectedCategory === 'all'
        ? availableItems
        : availableItems.filter(item => item.category === selectedCategory);

    return (
        <div className="min-h-screen bg-charcoal-900 font-inter flex flex-col">
            <Header
                cartItemsCount={cart.getTotalItems()}
                onCartClick={() => handleViewChange('cart')}
                onMenuClick={() => handleViewChange('menu')}
            />

            {currentView === 'menu' && (
                <SubNav selectedCategory={selectedCategory} onCategoryClick={handleCategoryClick} />
            )}

            <main className="flex-grow">
                {currentView === 'menu' && (
                    <Menu
                        menuItems={filteredProducts}
                        addToCart={cart.addToCart}
                        cartItems={cart.cartItems}
                        updateQuantity={cart.updateQuantity}
                    />
                )}

                {currentView === 'cart' && (
                    <Cart
                        cartItems={cart.cartItems}
                        updateQuantity={cart.updateQuantity}
                        removeFromCart={cart.removeFromCart}
                        clearCart={cart.clearCart}
                        getTotalPrice={cart.getTotalPrice}
                        onContinueShopping={() => handleViewChange('menu')}
                        onCheckout={() => handleViewChange('checkout')}
                    />
                )}

                {currentView === 'checkout' && (
                    <Checkout
                        cartItems={cart.cartItems}
                        totalPrice={cart.getTotalPrice()}
                        onBack={() => handleViewChange('cart')}
                        clearCart={cart.clearCart}
                    />
                )}
            </main>

            {currentView === 'menu' && (
                <>
                    <FloatingCartButton
                        itemCount={cart.getTotalItems()}
                        onCartClick={() => handleViewChange('cart')}
                    />
                    <Footer />
                </>
            )}
        </div>
    );
}


function App() {
    //   const { coaPageEnabled } = useCOAPageSetting();

    return (
        <Router>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<MainApp />} />
                    <Route path="/coa" element={<COA />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/calculator" element={<PeptideCalculator />} />
                    <Route path="/track-order" element={<OrderTracking />} />
                    <Route path="/protocols" element={<ProtocolGuide />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;
