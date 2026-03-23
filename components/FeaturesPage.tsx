
"use client";
import React from 'react';
import { Logo } from './Logo';
import { 
    Shield, Zap, Search, Palette, FileText, ArrowLeft, 
    CheckCircle2, Cpu, Database, Layers, BrainCircuit, 
    ArrowRight, PenTool, BookOpen, Globe, Sparkles,
    MousePointer2, Terminal, Workflow, Rocket
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Button';

interface FeaturesPageProps {
    onBack: () => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Logo />
                    <Button 
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="gap-2"
                    >
                        <ArrowLeft size={16} /> Back to Home
                    </Button>
                </div>
            </header>

            <main className="pt-20 pb-20 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-20">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="inline-block px-4 py-1.5 bg-primary-50 text-primary-700 text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
                                Publishing Capabilities
                            </span>
                            <h1 className="text-2xl sm:text-[40px] font-heading font-bold text-slate-900 mb-8 tracking-tight">
                                Two Workflows to <span className="italic text-primary-600">Authorship</span>
                            </h1>
                            <p className="text-slate-600 text-base sm:text-[18px] max-w-3xl mx-auto leading-relaxed">
                                Whether you want granular control over every sentence or a fully autonomous hands-off experience, Manuscale provides the infrastructure for professional book publishing.
                            </p>
                        </motion.div>
                    </div>

                    {/* 1. MANUSCALE STUDIO */}
                    <section className="mb-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-16">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                                        <MousePointer2 size={24} />
                                    </div>
                                    <h2 className="text-2xl sm:text-[40px] font-heading font-bold">Manuscript Workshop</h2>
                                </div>
                                <p className="text-slate-600 text-base sm:text-[18px] mb-8 leading-relaxed">
                                    The Workshop is an interactive, human-in-the-loop environment designed for authors who want to collaborate with AI. Unlike the Autonomous Publishing Engine, the Workshop is <span className="font-bold text-slate-900 underline decoration-primary-300 underline-offset-4">fully editable and interactive</span>.
                                </p>
                                
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">1</div>
                                        <p className="text-[16px] text-slate-600"><span className="font-bold text-slate-900">Granular Control:</span> Edit outlines, rewrite paragraphs, and regenerate specific sections in real-time.</p>
                                    </div>
                                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">2</div>
                                        <p className="text-[16px] text-slate-600"><span className="font-bold text-slate-900">Live Feedback:</span> Chat with your Co-Author agent to refine the tone or add specific missing details.</p>
                                    </div>
                                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">3</div>
                                        <p className="text-[16px] text-slate-600"><span className="font-bold text-slate-900">Visual Integration:</span> Design covers and mockups alongside your text for a cohesive product.</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Workflow size={120} />
                                </div>
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                                    <Terminal size={18} className="text-primary-400" />
                                    The Workshop Workflow
                                </h3>
                                <div className="space-y-8 relative">
                                    {[
                                        { step: "01", title: "Crystallization", desc: "Define your topic, target audience, and core mission." },
                                        { step: "02", title: "Blueprint Generation", desc: "AI generates a comprehensive table of contents and chapter goals." },
                                        { step: "03", title: "Deep Research", desc: "Ground the book in reality with live web citations and data." },
                                        { step: "04", title: "Collaborative Writing", desc: "Draft chapter by chapter, editing and refining as you go." },
                                        { step: "05", title: "Visual Identity", desc: "Generate cover art and marketing assets in the Design Studio." }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex gap-6 items-start">
                                            <span className="font-mono text-primary-400 text-sm font-bold pt-1">{item.step}</span>
                                            <div>
                                                <h4 className="font-bold mb-1">{item.title}</h4>
                                                <p className="text-slate-400 text-[12px] leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* 2 Ways to Create */}
                        <div className="bg-slate-50 rounded-2xl sm:rounded-[3rem] p-6 sm:p-12 md:p-12">
                            <h3 className="text-2xl sm:text-[40px] font-heading font-bold mb-6 text-center">Two Workflows to Start Your Masterpiece</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                                        <Database size={24} />
                                    </div>
                                    <h4 className="font-bold mb-3">The Knowledge Engine</h4>
                                    <p className="text-slate-500 text-[16px] leading-relaxed mb-4">
                                        <span className="text-slate-900 font-semibold">Grounded Workshop:</span> Turn your proprietary data, raw notes, or existing content into a professional book. Manuscale ingests your unique context to ensure your expertise is the foundation of every chapter.
                                    </p>
                                </div>
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                                        <BrainCircuit size={24} />
                                    </div>
                                    <h4 className="font-bold mb-3">Topic or Idea</h4>
                                    <p className="text-slate-500 text-[16px] leading-relaxed mb-4">
                                        <span className="text-slate-900 font-semibold">Standard Workshop:</span> Start with a simple prompt. Our agents perform the research and structure the narrative from scratch using live web data and autonomous reasoning.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. AUTO-PUBLISHER */}
                    <section>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="order-2 lg:order-1"
                            >
                                <div className="bg-primary-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                                    <div className="absolute -right-10 -bottom-10 opacity-10">
                                        <Rocket size={240} />
                                    </div>
                                    <h3 className="text-[28px] font-bold mb-8 flex items-center gap-2">
                                        <Cpu size={18} />
                                        The Agent Swarm
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { icon: <BrainCircuit size={18}/>, name: "Director", role: "The central brain. Orchestrates the state machine and assigns tasks to specialists." },
                                            { icon: <Layers size={18}/>, name: "Strategist", role: "Architects the Blueprint and Outline based on audience analysis." },
                                            { icon: <Search size={18}/>, name: "Scholar", role: "Performs live research, fact-checks, and manages the Authority Bible." },
                                            { icon: <PenTool size={18}/>, name: "Scribe", role: "Drafts high-quality prose at 2.4k words per minute using Strategic DNA." },
                                            { icon: <Sparkles size={18}/>, name: "Editor", role: "Recursive critique agent. Refines prose, tone, and ensures narrative consistency." },
                                            { icon: <Palette size={18}/>, name: "Designer", role: "Visual prompt architect. Creates 4K cover art and marketing assets." },
                                            { icon: <FileText size={18}/>, name: "Publisher", role: "Final assembly agent. Compiles and formats Kindle-ready EPUB and DOCX files." }
                                        ].map((agent, i) => (
                                            <div key={i} className="bg-white/10 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="text-primary-300">{agent.icon}</div>
                                                    <span className="font-bold text-xs">{agent.name}</span>
                                                </div>
                                                <p className="text-white/60 text-[12px] leading-relaxed">{agent.role}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-white/10">
                                        <h4 className="text-[12px] font-bold uppercase tracking-widest text-primary-200 mb-4">How the Swarm Works</h4>
                                        <div className="space-y-3">
                                            <p className="text-[12px] text-white/70 leading-relaxed">
                                                <span className="text-white font-bold">1. Mission Input:</span> You provide a high-level goal or topic.
                                            </p>
                                            <p className="text-[12px] text-white/70 leading-relaxed">
                                                <span className="text-white font-bold">2. Orchestration:</span> The Director Agent analyzes the mission and assigns the first "Specialist Mission" to the Strategist.
                                            </p>
                                            <p className="text-[12px] text-white/70 leading-relaxed">
                                                <span className="text-white font-bold">3. Parallel Execution:</span> While the Scribe writes, the Scholar researches the next chapter, and the Designer drafts the visual identity.
                                            </p>
                                            <p className="text-[12px] text-white/70 leading-relaxed">
                                                <span className="text-white font-bold">4. Recursive Refinement:</span> The Editor reviews every draft. If it doesn't meet the Blueprint standards, it's sent back for a rewrite.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-white/10">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[12px] font-mono uppercase tracking-widest text-primary-200">Throughput Speed</span>
                                            <span className="text-2xl font-serif font-bold">2.4k <span className="text-[14px] font-sans font-normal opacity-60">words/min</span></span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="order-1 lg:order-2"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                        <Zap size={24} />
                                    </div>
                                    <h2 className="text-2xl sm:text-[40px] font-heading font-bold">Autonomous Publishing Engine</h2>
                                </div>
                                <p className="text-slate-600 text-base sm:text-[18px] mb-8 leading-relaxed">
                                    The Autonomous Publishing Engine is a fully autonomous publishing system. It is designed for high-speed, hands-off content creation where the AI manages the entire lifecycle from concept to export.
                                </p>
                                
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 shrink-0"><CheckCircle2 size={20}/></div>
                                        <div>
                                            <p className="text-slate-500 text-[16px]">Set and Forget</p>
                                            <p className="text-slate-500 text-[16px]">Input your mission and let the swarm handle the rest. No manual intervention required.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 shrink-0"><Globe size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Live Grounding</h4>
                                            <p className="text-slate-500 text-[16px]">The Scholar agent ensures every chapter is backed by real-world data from the live web.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 shrink-0"><Shield size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Hierarchical Orchestration</h4>
                                            <p className="text-slate-500 text-[16px]">The Strategist agent prevents hallucinations by strictly enforcing the project blueprint.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Technical Specs Footer */}
                    <div className="mt-40 border-t border-slate-100 pt-20 text-center">
                        <h2 className="text-2xl sm:text-[40px] font-heading font-bold mb-8">Professional Grade Output</h2>
                        <div className="flex flex-wrap justify-center gap-12">
                            <div className="flex flex-col items-center">
                                <span className="text-3xl font-bold text-slate-900 mb-1">EPUB</span>
                                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Kindle Ready</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-3xl font-bold text-slate-900 mb-1">4K</span>
                                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Cover Art</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-3xl font-bold text-slate-900 mb-1">256-bit</span>
                                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Local Encryption</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-12 bg-slate-50 border-t border-slate-100 text-center text-slate-500 text-xs">
                <p>&copy; {new Date().getFullYear()} Manuscale. The Private Autonomous Publishing Studio.</p>
            </footer>
        </div>
    );
};
