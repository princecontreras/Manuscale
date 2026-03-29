"use client";
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { ArrowRight, Chrome } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { useToast } from './ToastContext';

const getFirebaseErrorMessage = (error: any): string => {
    const errorCode = error?.code || error?.message || 'unknown';
    console.error('Firebase Error Details:', { code: error?.code, message: error?.message, errorCode });
    
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed.';
        case 'auth/popup-blocked':
            return 'Sign-in popup was blocked by your browser.';
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
            return `Authentication error: ${errorCode}. Please try again.`;
    }
};

interface LoginPageProps {
    onLogin: () => void;
    onGoToSignup: () => void;
    onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGoToSignup, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showToast } = useToast();

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);
            // Google sign-in automatically verifies email
            showToast("Successfully signed in!", "success");
            // Call onLogin to set isJustLoggedIn flag and let subscription check handle routing
            // This ensures subscribed users go to DASHBOARD and unsubscribed go to /pricing
            onLogin();
        } catch (error: any) {
            console.error("Google login failed:", error);
            const errorMessage = getFirebaseErrorMessage(error);
            showToast(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                showToast("Please verify your email. Check your inbox for the verification link.", "warning");
                await auth.signOut();
                return;
            }
            showToast("Successfully signed in!", "success");
            // Call onLogin to set isJustLoggedIn flag and let subscription check handle routing
            // This ensures subscribed users go to DASHBOARD and unsubscribed go to /pricing
            onLogin();
        } catch (error: any) {
            console.error("Email login failed:", error);
            const errorMessage = getFirebaseErrorMessage(error);
            showToast(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[360px] bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
                <div className="flex justify-center mb-6 cursor-pointer" onClick={onBack}>
                    <Logo />
                </div>
                <h1 className="text-xl font-bold text-neutral-900 text-center mb-2">Welcome back</h1>
                <p className="text-neutral-500 text-sm text-center mb-8">Sign in to continue to Typoscale.</p>
                
                <div className="space-y-4">
                    <Button 
                        variant="neutral"
                        size="lg"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full gap-3"
                    >
                        <Chrome size={18} />
                        {loading ? "Signing in..." : "Continue with Google"}
                    </Button>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-neutral-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                            <span className="bg-white px-3 text-neutral-400 font-bold">Or</span>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleEmailLogin}>
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
                            {loading ? "Signing in..." : "Sign In"} <ArrowRight size={16} />
                        </Button>
                    </form>

                    <Button variant="ghost" size="sm" onClick={onGoToSignup} className="w-full mt-4">
                        New here? Create an account
                    </Button>
                    <div className="text-center mt-4">
                        <button onClick={onBack} className="text-[10px] text-neutral-400 hover:text-neutral-600 uppercase tracking-widest font-bold">
                            Back to home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
