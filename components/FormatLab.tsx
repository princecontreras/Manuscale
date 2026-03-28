
"use client";
import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowRight, Loader2, CheckCircle2, AlertTriangle, File, Download, BookOpen, ChevronRight, X } from 'lucide-react';
import { parseEPUB } from '../services/formatService';
import { saveProject } from '../services/storage';
import { EbookData } from '../types';
import { useToast } from './ToastContext';

interface FormatLabProps {
    onBack: () => void;
    onImportComplete: (id: string) => void;
}

const FormatLab: React.FC<FormatLabProps> = ({ onBack, onImportComplete }) => {
    const { showToast } = useToast();
    const [dragActive, setDragActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedProject, setImportedProject] = useState<EbookData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFile = async (file: File) => {
        setIsProcessing(true);
        setError(null);
        try {
            if (!file.name.endsWith('.epub')) {
                throw new Error("Unsupported file type. Please upload an EPUB file.");
            }
            showToast("Parsing EPUB file...", "info");
            const project = await parseEPUB(file);
            showToast("Saving project...", "info");
            await saveProject(project);
            setImportedProject(project);
            showToast("Project imported successfully!", "success");
        } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : "Failed to import EPUB file. Please ensure it's a valid EPUB format.";
            console.error("EPUB Import Error:", e);
            setError(errorMessage);
            showToast(errorMessage, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden relative selection:bg-primary-100 selection:text-primary-900">
            {/* Header */}
            <div className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm z-20 flex-shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                        <X size={20}/>
                    </button>
                    <div>
                        <h1 className="font-serif font-bold text-2xl text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                                <FileText size={18}/>
                            </div>
                            Format Lab
                        </h1>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-label text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Loader2 size={12}/> Conversion Engine
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10 pointer-events-none"></div>

                {importedProject ? (
                    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full text-center animate-in zoom-in-95 duration-300 relative z-10">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={40}/>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Conversion Complete</h2>
                        <p className="text-slate-500 mb-8">
                            Successfully imported <strong>{importedProject.title}</strong> with {importedProject.outline?.length} chapters.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => onImportComplete(importedProject.id)}
                                className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-primary-300 hover:bg-primary-50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-slate-400 group-hover:text-primary-600">
                                    <BookOpen size={24}/>
                                </div>
                                <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">Open Editor <ChevronRight size={14}/></div>
                                <div className="text-xs text-slate-500">Edit, format, or continue writing.</div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-xl w-full relative z-10">
                        <div 
                            className={`bg-white rounded-3xl border-2 border-dashed transition-all p-12 text-center relative ${dragActive ? 'border-primary-500 bg-primary-50 scale-105' : 'border-slate-300 hover:border-primary-300'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {isProcessing ? (
                                <div className="py-12">
                                    <Loader2 size={48} className="text-primary-500 animate-spin mx-auto mb-6"/>
                                    <h3 className="text-xl font-bold text-slate-800">Transmuting Matter...</h3>
                                    <p className="text-slate-500 mt-2">Parsing structure and extracting chapters.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                        <Upload size={32}/>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Drag & Drop eBook</h3>
                                    <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                                        Upload an <strong>EPUB</strong> file to convert it into a Typoscale Project. From there, you can edit or export it.
                                    </p>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl hover:bg-primary-600 transition-all"
                                    >
                                        Browse Files
                                    </button>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        className="hidden" 
                                        accept=".epub"
                                        onChange={handleChange}
                                    />
                                    {error && (
                                        <div className="mt-8 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                                            <AlertTriangle size={16}/> {error}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        
                        <div className="mt-12 grid grid-cols-2 gap-6 text-center opacity-60">
                            <div>
                                <div className="text-sm font-bold text-slate-800 mb-1">EPUB Import</div>
                                <div className="text-xs text-slate-500">Structure Preservation</div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-800 mb-1">DOCX Support</div>
                                <div className="text-xs text-slate-500">Coming Soon</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormatLab;
