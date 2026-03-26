
"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Sparkles, BookOpen, ArrowRight, Shield, Zap, Key, Check, Bot, Globe, RefreshCw, Cpu, Database, Star, PenTool, Layout, Layers, FileText, Headphones, Image as ImageIcon, Search, AlertTriangle, Clock, Frown, BrainCircuit, Activity, CheckCircle2, Crown, Palette, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import { motion } from 'motion/react';

interface LandingPageProps {
    onEnterApp: (topic?: string) => void;
    onGoToAuth: (isLogin?: boolean) => void;
    onGoToFeatures: () => void;
    isLoggedIn?: boolean;
}

// --- ANIMATION HOOKS & COMPONENTS ---
const useOnScreen = (options: IntersectionObserverInit) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, options);

        if (ref.current) observer.observe(ref.current);
        return () => { if (ref.current) observer.unobserve(ref.current); };
    }, [ref, options]);

    return [ref, isVisible] as const;
};

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
    const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
    return (
        <div ref={ref} className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
};

const SlideInLeft: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
    const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
    return (
        <div ref={ref} className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
};

const SlideInRight: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
    const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
    return (
        <div ref={ref} className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
};

const ScaleIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
    const [ref, isVisible] = useOnScreen({ threshold: 0.2 });
    return (
        <div ref={ref} className={`transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
};

// --- COMMAND CENTER VISUAL (Option A) ---
const CommandCenterVisual = () => (
  <div className="perspective-container w-[320px] h-[400px] md:w-[380px] md:h-[480px] relative group cursor-pointer mx-auto">
    <style>{`
      .perspective-container { perspective: 1200px; }
      .command-deck {
        width: 100%; height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transform: rotateY(-15deg) rotateX(10deg);
        transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
      }
      .command-deck:hover {
        transform: rotateY(-5deg) rotateX(5deg) translateZ(20px);
        box-shadow: 0 40px 70px -12px rgba(0, 0, 0, 0.6);
      }
      .glass-panel {
        position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.03);
        display: flex; flex-direction: column;
        overflow: hidden;
      }
      .floating-badge {
        position: absolute;
        transform: translateZ(40px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.3);
        background: white;
        border: 1px solid rgba(255,255,255,0.8);
        transition: transform 0.3s ease;
      }
      .command-deck:hover .floating-badge {
        transform: translateZ(60px) translateY(-5px);
      }
    `}</style>
    
    <div className="command-deck">
        <div className="glass-panel p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    <Activity size={10} className="animate-pulse"/> SYSTEM ACTIVE
                </div>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-teal-500/20 rounded-lg text-teal-400"><BrainCircuit size={14}/></div>
                        <span className="text-[10px] font-bold text-slate-300">Strategist</span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 w-[100%] shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
                    </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400"><Globe size={14}/></div>
                        <span className="text-[10px] font-bold text-slate-300">Scholar</span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[85%] animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400"><PenTool size={14}/></div>
                        <span className="text-[10px] font-bold text-slate-300">Scribe</span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-[60%] shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                    </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400"><Check size={14}/></div>
                        <span className="text-[10px] font-bold text-slate-300">Editor</span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 w-[10%] shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                    </div>
                </div>
            </div>

            {/* Live Terminal */}
            <div className="flex-grow bg-black/40 rounded-xl p-4 font-mono text-[10px] text-slate-400 overflow-hidden relative border border-white/5 shadow-inner">
                <div className="absolute inset-0 p-4 space-y-2 opacity-80">
                    <div className="text-emerald-500 flex gap-2"><span className="opacity-50">00:01</span> <span>&gt; Initialize Project "The Future of AI"</span></div>
                    <div className="text-blue-400 flex gap-2"><span className="opacity-50">00:04</span> <span>&gt; Searching web for "LLM history"...</span></div>
                    <div className="text-slate-300 flex gap-2"><span className="opacity-50">00:12</span> <span>&gt; Found 14 verified sources</span></div>
                    <div className="text-purple-400 flex gap-2"><span className="opacity-50">00:15</span> <span>&gt; Drafting Chapter 1 Outline...</span></div>
                    <div className="text-slate-200 flex gap-2"><span className="opacity-50">00:42</span> <span>&gt; Writing Section 1.2 (120 words)...</span></div>
                    <div className="text-slate-200 animate-pulse flex gap-2"><span className="opacity-50">00:45</span> <span>&gt; _</span></div>
                </div>
            </div>
        </div>

        {/* Floating Widgets */}
        <div className="floating-badge top-16 -right-8 p-3 rounded-2xl flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100"><Zap size={20}/></div>
             <div>
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Throughput</div>
                 <div className="text-sm font-black text-slate-900">2.4k words/min</div>
             </div>
        </div>

        <div className="floating-badge bottom-24 -left-8 p-3 rounded-2xl flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100"><CheckCircle2 size={20}/></div>
             <div>
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fact Check</div>
                 <div className="text-sm font-black text-slate-900">100% Verified</div>
             </div>
        </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onGoToAuth, onGoToFeatures, isLoggedIn }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="bg-white text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900 overflow-x-hidden">
            
            {/* STICKY HEADER */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 safe-area-top">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    <Logo className="scale-75 sm:scale-90" />
                    <nav className="hidden md:flex items-center gap-8">
                        <Button 
                            variant="ghost"
                            size="sm"
                            onClick={onGoToFeatures}
                        >
                            Features
                        </Button>
                        <Link href="/pricing" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                            Pricing
                        </Link>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => onGoToAuth(true)}
                        >
                            Log In
                        </Button>
                        <Button 
                            variant="primary"
                            size="md"
                            onClick={() => onGoToAuth(false)}
                        >
                            Get Started
                        </Button>
                    </nav>
                    {/* Mobile Menu Toggle */}
                    <button 
                        className="md:hidden p-3 text-slate-500 hover:text-slate-900 transition-colors touch-target"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Layout size={24} />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-lg">
                        <button onClick={() => { onGoToFeatures(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                            Features
                        </button>
                        <Link href="/pricing" className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors block" onClick={() => setMobileMenuOpen(false)}>
                            Pricing
                        </Link>
                        <button onClick={() => { onGoToAuth(true); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                            Log In
                        </button>
                        <button onClick={() => { onGoToAuth(false); setMobileMenuOpen(false); }} className="w-full px-4 py-3 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors text-center">
                            Get Started
                        </button>
                    </div>
                )}
            </header>

            {/* 1. HERO SECTION: WHAT IS MANUSCALE */}
            <section className="relative pt-32 sm:pt-48 pb-16 sm:pb-32 px-4 sm:px-6 overflow-hidden flex flex-col items-center text-center">
                {/* Subtle Background Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10">
                    <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-gradient-to-b from-indigo-50/50 to-transparent rounded-full blur-[120px]"></div>
                </div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <FadeIn>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">
                            <Sparkles size={12} className="text-primary-600"/>
                            <span>The Autonomous Publishing Studio</span>
                        </div>
                        
                        <h1 className="font-heading text-3xl sm:text-4xl md:text-[64px] text-slate-900 leading-[1.1] sm:leading-[1.05] tracking-tight mb-6 sm:mb-8">
                            Your expertise,<br/>
                            now in <span className="italic text-primary-600 font-heading">professional digital editions.</span>
                        </h1>
                        
                        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-12 px-2">
                            Manuscale is an autonomous publishing studio that turns your knowledge into professional books. We don't just help you write; we handle the research, structure, and drafting for you.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={() => onGoToAuth(false)}
                                className="w-full sm:w-auto px-10 py-5 bg-primary-600 text-white rounded-full text-lg font-bold hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3 group"
                            >
                                Get Started
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* 2. THE PROBLEM: WHY WRITING IS HARD */}
            <section className="py-16 sm:py-32 px-4 sm:px-8 border-y border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-2xl sm:text-3xl md:text-[48px] font-heading font-medium text-slate-900 mb-6 sm:mb-8 tracking-tight">The friction of traditional publishing.</h2>
                            <div className="space-y-8 sm:space-y-12">
                                {[
                                    { icon: AlertTriangle, title: "The Blank Page Paralysis", desc: "Starting is the hardest part. Without a clear structure, most authors get lost in the first chapter." },
                                    { icon: Search, title: "Research Fatigue", desc: "Verifying facts, finding citations, and gathering data takes 10x longer than the actual writing." },
                                    { icon: Clock, title: "The Time Barrier", desc: "Writing a quality book usually requires 6-12 months of dedicated focus. Most experts simply don't have that time." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-6">
                                        <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center shrink-0">
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-[20px] mb-2">{item.title}</h4>
                                            <p className="text-[16px] text-slate-500 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative"
                        >
                            <div className="aspect-square bg-slate-50 rounded-[40px] flex items-center justify-center p-12">
                                <div className="w-full h-full border border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                                    <FileText size={80} className="mb-6 opacity-20" />
                                    <p className="font-mono text-xs uppercase tracking-widest opacity-40">Unfinished Draft #42</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 3. THE SOLUTION: HOW MANUSCALE SOLVES IT */}
            <section className="py-16 sm:py-32 bg-slate-50 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-2xl sm:text-3xl md:text-[48px] font-heading font-medium text-slate-900 mb-6 tracking-tight">The autonomous publishing studio.</h2>
                        <p className="text-base md:text-[18px] text-slate-500 leading-relaxed">
                            Manuscale replaces the manual struggle with an autonomous editorial team. We don't just give you a tool; we give you a finished product.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: BrainCircuit, title: "Strategic Architecting", desc: "Our agents analyze your topic and build a logical, high-value chapter blueprint." },
                            { icon: Search, title: "Autonomous Research", desc: "The studio scours the live web for verified facts, case studies, and citations." },
                            { icon: PenTool, title: "High-Fidelity Drafting", desc: "We generate professional-grade prose in your unique tone, ready for the world." }
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -10 }}
                                className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center"
                            >
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mb-8">
                                    <item.icon size={28} />
                                </div>
                                <h3 className="text-[20px] font-bold text-slate-900 mb-4">{item.title}</h3>
                                <p className="text-[16px] text-slate-500 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="mt-16 text-center"
                    >
                        <button 
                            onClick={() => isLoggedIn ? onEnterApp() : onGoToAuth(false)}
                            className="gap-2 px-8 py-4 text-lg font-bold bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center"
                        >
                            Start Building Your Book <ArrowRight size={20} />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* 4. FINAL CTA */}
            <section className="py-16 sm:py-32 bg-slate-900 text-white px-4 sm:px-6 relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '48px 48px' }}></div>
                <div className="max-w-3xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-xl sm:text-2xl md:text-[48px] font-heading font-bold mb-6 tracking-tight">Ready to become an author?</h2>
                        <p className="text-base md:text-[18px] text-slate-400 mb-12 leading-relaxed">
                            Join thousands of experts using Manuscale to turn their knowledge into professional books.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button 
                                onClick={() => isLoggedIn ? onEnterApp() : onGoToAuth(false)}
                                className="gap-2 px-8 py-4 md:px-10 md:py-5 text-base md:text-lg font-bold bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center"
                            >
                                Get Started Free <ArrowRight size={20} />
                            </button>
                            <button 
                                onClick={onGoToFeatures}
                                className="gap-2 px-8 py-4 md:px-10 md:py-5 text-base md:text-lg font-semibold border-2 border-white text-white rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                            >
                                Learn More
                            </button>
                        </div>

                        <p className="text-xs md:text-sm text-slate-500 mt-8">
                            No credit card required. Full-featured trial for 14 days.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* FOOTER - Removed buttons */}
            <footer className="py-12 sm:py-20 bg-white px-4 sm:px-6 border-t border-slate-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-12">
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <Logo className="scale-90" />
                        <p className="text-[14px] text-slate-400">The Private Autonomous Publishing Studio.</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                        </div>
                        <div className="text-[12px] text-slate-400">
                            &copy; {new Date().getFullYear()} Manuscale. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
