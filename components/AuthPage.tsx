
"use client";
import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';

interface AuthPageProps {
    onLogin: () => void;
    onBack: () => void;
    defaultIsLogin?: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onBack, defaultIsLogin = true }) => {
    const [isLogin, setIsLogin] = useState(defaultIsLogin);

    return isLogin ? (
        <LoginPage 
            onLogin={onLogin} 
            onGoToSignup={() => setIsLogin(false)} 
            onBack={onBack}
        />
    ) : (
        <SignupPage 
            onSignup={onLogin} 
            onGoToLogin={() => setIsLogin(true)} 
            onBack={onBack}
        />
    );
};
