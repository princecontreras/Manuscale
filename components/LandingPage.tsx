"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
    ChevronDown, ChevronUp, Sparkles, ArrowRight, Clock, AlertTriangle, Frown, BrainCircuit, Activity, X, Menu, CheckCircle2
} from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import { useDemo } from './DemoContext';
import { useToast } from './ToastContext';
import { BookCarousel } from './BookCarousel';
import { sampleBooks } from '@/data/sampleBooks';

interface LandingPageProps {
    onEnterApp: (topic?: string) => void;
    onGoToAuth: (isLogin?: boolean) => void;
    onGoToFeatures: () => void;
    onTryDemo: () => void;
    isLoggedIn?: boolean;
}

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200">
            <button
                className="w-full py-6 flex justify-between items-center text-left focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-heading text-lg font-semibold text-slate-900">{question}</span>
                {isOpen ? <ChevronUp className="text-primary-600" /> : <ChevronDown className="text-slate-400" />}
            </button>
            {isOpen && (
                <div className="pb-6 text-slate-600 leading-relaxed animate-in fade-in">
                    {answer}
                </div>
            )}
        </div>
    );
};

export const LandingPage: React.FC<LandingPageProps> = ({
    onEnterApp,
    onGoToAuth,
    onGoToFeatures,
    onTryDemo,
    isLoggedIn
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { hasUsedDemoBefore, isDemoMode } = useDemo();
    const { showToast } = useToast();

    const handleTryDemo = () => {
        if (hasUsedDemoBefore && !isDemoMode) {
            showToast('You\'ve already used your free demo. Sign up to continue!', 'info');
            return;
        }
        onTryDemo();
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900">
            
            {/* Minimalist Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    <Logo className="scale-75 sm:scale-90" />
                    
                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={onGoToFeatures} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                            Features
                        </button>
                        <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                            About
                        </Link>
                        <Link href="/pricing" className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors">
                            Pricing
                        </Link>
                        <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                            Contact Us
                        </Link>
                        <div className="h-4 w-px bg-slate-300"></div>
                        {isLoggedIn ? (
                            <Button variant="primary" size="sm" onClick={() => onEnterApp()} className="shadow-sm">
                                Go to Dashboard
                            </Button>
                        ) : (
                            <div className="flex gap-3">
                                <Button variant="ghost" size="sm" onClick={handleTryDemo}>Try Demo</Button>
                                <Button variant="ghost" size="sm" onClick={() => onGoToAuth(true)}>Log in</Button>
                                <Button variant="primary" size="sm" onClick={() => onGoToAuth(false)} className="shadow-sm">Sign up</Button>
                            </div>
                        )}
                    </nav>

                    <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(true)}>
                        <Menu size={24} className="text-slate-700" />
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-20 px-6 animate-in slide-in-from-top-2">
                    <button className="absolute top-6 right-6 p-2" onClick={() => setMobileMenuOpen(false)}>
                        <X size={24} className="text-slate-700" />
                    </button>
                    <nav className="flex flex-col gap-6 text-lg">
                        <button onClick={() => { setMobileMenuOpen(false); onGoToFeatures(); }} className="text-left font-semibold text-slate-800">
                            Features
                        </button>
                        <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-left font-semibold text-slate-800">
                            About
                        </Link>
                        <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-left font-semibold text-slate-800">
                            Pricing
                        </Link>
                        <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-left font-semibold text-slate-800">
                            Contact Us
                        </Link>
                        <hr className="border-slate-200" />
                        {isLoggedIn ? (
                            <Button variant="primary" onClick={() => { setMobileMenuOpen(false); onEnterApp(); }}>Go to Dashboard</Button>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <Button variant="ghost" onClick={() => { setMobileMenuOpen(false); onGoToAuth(true); }}>Log in</Button>
                                <Button variant="primary" onClick={() => { setMobileMenuOpen(false); onGoToAuth(false); }}>Sign up</Button>
                                <Button variant="ghost" onClick={() => { setMobileMenuOpen(false); handleTryDemo(); }} className="border border-slate-300">Try Free Demo</Button>
                            </div>
                        )}
                    </nav>
                </div>
            )}

            <main className="pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
                
                {/* 1. HERO SECTION */}
                <section className="px-4 sm:px-6 mb-16 sm:mb-32 max-w-5xl mx-auto text-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                
                        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-[1.05] tracking-tight mb-8">
                            Write entire books <br className="hidden sm:block"/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
                                in minutes, not months.
                            </span>
                        </h1>
                        <p className="text-base sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-12">
                            Typoscale pairs your unique ideas with an autonomous AI writing engine. Outline, draft, format, and publish high-quality non-fiction and narrative works instantly.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 group">
                            {isLoggedIn ? (
                                <Button 
                                    size="lg" 
                                    variant="primary" 
                                    onClick={() => onEnterApp()} 
                                    className="w-full sm:w-auto text-lg px-8 py-4 h-auto rounded-full shadow-lg shadow-primary-600/20"
                                >
                                    Open Dashboard <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            ) : (
                                <>
                                    <Button 
                                        size="lg" 
                                        variant="primary" 
                                        onClick={() => onGoToAuth(false)} 
                                        className="w-full sm:w-auto text-lg px-8 py-4 h-auto rounded-full shadow-lg shadow-primary-600/20"
                                    >
                                        Start Writing Now <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                    <Button 
                                        size="lg" 
                                        variant="ghost" 
                                        onClick={handleTryDemo} 
                                        className="w-full sm:w-auto text-lg px-8 py-4 h-auto rounded-full border border-slate-300 hover:border-primary-300 hover:bg-primary-50"
                                    >
                                        Try Free Demo
                                    </Button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </section>

                {/* 2. THE PROBLEM SECTION */}
                <section className="bg-white py-16 sm:py-24 md:py-32 border-y border-slate-100">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-10 sm:mb-16"
                        >
                            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                                Writing a book shouldn't break you.
                            </h2>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                                The traditional publishing process is an uphill battle that leaves most aspiring authors exhausted and unpublished.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="bg-slate-50 rounded-2xl p-8 border border-slate-200"
                            >
                                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-6">
                                    <Clock size={24} />
                                </div>
                                <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Months of Outlining</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Structuring a coherent 50,000-word manuscript requires intense focus. Most people give up before finishing the table of contents.
                                </p>
                            </motion.div>
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-slate-50 rounded-2xl p-8 border border-slate-200"
                            >
                                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Writer's Block</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Staring at a blank page. Losing momentum halfway through chapter 3. The cognitive load of connecting complex themes manually.
                                </p>
                            </motion.div>
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="bg-slate-50 rounded-2xl p-8 border border-slate-200"
                            >
                                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center mb-6">
                                    <Frown size={24} />
                                </div>
                                <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Formatting Nightmares</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Once written, formatting for Kindle, PDF, and print is a frustrating technical hurdle that delays publishing by weeks.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* 3. THE SOLUTION SECTION */}
                <section className="py-16 sm:py-24 md:py-32">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-12 sm:mb-20"
                        >
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-xs font-semibold text-green-700 mb-6 uppercase tracking-wide">
                                The Solution
                            </div>
                            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                                Typoscale does the heavy lifting.
                            </h2>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                                Two powerful writing flows designed to match your style—whether you want complete control or complete automation.
                            </p>
                        </motion.div>

                        <div className="space-y-12 sm:space-y-24">
                            {/* Workflow 1 */}
                            <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
                                <motion.div 
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, amount: 0.2 }}
                                    transition={{ duration: 0.4 }}
                                    className="order-2 md:order-1"
                                >
                                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                            <BrainCircuit size={160} />
                                        </div>
                                        <h4 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">1</span>
                                            Manuscript Workshop
                                        </h4>
                                        <ul className="space-y-4 mb-6">
                                            <li className="flex gap-3 text-slate-600">
                                                <CheckCircle2 className="text-primary-500 shrink-0" size={20} />
                                                <span>AI generates a complete book blueprint and table of contents based on your topic.</span>
                                            </li>
                                            <li className="flex gap-3 text-slate-600">
                                                <CheckCircle2 className="text-primary-500 shrink-0" size={20} />
                                                <span>You approve and tweak the outline.</span>
                                            </li>
                                            <li className="flex gap-3 text-slate-600">
                                                <CheckCircle2 className="text-primary-500 shrink-0" size={20} />
                                                <span>AI writes chapter by chapter while you guide the tone, add research, and refine.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </motion.div>
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                    className="order-1 md:order-2"
                                >
                                    <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Co-author your book <br/>with an AI partner.</h3>
                                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                                        The Manuscript Workshop is perfect for authors who want hands-on control. It acts as an extremely intelligent ghostwriter. You provide the ideas, the AI builds the structure, and together you write the manuscript chapter by chapter.
                                    </p>
                                    <Button variant="ghost" onClick={onGoToFeatures} className="text-primary-600 font-semibold px-0 hover:bg-transparent">
                                        Learn about Workflows <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </motion.div>
                            </div>

                            {/* Workflow 2 */}
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Let the engine <br/>write it autonomously.</h3>
                                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                                        The Autonomous Publishing Engine is a multi-agent system. Just input a concept. A "Strategist" agent builds the outline, a "Scribe" agent writes the text, and an "Editor" reviews it—all running automatically in a terminal-like environment.
                                    </p>
                                    <Button variant="ghost" onClick={onGoToFeatures} className="text-primary-600 font-semibold px-0 hover:bg-transparent">
                                        Learn about Workflows <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </motion.div>
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                            <Activity size={160} className="text-blue-400" />
                                        </div>
                                        <h4 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center border border-blue-800">2</span>
                                            Autonomous Engine
                                        </h4>
                                        <ul className="space-y-4 mb-6">
                                            <li className="flex gap-3 text-slate-300">
                                                <CheckCircle2 className="text-blue-500 shrink-0" size={20} />
                                                <span>You type: "Write a 5 chapter book about Stoicism."</span>
                                            </li>
                                            <li className="flex gap-3 text-slate-300">
                                                <CheckCircle2 className="text-blue-500 shrink-0" size={20} />
                                                <span>The AI Swarm takes over: researching, planning, drafting, and editing in real-time.</span>
                                            </li>
                                            <li className="flex gap-3 text-slate-300">
                                                <CheckCircle2 className="text-blue-500 shrink-0" size={20} />
                                                <span>You watch the code complete and download your fully formatted EPUB file.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. CAROUSEL SECTION - See What's Possible */}
                <section className="py-16 sm:py-24 md:py-32 bg-gradient-to-b from-slate-50 to-white">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-12 sm:mb-16"
                        >
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 mb-6 uppercase tracking-wide">
                                <Sparkles size={14} /> Success Stories
                            </div>
                            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                                See What's Possible
                            </h2>
                            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
                                Explore beautiful books created by Typoscale users. Each one started as an idea, and became a published work in minutes.
                            </p>
                        </motion.div>
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.6 }}
                        >
                            <BookCarousel books={sampleBooks} autoRotate={true} autoRotateInterval={6000} />
                        </motion.div>
                    </div>
                </section>

                {/* 5. FAQS SECTION */}
                <section className="py-16 sm:py-24 md:py-32 bg-white border-t border-slate-100">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        <div className="text-center mb-10 sm:mb-16">
                            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Frequently Asked Questions
                            </h2>
                            <p className="text-slate-600">Everything you need to know about Typoscale.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <FAQItem 
                                question="Who owns the copyright to the generated books?" 
                                answer="You do. You retain 100% of the rights and royalties for any book generated through Typoscale. You are free to publish it on Amazon KDP, Apple Books, your own webstore, or anywhere else."
                            />
                            <FAQItem 
                                question="Can I control the number of chapters?" 
                                answer="Yes. Whether you're using the Manuscript Workshop or the Autonomous Engine, you can simply tell the AI exactly how many chapters you want (e.g., '10 chapters about productivity'), and it will rigidly structure the book accordingly."
                            />
                            <FAQItem 
                                question="What formats can I export my book in?" 
                                answer="Typoscale instantly compiles your completed manuscript into professionally formatted EPUB, PDF, and DOCX files. The EPUB is ready to be uploaded directly to Amazon KDP."
                            />
                            <FAQItem 
                                question="Is my data and research private?" 
                                answer="Yes. Your projects, drafts, and research materials are stored securely. We do not use your personal manuscripts to train the global AI models."
                            />
                        </div>
                    </div>
                </section>

            </main>

            {/* 6. FOOTER */}
            <footer className="bg-slate-900 text-slate-300 py-10 sm:py-16 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <Logo className="scale-75 origin-left opacity-90 grayscale brightness-200" />
                            <span className="text-sm font-medium text-slate-500">© {new Date().getFullYear()} Typoscale. All rights reserved.</span>
                        </div>
                        <div className="flex gap-8 text-sm">
                            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
