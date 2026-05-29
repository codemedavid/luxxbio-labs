import React, { useState } from 'react';
import { ArrowLeft, FlaskConical, Syringe, Thermometer, Clock, ChevronDown, ChevronUp, BookOpen, Search, X } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { useCart } from '../hooks/useCart';
import { useProtocols } from '../hooks/useProtocols';

const GOLD = '#B8941F';
const INK = '#0A0A0A';
const MUTED = '#6b6b6b';
const LINE = 'rgba(10,10,10,0.08)';
const SURFACE = '#fafaf7';

const ProtocolGuide: React.FC = () => {
    const { cartItems } = useCart();
    const { protocols, loading } = useProtocols();
    const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const toggleProtocol = (id: string) => {
        setExpandedProtocol(expandedProtocol === id ? null : id);
    };

    const handleBackToHome = () => {
        window.location.href = '/';
    };

    const activeProtocols = protocols.filter(p => p.active);
    const categories = ['all', ...Array.from(new Set(activeProtocols.map(p => p.category)))];
    const query = searchQuery.trim().toLowerCase();
    const filteredProtocols = activeProtocols
        .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
        .filter(p => {
            if (!query) return true;
            const haystack = [
                p.name,
                p.category,
                p.dosage,
                p.frequency,
                p.duration,
                p.storage,
                ...(p.notes || []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(query);
        });

    return (
        <div className="min-h-screen" style={{ background: '#ffffff' }}>
            <Header
                cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                onCartClick={() => { }}
                onMenuClick={handleBackToHome}
            />

            {/* Editorial top band */}
            <div
                className="relative overflow-hidden"
                style={{ background: INK }}
            >
                <div
                    className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)`, opacity: 0.18, filter: 'blur(40px)' }}
                />
                <div className="container mx-auto px-5 md:px-8 py-16 md:py-20 max-w-4xl relative z-10">
                    <button
                        onClick={handleBackToHome}
                        className="inline-flex items-center gap-2 text-xs font-sans font-medium uppercase tracking-[0.12em] mb-8 group"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Back to Shop
                    </button>

                    <div className="text-center">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                        >
                            <BookOpen className="w-3.5 h-3.5" style={{ color: GOLD }} />
                            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em]" style={{ color: '#F5E6C8' }}>
                                Protocol Guide
                            </span>
                        </div>
                        <h1
                            className="font-heading font-light text-white mb-4"
                            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', letterSpacing: '-0.02em' }}
                        >
                            Peptide <em className="italic" style={{ color: GOLD }}>protocols</em>
                        </h1>
                        <p
                            className="font-sans text-sm md:text-base max-w-2xl mx-auto leading-relaxed"
                            style={{ color: 'rgba(255,255,255,0.65)' }}
                        >
                            Reference dosage frameworks for research peptides. Always consult a qualified healthcare professional before any protocol.
                        </p>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-5 md:px-8 py-14 md:py-20 max-w-4xl">

                {/* General Guidelines */}
                <section
                    className="rounded-2xl p-6 md:p-8 mb-6"
                    style={{ background: SURFACE, border: `1px solid ${LINE}` }}
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: INK }}
                        >
                            <Syringe className="w-4 h-4" style={{ color: GOLD }} />
                        </div>
                        <h2 className="font-heading font-semibold text-lg md:text-xl" style={{ color: INK }}>
                            General Injection Guidelines
                        </h2>
                    </div>
                    <ul className="space-y-3 font-sans text-sm" style={{ color: '#2a2a2a' }}>
                        {[
                            ['Reconstitution', "Use bacteriostatic water. Add slowly along the vial wall, don't shake."],
                            ['Injection sites', 'Rotate between abdomen, thigh, and upper arm.'],
                            ['Needle size', '29–31 gauge insulin syringes for subcutaneous injections.'],
                            ['Timing', 'Most peptides are best taken on an empty stomach or before bed.'],
                        ].map(([k, v]) => (
                            <li key={k} className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: GOLD }} />
                                <span><strong style={{ color: INK }}>{k}:</strong> {v}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Storage Guidelines */}
                <section
                    className="rounded-2xl p-6 md:p-8 mb-12"
                    style={{ background: SURFACE, border: `1px solid ${LINE}` }}
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: INK }}
                        >
                            <Thermometer className="w-4 h-4" style={{ color: GOLD }} />
                        </div>
                        <h2 className="font-heading font-semibold text-lg md:text-xl" style={{ color: INK }}>
                            Storage Guidelines
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {[
                            ['Lyophilized (Powder)', 'Store at -20°C for long-term. Stable at 2–8°C for weeks.'],
                            ['Reconstituted', 'Refrigerate at 2–8°C. Use within 14–28 days depending on peptide.'],
                        ].map(([title, body]) => (
                            <div key={title} className="rounded-xl p-4" style={{ background: '#ffffff', border: `1px solid ${LINE}` }}>
                                <p className="font-heading font-semibold mb-1" style={{ color: INK }}>{title}</p>
                                <p className="font-sans" style={{ color: MUTED }}>{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section heading */}
                <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
                    <div>
                        <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                            Catalogue
                        </p>
                        <div
                            className="my-2"
                            style={{ width: 32, height: 1, background: GOLD }}
                        />
                        <h2 className="font-heading font-light text-2xl md:text-3xl" style={{ color: INK, letterSpacing: '-0.01em' }}>
                            Peptide protocols
                        </h2>
                    </div>

                    <div className="w-full sm:w-auto">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search
                                    className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: MUTED }}
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search protocols..."
                                    className="w-full pl-10 pr-9 py-3 rounded-full font-sans text-sm focus:outline-none"
                                    style={{
                                        background: '#ffffff',
                                        border: `1px solid ${LINE}`,
                                        color: INK,
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                        style={{ color: MUTED }}
                                        aria-label="Clear search"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full sm:w-64 px-4 py-3 rounded-full font-sans text-sm font-medium cursor-pointer focus:outline-none"
                                style={{
                                    background: '#ffffff',
                                    border: `1px solid ${LINE}`,
                                    color: INK,
                                }}
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category === 'all' ? 'All categories' : category}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-[11px] font-sans mt-2 text-right" style={{ color: MUTED }}>
                            {filteredProtocols.length} protocol{filteredProtocols.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: LINE, borderTopColor: GOLD }} />
                    </div>
                ) : filteredProtocols.length === 0 ? (
                    <div
                        className="rounded-2xl p-12 text-center"
                        style={{ background: SURFACE, border: `1px solid ${LINE}` }}
                    >
                        <p className="font-sans text-sm" style={{ color: MUTED }}>No protocols found in this category.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredProtocols.map((protocol) => {
                            const isOpen = expandedProtocol === protocol.id;
                            return (
                                <div
                                    key={protocol.id}
                                    className="rounded-2xl overflow-hidden transition-all"
                                    style={{
                                        background: '#ffffff',
                                        border: `1px solid ${isOpen ? 'rgba(184,148,31,0.35)' : LINE}`,
                                        boxShadow: isOpen ? '0 8px 30px -12px rgba(10,10,10,0.12)' : 'none',
                                    }}
                                >
                                    <button
                                        onClick={() => toggleProtocol(protocol.id)}
                                        className="w-full p-5 md:p-6 flex items-center justify-between text-left transition-colors"
                                    >
                                        <div>
                                            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
                                                {protocol.category}
                                            </span>
                                            <h3 className="font-heading font-semibold text-base md:text-lg mt-1" style={{ color: INK }}>
                                                {protocol.name}
                                            </h3>
                                        </div>
                                        {isOpen ? (
                                            <ChevronUp className="w-5 h-5" style={{ color: INK }} />
                                        ) : (
                                            <ChevronDown className="w-5 h-5" style={{ color: MUTED }} />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="px-5 pb-5 md:px-6 md:pb-6" style={{ borderTop: `1px solid ${LINE}` }}>
                                            {protocol.image_url && (
                                                <div className="mt-5 rounded-xl overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
                                                    <img
                                                        src={protocol.image_url}
                                                        alt={protocol.name}
                                                        className="w-full h-auto object-contain bg-white"
                                                    />
                                                </div>
                                            )}

                                            {(protocol.dosage || protocol.frequency || protocol.duration) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 mb-5">
                                                    {[
                                                        ['Dosage', protocol.dosage, null],
                                                        ['Frequency', protocol.frequency, <Clock className="w-3 h-3" />],
                                                        ['Duration', protocol.duration, null],
                                                    ]
                                                        .filter(([, val]) => val && (val as string).trim() !== '')
                                                        .map(([label, val, icon]) => (
                                                            <div key={label as string} className="rounded-xl p-4" style={{ background: SURFACE }}>
                                                                <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] flex items-center gap-1" style={{ color: MUTED }}>
                                                                    {icon as React.ReactNode}
                                                                    {label as string}
                                                                </p>
                                                                <p className="font-heading text-sm font-semibold mt-1.5" style={{ color: INK }}>
                                                                    {val as string}
                                                                </p>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}

                                            {protocol.notes && protocol.notes.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: GOLD }}>
                                                        Protocol Notes
                                                    </p>
                                                    <ul className="space-y-2">
                                                        {protocol.notes.map((note, idx) => (
                                                            <li key={idx} className="flex items-start gap-3 font-sans text-sm" style={{ color: '#2a2a2a' }}>
                                                                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: GOLD }} />
                                                                {note}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {protocol.storage && (
                                                <div
                                                    className="rounded-xl p-4 flex items-start gap-3"
                                                    style={{ background: INK }}
                                                >
                                                    <Thermometer className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                                                    <p className="font-sans text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                                                        <strong style={{ color: '#fff' }}>Storage:</strong> {protocol.storage}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* CTA */}
                <div className="text-center mt-14">
                    <a
                        href="/calculator"
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-sans font-semibold text-sm tracking-wide transition-all"
                        style={{
                            background: INK,
                            color: '#fff',
                            boxShadow: '0 4px 14px rgba(10,10,10,0.18)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = GOLD; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
                    >
                        <FlaskConical className="w-4 h-4" />
                        Use Peptide Calculator
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ProtocolGuide;
