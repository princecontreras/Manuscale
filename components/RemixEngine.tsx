
"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, FileText, Loader2, ArrowRight, Quote, RefreshCw, ChevronRight, PenTool } from 'lucide-react';
import { useToast } from './ToastContext';
import { analyzeRemixContent } from '../services/aiClient';
import { ProjectBlueprint, ProjectMemory } from '../types';
import { saveLocal, loadLocal } from '../services/storage';

interface RemixEngineProps {
    onBack: () => void;
    onCreateProject: (blueprint: ProjectBlueprint, memory?: ProjectMemory) => void;
}

const DRAFT_KEY = 'manuscript_remix_draft';

const RemixEngine: React.FC<RemixEngineProps> = ({ onBack, onCreateProject }) => {
    const { showToast } = useToast();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [analyzingStep, setAnalyzingStep] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const LOADING_STEPS = [
        "Scanning source material...",
        "Identifying core themes...",
        "Detecting narrative voice...",
        "Structuring chapters...",
        "Finalizing blueprint..."
    ];

    // Load Draft on Mount
    useEffect(() => {
        const loadDraft = async () => {
            const draft = await loadLocal(DRAFT_KEY, '');
            if (draft && !text) {
                setText(draft);
            }
        };
        loadDraft();
    }, []);

    // Auto-Save Draft
    useEffect(() => {
        const timer = setTimeout(() => {
            saveLocal(DRAFT_KEY, text);
        }, 500); // Debounce save
        return () => clearTimeout(timer);
    }, [text]);

    useEffect(() => {
        let interval: any;
        if (loading) {
            setAnalyzingStep(0);
            interval = setInterval(() => {
                setAnalyzingStep(prev => (prev + 1) % LOADING_STEPS.length);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleRemix = async () => {
        if (!text.trim() || text.length < 50) return;
        setLoading(true);
        try {
            const result = await analyzeRemixContent(text);
            if (result) {
                // Clear draft on successful conversion to avoid stale data next time
                saveLocal(DRAFT_KEY, ''); 
                onCreateProject(result.blueprint, result.memory);
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "Failed to generate remix project. Please try again.";
            console.error("Remix error:", e);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden relative selection:bg-primary-100 selection:text-primary-900">
            
            {/* Header */}
            <div className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm z-20 flex-shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h1 className="font-serif font-bold text-2xl text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-primary-200 shadow-lg">
                                <RefreshCw size={18}/>
                            </div>
                            Remix Engine
                        </h1>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-label text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <PenTool size={12}/> Source Adapter
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col lg:flex-row w-full h-full overflow-hidden">
                
                {/* Left Panel: Input */}
                <div className="flex-1 flex flex-col relative bg-[#f8fafc]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
                    
                    <div className="flex-grow flex flex-col p-6 lg:p-12 overflow-y-auto z-10">
                        <div className="max-w-4xl mx-auto w-full h-full flex flex-col bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden ring-1 ring-slate-100">
                            
                            {/* Paper Header */}
                            <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-6 justify-between flex-shrink-0">
                                <span className="text-label text-slate-400 flex items-center gap-2">
                                    <FileText size={14}/> Raw Source
                                </span>
                                <span className={`text-micro font-bold px-2 py-1 rounded-md transition-colors ${text.length > 5000 ? 'bg-primary-50 text-primary-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {text.length.toLocaleString()} characters
                                </span>
                            </div>

                            {/* Paper Body */}
                            <div className="flex-grow relative group">
                                <textarea 
                                    ref={textareaRef}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Paste your rough notes, blog posts, transcripts, or chaotic drafts here..."
                                    className="w-full h-full p-8 resize-none outline-none text-body text-slate-700 leading-relaxed font-serif placeholder:text-slate-300 placeholder:italic placeholder:font-sans selection:bg-primary-100"
                                    autoFocus
                                />
                                {text.length === 0 && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-30">
                                        <Quote size={64} className="text-slate-300 mb-6"/>
                                        <p className="text-heading text-slate-400 font-serif italic">"Paste content to begin transformation"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Controls */}
                <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col z-20 shadow-2xl">
                    <div className="p-8 flex-grow flex flex-col">
                        <div className="mb-8">
                            <h3 className="text-title text-slate-900 mb-3">Blueprint Architect</h3>
                            <p className="text-body text-slate-500 text-sm">
                                The Remix Engine uses advanced semantic analysis to extract narrative DNA from your raw text and restructure it into a professional book outline.
                            </p>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                                <div className="relative">
                                    <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 transition-colors ${text.length > 0 ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300'}`}></div>
                                    <h4 className="text-label text-slate-900 mb-1">1. Ingest</h4>
                                    <p className="text-micro text-slate-500">Paste raw material (notes, blogs, drafts).</p>
                                </div>
                                <div className="relative">
                                    <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 transition-colors ${loading ? 'bg-primary-600 border-primary-600 animate-pulse' : 'bg-white border-slate-300'}`}></div>
                                    <h4 className="text-label text-slate-900 mb-1">2. Analyze</h4>
                                    <p className="text-micro text-slate-500">Extracts themes, voice, and structure.</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 bg-white border-slate-300"></div>
                                    <h4 className="text-label text-slate-900 mb-1">3. Reconstruct</h4>
                                    <p className="text-micro text-slate-500">Generates a cohesive book blueprint.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-slate-100">
                            <button 
                                onClick={handleRemix}
                                disabled={loading || text.length < 50}
                                className="w-full py-4 bg-action-600 hover:bg-action-700 text-white rounded-xl font-bold text-heading shadow-lg shadow-action-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-primary-200 group-hover:text-white transition-colors"/>}
                                {loading ? LOADING_STEPS[analyzingStep] : 'Analyze & Remix'}
                                {!loading && <ArrowRight size={16} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>}
                            </button>
                            
                            {loading && (
                                <div className="mt-4 text-center">
                                    <p className="text-micro text-slate-400 font-mono animate-pulse">Processing context window...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RemixEngine;
