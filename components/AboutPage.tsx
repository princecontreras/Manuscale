"use client";
import React, { useState, memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Users, Target, Heart } from 'lucide-react';
import Link from 'next/link';
import { NavigationHeader } from './NavigationHeader';
import { FeaturesPage } from './FeaturesPage';
import { Logo } from './Logo';
import { Button } from './Button';
import { AuthPage } from './AuthPage';
import { useAuth } from './AuthProvider';
import { ToastProvider } from './ToastContext';

// CSS-in-JS for animations to avoid extra stylesheet imports
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-in-out forwards;
  }
`;

interface AboutPageProps {
    onEnterApp?: () => void;
    onBack?: () => void;
}

// Memoized Hero Section
const HeroSection = memo(() => (
    <section className="px-4 sm:px-6 max-w-5xl mx-auto text-center mb-20 sm:mb-32">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
                Empowering creators to <br/>
                <span className="text-primary-600 border-b-4 border-primary-200 pb-1">become published authors.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Typoscale exists for one purpose: to help content creators and digital product entrepreneurs turn their knowledge into published books—without needing to be a writer.
            </p>
        </motion.div>
    </section>
));
HeroSection.displayName = 'HeroSection';

// Memoized What is Typoscale Section with optimized animations
const WhatIsTyposcaleSection = memo(() => (
    <section className="bg-white py-16 sm:py-24 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-bold tracking-wide mb-6 uppercase">
                    <Sparkles size={18} /> What is Typoscale
                </div>
                <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-8 tracking-tight leading-[1.2]">
                    The Writing Platform Built for Creators
                </h2>
                
                <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                    <p>
                        Typoscale is an AI-powered writing platform designed specifically for content creators and digital product entrepreneurs who have valuable knowledge to share but lack traditional writing experience. You don't need to be a writer to create a book—you need Typoscale.
                    </p>
                    <p>
                        We built Typoscale because too many experts, course creators, and thought leaders have life-changing knowledge trapped in their heads, courses, or content, but never make it into a published book. Whether you have an email list, YouTube audience, or just a powerful idea, Typoscale helps you transform your expertise into a professional book—the ultimate credibility builder.
                    </p>
                    <p>
                        With tools like Manuscript Workshop, Image Studio, Research Studio, and our intelligent Agent Command Center, Typoscale is the only writing ecosystem creators need to go from knowledge to published book.
                    </p>
                </div>

                <div className="mt-12 grid sm:grid-cols-3 gap-8">
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 opacity-0 animate-fadeIn" style={{ animationDelay: '0ms' }}>
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">AI-Powered</h3>
                        <p className="text-slate-600">
                            Harness the power of advanced AI to generate, refine, and enhance your writing instantly.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 opacity-0 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                            <Target size={24} />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Flexible</h3>
                        <p className="text-slate-600">
                            Choose between hands-on control or full automation. Your workflow, your way.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 opacity-0 animate-fadeIn" style={{ animationDelay: '200ms' }}>
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                            <Users size={24} />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">For Everyone</h3>
                        <p className="text-slate-600">
                            From first-time authors to seasoned professionals, we've got you covered.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    </section>
));
WhatIsTyposcaleSection.displayName = 'WhatIsTyposcaleSection';

// Memoized Our Story Section
const OurStorySection = memo(() => (
    <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-bold tracking-wide mb-6 uppercase">
                    <Heart size={18} /> The Founder's Story
                </div>
                <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-12 tracking-tight leading-[1.2]">
                    Why I Built Typoscale
                </h2>
                
                <div className="space-y-8 text-lg text-slate-600 leading-relaxed">
                    <p>
                        My name is <strong>Prince Contreras</strong>, and I'm a content creator and entrepreneur. Throughout my career, I've watched hundreds of incredibly talented creators—course creators, YouTubers, coaches, and digital entrepreneurs—build massive audiences and generate life-changing income from their content. But most of them never wrote a book, even though they could have.
                    </p>

                    <p>
                        I noticed the pattern: these creators had the expertise, the audience, and the credibility. What they lacked was a simple way to turn their knowledge into a book without becoming a "writer." They didn't want to hire ghostwriters or spend months at a desk. They wanted a tool that understood them—creators, not authors.
                    </p>

                    <p>
                        That frustration led to Typoscale. I set out to build something simple: <strong>a platform that lets creators with zero writing experience publish professional books in weeks, not years.</strong> It needed to be AI-powered enough to handle the heavy lifting, but intelligent enough to respect their voice and vision.
                    </p>

                    <p>
                        Today, Typoscale helps content creators, digital product entrepreneurs, coaches, and educators transform their knowledge into published books. Each book published through Typoscale represents a creator's expertise made permanent—a new revenue stream, a credibility multiplier, and a legacy.
                    </p>

                    <p>
                        If you're a creator with knowledge to share, Typoscale is built for you. Let's turn your expertise into a book.
                    </p>
                </div>
            </motion.div>
        </div>
    </section>
));
OurStorySection.displayName = 'OurStorySection';

// Memoized Meet the Founder Section
const MeetTheFounderSection = memo(() => (
    <section className="bg-white py-16 sm:py-24 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-12 tracking-tight leading-[1.2]">
                    Meet the Founder
                </h2>
                
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="w-full aspect-square bg-gradient-to-br from-primary-100 to-primary-50 rounded-3xl border-2 border-primary-200 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-6xl mb-4">📸</div>
                                <p className="text-slate-500 font-medium">Prince Contreras Portrait</p>
                                <p className="text-slate-400 text-sm mt-2">Coming soon</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        <div>
                            <h3 className="font-heading text-3xl font-bold text-slate-900 mb-2">Prince Contreras</h3>
                            <p className="text-primary-600 font-semibold text-lg">Founder & Creator</p>
                        </div>

                        <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
                            <p>
                                Prince is a content creator and digital entrepreneur with a passion for helping others amplify their voice. After watching countless talented creators struggle to transition their knowledge into books, he decided to solve the problem once and for all.
                            </p>

                            <p>
                                Typoscale is the result of years of experience building content, understanding creator needs, and pioneering AI tools that actually work for real people. Prince's mission is simple: <strong>democratize book publishing for the creator economy.</strong>
                            </p>

                            <p>
                                When he's not building Typoscale, Prince is creating content, mentoring other entrepreneurs, and dreaming up the next way to empower creators.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    </section>
));
MeetTheFounderSection.displayName = 'MeetTheFounderSection';

// Memoized CTA Section
const CTASection = memo(() => (
    <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-[1.2]">
                    Ready to tell your story?
                </h2>
                <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                    Join thousands of writers who are using Typoscale to bring their ideas to life.
                </p>
                <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => window.location.href = '/?auth=signup'}
                    className="rounded-full shadow-lg shadow-primary-600/20 px-8 py-4"
                >
                    Start Writing <ArrowRight size={18} className="ml-2" />
                </Button>
            </motion.div>
        </div>
    </section>
));
CTASection.displayName = 'CTASection';

// Memoized Footer
const FooterSection = memo(() => (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 text-sm text-slate-600">
                <Logo className="scale-50 sm:scale-75" />
                <div className="flex gap-8">
                    <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                    <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
                </div>
            </div>
        </div>
    </footer>
));
FooterSection.displayName = 'FooterSection';

// Main optimized AboutPage component
const AboutPageContent = memo(({ 
    onEnterApp, 
    showAuth, 
    authIsLogin, 
    onAuthClose,
    onLogin,
    onSignup,
    onTryDemo,
    onShowFeatures
}: {
    onEnterApp?: () => void;
    showAuth: boolean;
    authIsLogin: boolean;
    onAuthClose: () => void;
    onLogin: () => void;
    onSignup: () => void;
    onTryDemo: () => void;
    onShowFeatures: () => void;
}) => {
    const { user: firebaseUser } = useAuth();
    
    return (
        <ToastProvider>
            {showAuth && !firebaseUser && (
                <AuthPage 
                    defaultIsLogin={authIsLogin}
                    onLogin={onAuthClose}
                    onBack={onAuthClose}
                />
            )}
            {(!showAuth || firebaseUser) && (
                <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900">
                    <NavigationHeader 
                        onEnterApp={onEnterApp} 
                        showFeatures={true}
                        onLogin={onLogin}
                        onSignup={onSignup}
                        onTryDemo={onTryDemo}
                        onShowFeatures={onShowFeatures}
                    />

                    <main className="pt-24 sm:pt-32">
                        <HeroSection />
                        <WhatIsTyposcaleSection />
                        <OurStorySection />
                        <MeetTheFounderSection />
                        <CTASection />
                    </main>

                    <FooterSection />
                </div>
            )}
        </ToastProvider>
    );
});
AboutPageContent.displayName = 'AboutPageContent';

export const AboutPage: React.FC<AboutPageProps> = ({ onEnterApp, onBack }) => {
    const [showAuth, setShowAuth] = useState(false);
    const [authIsLogin, setAuthIsLogin] = useState(true);
    const [showFeatures, setShowFeatures] = useState(false);

    const handleLogin = () => {
        setAuthIsLogin(true);
        setShowAuth(true);
    };

    const handleSignup = () => {
        setAuthIsLogin(false);
        setShowAuth(true);
    };

    const handleTryDemo = () => {
        window.location.href = '/?demo=true';
    };

    const handleAuthSuccess = () => {
        setShowAuth(false);
    };

    // Features view takes priority
    if (showFeatures) {
        return (
            <ToastProvider>
                <FeaturesPage 
                    onEnterApp={onEnterApp}
                    onBack={() => setShowFeatures(false)}
                    onLogin={handleLogin}
                    onSignup={handleSignup}
                    onTryDemo={handleTryDemo}
                    onGoToAbout={() => setShowFeatures(false)}
                    onGoToPricing={() => window.location.href = '/pricing'}
                    onGoToContact={() => window.location.href = '/contact'}
                />
            </ToastProvider>
        );
    }

    // Return optimized AboutPageContent component
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: styles }} />
            <AboutPageContent 
                onEnterApp={onEnterApp}
                showAuth={showAuth}
                authIsLogin={authIsLogin}
                onAuthClose={handleAuthSuccess}
                onLogin={handleLogin}
                onSignup={handleSignup}
                onTryDemo={handleTryDemo}
                onShowFeatures={() => setShowFeatures(true)}
            />
        </>
    );
};
AboutPage.displayName = 'AboutPage';
