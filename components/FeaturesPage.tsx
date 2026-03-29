"use client";
import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Activity, CheckCircle2, ArrowRight, Layers, FileText, Download } from 'lucide-react';
import { Button } from './Button';

interface FeaturesPageProps {
    onGoToAuth: (isLogin?: boolean) => void;
    onBack: () => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onGoToAuth, onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900">
            
            {/* Minimalist Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50 h-16 sm:h-20 flex items-center px-4 sm:px-8">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowRight className="rotate-180" size={16} /> Back to Home
                </button>
            </header>

            <main className="pt-32 pb-24">
                <section className="px-4 sm:px-6 max-w-5xl mx-auto text-center mb-24">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
                            Two distinct workflows,<br/>
                            <span className="text-primary-600 border-b-4 border-primary-200 pb-1">one massive outcome.</span>
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Whether you want granular control or complete automation, Typoscale's engines adapt to how you prefer to write. Read exactly how they work.
                        </p>
                    </motion.div>
                </section>

                {/* Workflow 1: Manuscript Workshop */}
                <section className="bg-white py-24 border-y border-slate-100">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-start">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="sticky top-32"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-bold tracking-wide mb-6 uppercase">
                                <BrainCircuit size={18} /> Deep Control Workflow
                            </div>
                            <h2 className="font-heading text-4xl font-bold text-slate-900 mb-6 tracking-tight">
                                Manuscript Workshop
                            </h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                Perfect for thought-leaders, domain experts, and authors who want tight editorial control over their work while leveraging AI to skip the burnout.
                            </p>
                            
                            <Button variant="primary" size="lg" onClick={() => onGoToAuth(false)} className="rounded-full shadow-lg shadow-primary-600/20 px-8 py-4">
                                Start a Manuscript Workshop
                            </Button>
                        </motion.div>

                        <div className="space-y-12">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="bg-slate-50 p-8 rounded-2xl border border-slate-200 group hover:border-primary-200 transition-colors"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-primary-600 mb-6 font-bold text-xl">1</div>
                                <h3 className="font-heading text-2xl font-bold text-slate-900 mb-3">Topic & Syllabus Phase</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    You enter your core premise. The AI generates a comprehensive book blueprint—identifying the target audience, tone, and mapping out a detailed table of contents. You can edit this mapping structurally before moving on.
                                </p>
                            </motion.div>
                            
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="bg-slate-50 p-8 rounded-2xl border border-slate-200 group hover:border-primary-200 transition-colors"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-primary-600 mb-6 font-bold text-xl">2</div>
                                <h3 className="font-heading text-2xl font-bold text-slate-900 mb-3">Iterative Drafting</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Instead of generating the whole book invisibly, the system stops chapter by chapter. You review the draft of Chapter 1, refine the prose, inject specific research or anecdotes, and approve it before the AI drafts Chapter 2.
                                </p>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-slate-50 p-8 rounded-2xl border border-slate-200 group hover:border-primary-200 transition-colors"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-primary-600 mb-6 font-bold text-xl">3</div>
                                <h3 className="font-heading text-2xl font-bold text-slate-900 mb-3">Format Lab Rendering</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Once completed, sync the text directly to the Format Lab, automatically injecting elegant typography, chapter headers, and compiling it instantly into standard publishing formats (EPUB/PDF).
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Workflow 2: Autonomous Engine */}
                <section className="py-24 bg-slate-900 text-slate-300">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-start">
                        <div className="space-y-12 order-2 lg:order-1">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="bg-slate-800 p-8 rounded-2xl border border-slate-700 group hover:border-blue-500/30 transition-colors relative overflow-hidden"
                            >
                                <Layers className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-700/50 group-hover:text-blue-500/10 transition-colors" />
                                <div className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-600 flex items-center justify-center text-blue-400 mb-6 font-bold text-xl relative z-10">1</div>
                                <h3 className="font-heading text-2xl font-bold text-white mb-3 relative z-10">Swarm Initialization</h3>
                                <p className="text-slate-400 leading-relaxed relative z-10">
                                    You simply write the prompt. Need a 20-chapter novel about a space detective? Or a 5-chapter business guide? The engine assigns multiple AI agents that immediately begin negotiating an outline.
                                </p>
                            </motion.div>
                            
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="bg-slate-800 p-8 rounded-2xl border border-slate-700 group hover:border-blue-500/30 transition-colors relative overflow-hidden"
                            >
                                <Activity className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-700/50 group-hover:text-blue-500/10 transition-colors" />
                                <div className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-600 flex items-center justify-center text-blue-400 mb-6 font-bold text-xl relative z-10">2</div>
                                <h3 className="font-heading text-2xl font-bold text-white mb-3 relative z-10">Live Execution Log</h3>
                                <p className="text-slate-400 leading-relaxed relative z-10">
                                    Sit back and watch the code fly. You gain visibility into a raw developer-style terminal showing precisely what the agents are researching, drafting, correcting, and formatting in real-time.
                                </p>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-slate-800 p-8 rounded-2xl border border-slate-700 group hover:border-blue-500/30 transition-colors relative overflow-hidden"
                            >
                                <Download className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-700/50 group-hover:text-blue-500/10 transition-colors" />
                                <div className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-600 flex items-center justify-center text-blue-400 mb-6 font-bold text-xl relative z-10">3</div>
                                <h3 className="font-heading text-2xl font-bold text-white mb-3 relative z-10">Instant Delivery</h3>
                                <p className="text-slate-400 leading-relaxed relative z-10">
                                    As soon as the execution trace completes, the finished book immediately appears in your library for viewing or download. No review loops required.
                                </p>
                            </motion.div>
                        </div>

                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="sticky top-32 order-1 lg:order-2"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-800 text-blue-400 text-sm font-bold tracking-wide mb-6 uppercase">
                                <Activity size={18} /> Fully Automated
                            </div>
                            <h2 className="font-heading text-4xl font-bold text-white mb-6 tracking-tight">
                                Autonomous Engine
                            </h2>
                            <p className="text-lg text-slate-400 leading-relaxed mb-8">
                                For those who just want to hit run and get a book out. Command the multi-agent system and watch it generate content autonomously right in front of your eyes.
                            </p>
                            
                            <Button variant="ghost" size="lg" onClick={() => onGoToAuth(false)} className="rounded-full text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 px-8 py-4 border border-blue-600">
                                Experience the Engine
                            </Button>
                        </motion.div>
                    </div>
                </section>
            </main>
        </div>
    );
};
