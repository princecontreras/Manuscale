"use client";
import React, { useState } from 'react';
import { signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { ArrowRight, Chrome, Zap, Shield, BrainCircuit } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { useToast } from './ToastContext';

const getFirebaseErrorMessage = (error: any): string => {
    const errorCode = error?.code || error?.message || 'unknown';
    console.error('Firebase Error Details:', { code: error?.code, message: error?.message, errorCode });
    
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters.';
        case 'auth/operation-not-allowed':
            return 'Account creation is currently disabled.';
        case 'auth/popup-closed-by-user':
            return 'Sign-up popup was closed.';
        case 'auth/popup-blocked':
            return 'Sign-up popup was blocked by your browser.';
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with this email.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/invalid-api-key':
            return 'Firebase configuration error. Please contact support.';
        case 'auth/app-not-initialized':
            return 'Firebase not properly initialized. Please refresh the page.';
        default:
            // Show the actual error message if available
            if (error?.message && error.message !== errorCode) {
                return error.message;
            }
            return `Sign-up error: ${errorCode}. Please try again.`;
    }
};

interface SignupPageProps {
    onSignup: () => void;
    onGoToLogin: () => void;
    onBack: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onGoToLogin, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showToast } = useToast();

    const handleGoogleSignup = async () => {
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
            showToast("Account created! Redirecting to pricing...", "success");
            // Redirect to pricing page instead of dashboard
            window.location.href = '/pricing';
        } catch (error: any) {
            console.error("Google signup failed:", error);
            const errorMessage = getFirebaseErrorMessage(error);
            showToast(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            showToast("Password must be at least 6 characters.", "error");
            return;
        }
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            // Don't sign out - keep user logged in and redirect to pricing
            showToast("Account created! Redirecting to pricing...", "success");
            window.location.href = '/pricing';
        } catch (error: any) {
            console.error("Email signup failed:", error);
            const errorMessage = getFirebaseErrorMessage(error);
            showToast(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col md:flex-row">
                {/* Left Side: Form */}
                <div className="p-12 md:w-1/2 flex flex-col justify-center">
                    <div className="mb-8 cursor-pointer" onClick={onBack}>
                        <Logo />
                    </div>
                    <h1 className="text-2xl font-bold text-neutral-900 mb-2">Create your account</h1>
                    <p className="text-neutral-500 text-sm mb-8">Join the private autonomous publishing studio.</p>
                    
                    <div className="space-y-4">
                        <Button 
                            variant="neutral"
                            size="lg"
                            onClick={handleGoogleSignup}
                            disabled={loading}
                            className="w-full gap-3"
                        >
                            <Chrome size={18} />
                            {loading ? "Signing up..." : "Continue with Google"}
                        </Button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-neutral-200"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                                <span className="bg-white px-3 text-neutral-400 font-bold">Or</span>
                            </div>
                        </div>

                        <form className="space-y-4" onSubmit={handleEmailSignup}>
                            <input 
                                type="text" 
                                placeholder="Full Name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-primary-500 rounded-xl outline-none text-sm transition-all" 
                                required 
                            />
                            <input 
                                type="email" 
                                placeholder="Email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-primary-500 rounded-xl outline-none text-sm transition-all" 
                                required 
                            />
                            <input 
                                type="password" 
                                placeholder="Password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-primary-500 rounded-xl outline-none text-sm transition-all" 
                                required 
                            />
                            
                            <Button type="submit" variant="primary" size="lg" className="w-full gap-2" disabled={loading}>
                                {loading ? "Creating account..." : "Create Account"} <ArrowRight size={16} />
                            </Button>
                        </form>

                        <Button variant="ghost" size="sm" onClick={onGoToLogin} className="w-full mt-6">
                            Already have an account? Sign in
                        </Button>
                        <div className="text-center mt-4">
                            <button onClick={onBack} className="text-[10px] text-neutral-400 hover:text-neutral-600 uppercase tracking-widest font-bold">
                                Back to home
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Benefits */}
                <div className="bg-neutral-900 p-12 text-white flex flex-col justify-center md:w-1/2">
                    <h2 className="text-3xl font-bold mb-12">Why join Manuscale?</h2>
                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-primary-400 shrink-0"><Zap size={20}/></div>
                            <div>
                                <h4 className="font-bold mb-1">Autonomous Publishing</h4>
                                <p className="text-neutral-400 text-sm">Publish high-quality books at 2.4k words per minute.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-primary-400 shrink-0"><BrainCircuit size={20}/></div>
                            <div>
                                <h4 className="font-bold mb-1">AI-Powered Research</h4>
                                <p className="text-neutral-400 text-sm">Ground your narrative in real-world data with live web citations.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-primary-400 shrink-0"><Shield size={20}/></div>
                            <div>
                                <h4 className="font-bold mb-1">Private & Secure</h4>
                                <p className="text-neutral-400 text-sm">Your expertise and data remain private and encrypted.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
