"use client";
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500">{message}</p>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <Button variant="neutral" className="flex-1" onClick={onCancel}>Cancel</Button>
                    <Button variant="primary" className="flex-1 bg-red-600 hover:bg-red-700" onClick={onConfirm}>Confirm</Button>
                </div>
            </div>
        </div>
    );
};
