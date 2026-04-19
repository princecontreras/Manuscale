"use client";
import React, { useState, memo, useMemo } from 'react';
import Image from 'next/image';
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

// Memoized Brand Story Section
const BrandStorySection = memo(() => (
    <section className="bg-white py-16 sm:py-24 border-y border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-bold tracking-wide mb-6 uppercase">
                    <Sparkles size={18} /> Our Story
                </div>
                <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-8 tracking-tight leading-[1.2]">
                    What is Typoscale?
                </h2>
                
                <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                    <p>
                        Typoscale is an AI-powered platform built to make book creation simple for content creators and digital product entrepreneurs—even if you don't have writing skills or resources.
                    </p>
                    
                    <p>
                        <strong>Who is it for?</strong> Anyone with knowledge to share: YouTubers, course creators, coaches, thought leaders, and digital entrepreneurs who want to turn their expertise into professional ebooks.
                    </p>
                    
                    <p>
                        <strong>What problem does it solve?</strong> Creating books is hard, expensive, and time-consuming. Typoscale removes the barriers—no writing skills needed, no ghostwriters required. Just your knowledge and ideas.
                    </p>
                </div>
            </motion.div>
        </div>
    </section>
));
BrandStorySection.displayName = 'BrandStorySection';

// Memoized Our Story Section
const OurStorySection = memo(() => (
    <section className="bg-white py-16 sm:py-24 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
            >
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="w-full aspect-square rounded-3xl overflow-hidden border-2 border-slate-200 shadow-xl">
                            <Image
                                src="/covers/IMG_8626.png"
                                alt="Prince Contreras - Founder of Typoscale"
                                width={600}
                                height={600}
                                className="w-full h-full object-cover"
                                priority
                            />
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
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-bold tracking-wide mb-4 uppercase">
                                <Heart size={18} /> Meet the Founder
                            </div>
                            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-2 tracking-tight leading-[1.2]">
                                Prince Contreras
                            </h2>
                        </div>
                        
                        <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
                            <p>
                                I'm the founder and creator of Typoscale. My vision is to help people create ebooks easily—whether for selling or personal use.
                            </p>

                            <p>
                                Before Typoscale, I founded several businesses including <strong>Bead Lighting</strong>, an online store for home lighting products, and <strong>Digitale Internationale</strong>, a digital product store on Gumroad. Through those experiences, I realized creators needed a simple way to turn their knowledge into published books without the complexity and cost of traditional publishing.
                            </p>

                            <p>
                                That's why I built Typoscale—to democratize book creation for everyone.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    </section>
));
OurStorySection.displayName = 'OurStorySection';

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
                        <BrandStorySection />
                        <OurStorySection />
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
