
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { EbookData, ProjectBlueprint, OutlineItem, NarrativeProfile, ProjectMemory } from '../types';
import { analyzeTopicAndConfigure, generateProjectOutline, generateAuthorityBible, agenticChapterGeneration, calibrateStyleFromSample, analyzeChapterAftermath, compressGlobalSummary, gatherChapterFacts, breakDownChapter, expandNonFictionOutline } from '../services/aiClient';
import { saveLocal, getProjectMemoryKey, saveProject } from '../services/storage';
import { paginateContent } from '../utils/pagination';
import ResearchStudio from './ResearchStudio';
import DOMPurify from 'dompurify';
import { 
    Sparkles, Layout, AlignLeft, List, Plus, Zap, CheckCircle2, GripVertical, Trash2, 
    X, Activity, Square, Cpu, Network, FileText, Edit3,
    GitBranch, Database, Terminal, BrainCircuit, Play, GripHorizontal,
    UserCircle, Mic2, Paperclip, MessageSquare, Microscope, ChevronDown, ChevronUp, ArrowLeft, Loader2, Eye,
    Globe, Link as LinkIcon, Target, Flag, Layers, Milestone, Boxes
} from 'lucide-react';
import { useToast } from './ToastContext';

export interface InputFormProps {
  onGenerate: (data: EbookData) => void;
  initialTopic?: string;
  initialBlueprint?: ProjectBlueprint;
  initialMemory?: ProjectMemory;
}

const ANALYSIS_STEPS = [
    "Engaging deep reasoning model...",
    "Scanning authority voice...",
    "Thinking through key arguments...",
    "Structuring chapter flow...",
    "Finalizing blueprint..."
];

const MAX_TOPIC_LENGTH = 5000;

// --- MODULE DEFINITIONS (Functional) ---
const AGENTS = {
    non_fiction: [
        { id: 'continuity', name: 'Logic Engine', role: 'Structure', icon: CheckCircle2, color: 'text-cyan-400', bg: 'bg-cyan-50', desc: 'Architecting Logic Flow & structural integrity' },
        { id: 'writer', name: 'Scribe', role: 'Synthesis', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500', desc: 'Synthesizing facts, Case Studies, & Self-Assessments' },
        { id: 'lore', name: 'Knowledge Scanner', role: 'Indexing', icon: Database, color: 'text-orange-400', bg: 'bg-orange-500', desc: 'Cataloging key terms & definitions' },
        { id: 'editor', name: 'Red Pen', role: 'Critique', icon: Edit3, color: 'text-red-400', bg: 'bg-red-500', desc: 'Enforcing tone & cutting fluff' }
    ]
};

const AutoPilotModal: React.FC<{
    isOpen: boolean;
    currentChapterIndex: number;
    totalChapters: number;
    currentTitle: string;
    streamLog: string;
    systemLog: string[];
    liveSources: {title: string, uri: string}[];
    onStop: () => void;
    isStopping: boolean;
    blueprint: ProjectBlueprint | null;
    activeAgentId: string;
}> = ({ isOpen, currentChapterIndex, totalChapters, currentTitle, streamLog, systemLog, liveSources, onStop, isStopping, blueprint, activeAgentId }) => {
    const streamRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<number>(Date.now());
    const [stats, setStats] = useState({ words: 0, wpm: 0 });

    useEffect(() => {
        if (isOpen) {
            startTimeRef.current = Date.now();
            setStats({ words: 0, wpm: 0 });
        }
    }, [isOpen]);

    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.scrollTop = streamRef.current.scrollHeight;
        }
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
        
        const now = Date.now();
        const minutes = Math.max(0.1, (now - startTimeRef.current) / 60000);
        const textOnly = streamLog.replace(/<[^>]*>/g, ' ');
        const wordCount = textOnly.split(/\s+/).length;
        const wpm = Math.round(wordCount / minutes);
        
        setStats({ words: wordCount, wpm });
    }, [streamLog, systemLog]);

    if (!isOpen) return null;

    const progressPercent = ((currentChapterIndex) / totalChapters) * 100;
    const theme = { bg: 'bg-slate-950', accent: 'text-cyan-400', border: 'border-cyan-900', glow: 'shadow-cyan-900/20' };

    const activeAgents = AGENTS.non_fiction;
    const safeStreamLog = DOMPurify.sanitize(streamLog);

    return (
        <div className={`fixed inset-0 z-[100] ${theme.bg} flex flex-col font-sans animate-in fade-in duration-500 text-slate-200 overflow-hidden`}>
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0),#000)]`}></div>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>

            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center relative z-20 bg-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${theme.border} bg-white/5 ${theme.accent}`}>
                        <Cpu size={20} className="animate-pulse"/>
                    </div>
                    <div>
                        <h2 className="text-title text-white flex items-center gap-2">
                            Autonomous Publishing Engine
                            <span className={`text-micro ${theme.accent} bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider flex items-center gap-1`}>
                                <Activity size={10} className="animate-bounce"/> Live
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 text-label text-slate-400">
                            <span className="font-mono">{blueprint?.title}</span>
                            <span className="text-slate-600">|</span>
                            <span>Chapter {currentChapterIndex + 1} of {totalChapters}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                        <div className="text-label text-slate-500">Session Stats</div>
                        <div className="text-label font-mono text-slate-300">{stats.words} words • {stats.wpm} wpm</div>
                    </div>
                    <button 
                        onClick={onStop}
                        disabled={isStopping}
                        className={`border px-4 py-2 rounded-lg text-label flex items-center gap-2 transition-all ${isStopping ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30 hover:scale-105'}`}
                    >
                        {isStopping ? <Loader2 size={12} className="animate-spin"/> : <Square size={12} fill="currentColor"/>} 
                        {isStopping ? 'Stopping...' : 'Pause / Stop'}
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-grow relative z-10 flex flex-col md:flex-row overflow-hidden">
                
                {/* LEFT: Agent Swarm & Data Stream */}
                <div className="hidden md:flex w-80 border-r border-white/5 bg-black/20 backdrop-blur-xl p-4 flex-col gap-4 flex-shrink-0">
                    <div className="text-label text-slate-500 flex items-center gap-2 mb-2">
                        <Network size={12}/> Active Modules
                    </div>
                    
                    <div className="space-y-3">
                        {activeAgents.map((agent) => {
                            const isActive = activeAgentId === agent.id;
                            return (
                                <div 
                                    key={agent.id}
                                    className={`relative p-3 rounded-xl border transition-all duration-500 ${isActive ? `bg-white/5 ${theme.border} border-l-4` : 'bg-transparent border-transparent border-l-4 border-l-white/5 opacity-40'}`}
                                    style={{ borderLeftColor: isActive ? '' : undefined }}
                                >
                                    {isActive && (
                                        <div className={`absolute inset-0 ${agent.bg} blur-xl opacity-10 rounded-xl`}></div>
                                    )}
                                    <div className="relative flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? agent.color : 'text-slate-500'} bg-black/40`}>
                                            <agent.icon size={16} className={isActive ? 'animate-pulse' : ''}/>
                                        </div>
                                        <div>
                                            <div className={`text-label ${isActive ? 'text-white' : 'text-slate-400'}`}>{agent.name}</div>
                                            <div className="text-micro text-slate-500 uppercase tracking-wider">{agent.role}</div>
                                        </div>
                                    </div>
                                    {isActive && (
                                        <div className={`mt-2 text-micro ${agent.color} font-mono animate-pulse pl-11`}>
                                            &gt; {agent.desc}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* LIVE DATA STREAM */}
                    <div className="mt-4 flex-grow flex flex-col min-h-0">
                        <div className="text-label text-slate-500 flex items-center gap-2 mb-2">
                            <Globe size={12} className="text-emerald-500"/> Live Data Stream
                        </div>
                        <div className="flex-grow bg-black/30 rounded-lg border border-white/5 p-2 overflow-y-auto space-y-2 scrollbar-hide">
                            {liveSources.length === 0 ? (
                                <div className="text-micro text-slate-600 text-center py-4 italic">
                                    Waiting for Fact Hunter...
                                </div>
                            ) : (
                                [...liveSources].reverse().map((source, i) => (
                                    <div key={i} className="bg-white/5 p-2 rounded border border-white/5 flex items-start gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                                        <LinkIcon size={10} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-slate-300 truncate font-bold">{source.title}</div>
                                            <div className="text-[8px] text-slate-600 truncate">{source.uri}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="text-label text-slate-500 flex items-center gap-2 mb-2">
                            <Terminal size={12}/> System Terminal
                        </div>
                        <div 
                            ref={terminalRef}
                            className="h-32 bg-black/50 rounded-lg border border-white/10 p-3 font-mono text-micro overflow-y-auto space-y-1 scrollbar-hide shadow-inner"
                        >
                            {systemLog.map((log, i) => (
                                <div key={i} className="text-slate-400 break-words">
                                    <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                    <span className={log.includes('ERROR') ? 'text-red-400' : log.includes('SUCCESS') ? 'text-emerald-400' : 'text-slate-300'}>
                                        {log}
                                    </span>
                                </div>
                            ))}
                            <div className="animate-pulse text-slate-500">_</div>
                        </div>
                    </div>
                </div>

                {/* CENTER: Output Preview */}
                <div className="flex-1 flex flex-col relative bg-[#0c0c0c]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50 pointer-events-none"></div>
                    
                    {/* Chapter Header */}
                    <div className="p-4 flex justify-center sticky top-0 z-20 pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 shadow-xl">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-label text-white">Generating Chapter {currentChapterIndex + 1}</span>
                        </div>
                    </div>

                    {/* Stream Content */}
                    <div className="flex-grow overflow-y-auto p-8 md:p-12 relative z-10" ref={streamRef}>
                        <div className="max-w-2xl mx-auto">
                            <div className="text-center text-label text-slate-500 mb-8">{currentTitle}</div>
                            <div 
                                className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-lg max-w-none font-serif leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: safeStreamLog || '<div class="text-center text-slate-600 italic mt-20">Waiting for writer agent...</div>' }}
                            />
                            {streamLog && <div className={`inline-block w-2 h-5 bg-cyan-500 ml-1 animate-pulse`}></div>}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-white/5 w-full">
                        <div 
                            className={`h-full transition-all duration-500 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]`}
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OutlineItemCard: React.FC<{
    item: OutlineItem;
    idx: number;
    total: number;
    moveItem: (index: number, direction: 'up' | 'down') => void;
    updateItem: (index: number, field: keyof OutlineItem, value: any) => void;
    deleteItem: (index: number) => void;
    blueprintType: string;
    isPlanning: boolean;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    isDragging: boolean;
    availableModes?: {id: string, name: string}[];
}> = ({ item, idx, total, moveItem, updateItem, deleteItem, blueprintType, isPlanning, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, availableModes }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const logicFlow = item.logicFlow || [];

    useEffect(() => {
        if (logicFlow.length > 0 && item.beat && !isExpanded && isPlanning) {
            setIsExpanded(true);
        }
    }, [logicFlow.length, isPlanning]);

    const handleLogicFlowChange = (sIdx: number, val: string) => {
        const newLogicFlow = [...logicFlow];
        newLogicFlow[sIdx] = val;
        updateItem(idx, 'logicFlow', newLogicFlow);
    };

    const handleLogicFlowMove = (sIdx: number, dir: 'up' | 'down') => {
        const newLogicFlow = [...logicFlow];
        if (dir === 'up' && sIdx > 0) {
            [newLogicFlow[sIdx], newLogicFlow[sIdx - 1]] = [newLogicFlow[sIdx - 1], newLogicFlow[sIdx]];
        } else if (dir === 'down' && sIdx < newLogicFlow.length - 1) {
            [newLogicFlow[sIdx], newLogicFlow[sIdx + 1]] = [newLogicFlow[sIdx + 1], newLogicFlow[sIdx]];
        }
        updateItem(idx, 'logicFlow', newLogicFlow);
    };

    const handleLogicFlowDelete = (sIdx: number) => {
        const newLogicFlow = logicFlow.filter((_, i) => i !== sIdx);
        updateItem(idx, 'logicFlow', newLogicFlow);
    };

    const handleAddLogicFlow = () => {
        const newLogicFlow = [...logicFlow, ""];
        updateItem(idx, 'logicFlow', newLogicFlow);
        setIsExpanded(true);
    };

    return (
        <div 
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            className={`bg-white p-4 rounded-xl border transition-all group ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'} ${isPlanning ? 'border-amber-400 bg-amber-50 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
        >
            <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 mt-2 text-slate-300 cursor-grab active:cursor-grabbing">
                    <GripVertical size={16}/>
                    <span className="text-xs font-bold font-mono text-slate-400">{item.chapterNumber}</span>
                </div>
                
                <div className="flex-grow space-y-4">
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                        <input 
                            value={item.title} 
                            onChange={(e) => updateItem(idx, 'title', e.target.value)}
                            className="font-bold text-slate-800 flex-grow bg-transparent outline-none focus:bg-slate-50 rounded px-1 -ml-1 transition-colors text-base"
                            placeholder="Chapter Title"
                        />
                        
                        {/* Display Assigned Mode Badge if applicable */}
                        {item.mode && availableModes && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                                {availableModes.find(m => m.id === item.mode)?.name || 'Custom Mode'}
                            </span>
                        )}

                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-2 sm:p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors touch-target"><ChevronUp size={16}/></button>
                            <button onClick={() => moveItem(idx, 'down')} disabled={idx === total - 1} className="p-2 sm:p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors touch-target"><ChevronDown size={16}/></button>
                            <button onClick={() => deleteItem(idx)} className="p-2 sm:p-1 text-slate-300 hover:text-red-500 transition-colors ml-1 touch-target"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    
                    {/* Main Beat */}
                    <div className="relative">
                        <textarea 
                            value={item.beat} 
                            onChange={(e) => updateItem(idx, 'beat', e.target.value)}
                            className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all resize-none min-h-[80px]"
                            placeholder="Describe what happens in this chapter..."
                        />
                        {isPlanning && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                                <div className="bg-white px-3 py-1.5 rounded-full shadow-lg border border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-600 animate-pulse">
                                    <Sparkles size={12}/> Planning Structure...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Structure Editor */}
                    <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <div 
                            className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <List size={14} className="text-slate-400"/>
                                <span className="text-xs font-bold text-slate-600">Logic Flow Breakdown</span>
                                {logicFlow.length > 0 && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-full">{logicFlow.length}</span>}
                            </div>
                            {isExpanded ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                        </div>

                        {isExpanded && (
                            <div className="p-3 bg-white space-y-2">
                                {logicFlow.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-slate-400 italic cursor-pointer hover:text-slate-600" onClick={handleAddLogicFlow}>
                                        No detailed logic flow yet. Click to add.
                                    </div>
                                ) : (
                                    logicFlow.map((point, sIdx) => (
                                        <div key={sIdx} className="flex items-start gap-2 group/scene">
                                            <div className="mt-2 text-slate-300 font-mono text-[10px] w-4 text-right">{sIdx + 1}</div>
                                            <textarea
                                                value={point}
                                                onChange={(e) => handleLogicFlowChange(sIdx, e.target.value)}
                                                className="flex-grow text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded p-2 outline-none focus:ring-1 focus:ring-indigo-200 resize-none min-h-[38px] overflow-hidden"
                                                rows={1}
                                                onInput={(e) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = 'auto';
                                                    target.style.height = target.scrollHeight + 'px';
                                                }}
                                                placeholder="Describe key point..."
                                            />
                                            <div className="flex flex-col gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/scene:opacity-100 transition-opacity">
                                                <button onClick={() => handleLogicFlowMove(sIdx, 'up')} disabled={sIdx === 0} className="p-1.5 sm:p-0.5 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30 touch-target"><ChevronUp size={12}/></button>
                                                <button onClick={() => handleLogicFlowDelete(sIdx)} className="p-1.5 sm:p-0.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-300 touch-target"><X size={12}/></button>
                                                <button onClick={() => handleLogicFlowMove(sIdx, 'down')} disabled={sIdx === logicFlow.length - 1} className="p-1.5 sm:p-0.5 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30 touch-target"><ChevronDown size={12}/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <button 
                                    onClick={handleAddLogicFlow}
                                    className="w-full py-1.5 border border-dashed border-slate-200 rounded text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-1"
                                >
                                    <Plus size={12}/> Add Key Point
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-end border-t border-slate-50 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target</span>
                                <input 
                                    type="number" 
                                    value={item.targetWordCount} 
                                    onChange={(e) => updateItem(idx, 'targetWordCount', parseInt(e.target.value) || 0)}
                                    className="w-12 text-[10px] font-mono bg-transparent outline-none text-right text-slate-600"
                                />
                                <span className="text-[10px] text-slate-400">w</span>
                            </div>
                            
                            {item.status === 'completed' ? (
                                <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                    <CheckCircle2 size={12}/> Draft Ready
                                </span>
                            ) : (
                                <button 
                                    onClick={() => updateItem(idx, 'status', item.status === 'writing' ? 'draft' : 'writing')}
                                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${item.status === 'writing' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                >
                                    {item.status === 'writing' ? 'In Progress' : 'Pending'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, initialTopic, initialBlueprint, initialMemory }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<'IDEA' | 'BLUEPRINT' | 'OUTLINE'>(initialBlueprint ? 'BLUEPRINT' : 'IDEA');
  const [topic, setTopic] = useState(initialTopic || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(initialBlueprint || null);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [customStatus, setCustomStatus] = useState<string | null>(null);
  
  const [projectMemory, setProjectMemory] = useState<ProjectMemory>(initialMemory || { research: [], keyFigures: [], glossary: [], concepts: [], characters: [], world: [], plot: [] });
  
  const [authorName, setAuthorName] = useState('');
  const [showCalibration, setShowCalibration] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibratedStyle, setCalibratedStyle] = useState<Partial<NarrativeProfile> | null>(null);

  const [profile, setProfile] = useState<NarrativeProfile>({
      voice: 'Authoritative & Clear',
      tense: 'Present',
      pov: 'Second Person',
      targetAudience: 'General',
      complexity: 'Intermediate',
      archetype: 'Consultant',
      targetWordCount: 0,
      chapterCount: 10
  });

  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [planningChapterId, setPlanningChapterId] = useState<string | null>(null);

  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [streamLog, setStreamLog] = useState('');
  const [systemLog, setSystemLog] = useState<string[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string>('idle');
  const [autoGenCurrentIndex, setAutoGenCurrentIndex] = useState(0);
  const [autoGenSources, setAutoGenSources] = useState<{title: string, uri: string}[]>([]); 
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProCallTime = useRef<number>(0);
  const isMounted = useRef(true);
  
  const [showContextStudio, setShowContextStudio] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
      let interval: any;
      if (isAnalyzing && !customStatus) {
          setAnalysisStepIndex(0);
          interval = setInterval(() => {
              setAnalysisStepIndex(prev => (prev + 1) % ANALYSIS_STEPS.length);
          }, 2000);
      }
      return () => clearInterval(interval);
  }, [isAnalyzing, customStatus]);

  useEffect(() => {
      isMounted.current = true;
      return () => { 
          isMounted.current = false;
          if (abortControllerRef.current) abortControllerRef.current.abort();
      };
  }, []);

  // Prevent accidental page reloads/navigation during auto-drafting
  useEffect(() => {
      if (!isAutoGenerating) return;
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          e.preventDefault();
          // Modern browsers show a generic message regardless of returnValue
          e.returnValue = 'Auto-drafting is in progress. Are you sure you want to leave?';
          return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAutoGenerating]);

  useEffect(() => {
      if (step === 'OUTLINE' && outline.length > 0 && !planningChapterId && !isAutoGenerating) {
          const needsPlanning = outline.some(item => !item.logicFlow || item.logicFlow.length === 0);
          if (needsPlanning) {
              handleManualPlanAll();
          }
      }
  }, [step, outline]);

  const handleManualPlanAll = async () => {
      if (!blueprint) return;
      const ac = new AbortController();
      abortControllerRef.current = ac;

      for (let i = 0; i < outline.length; i++) {
          if (!isMounted.current || ac.signal.aborted) break;
          const item = outline[i];
          if (item.logicFlow && item.logicFlow.length > 0) continue;

          setPlanningChapterId(item.id);
          try {
              const expandedBeat = await expandNonFictionOutline(item.beat, blueprint.title, blueprint.summary, ac.signal);
              const logicFlow = await breakDownChapter(item.title, expandedBeat, blueprint.type, projectMemory, ac.signal);
              
              if (isMounted.current) {
                  setOutline(prev => {
                      const newOutline = [...prev];
                      const idx = newOutline.findIndex(o => o.id === item.id);
                      if (idx !== -1) {
                          newOutline[idx] = { 
                              ...newOutline[idx], 
                              beat: expandedBeat,
                              logicFlow: logicFlow 
                          };
                      }
                      return newOutline;
                  });
              }
          } catch (e) {
              const errorMsg = e instanceof Error ? e.message : `Failed to plan chapter ${i+1}. Please try again.`;
              console.error(`Planning error for chapter ${i+1}:`, e);
              showToast(errorMsg, "error");
          }
      }
      if (isMounted.current) setPlanningChapterId(null);
  };

  const handleAutoWrite = async (limitOne: boolean = false) => {
      if (!blueprint) return;
      
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      const ac = new AbortController();
      abortControllerRef.current = ac;
      
      const newId = crypto.randomUUID();
      setIsAutoGenerating(true);
      setIsStopping(false);
      setStreamLog(""); 
      setSystemLog([]);
      setAutoGenSources([]);
      addLog("Initializing Expert Engine...");
      setActiveAgentId('lore');
      
      let memory = projectMemory;
      let saveCounter = 0; // Debounce saves to every 2 chapters
      
      try {
          if ((!memory.concepts || memory.concepts.length === 0)) {
              addLog("Generating initial Knowledge Base...");
              const generatedMemory = await generateAuthorityBible(blueprint, outline, initialMemory, ac.signal);
              if (ac.signal.aborted) throw new Error("Aborted");
              memory = generatedMemory;
              setProjectMemory(memory); 
              addLog(`Context established: ${memory.research?.length || 0} Facts, ${memory.concepts?.length || 0} Concepts.`);
          } else {
              addLog(`Loaded existing context: ${memory.research?.length || 0} Facts, ${memory.concepts?.length || 0} Concepts.`);
          }
          
          saveLocal(getProjectMemoryKey(newId), memory); 
          const filledOutline = [...outline];
          let globalSummary = "";
          const initialProjectData = constructEbookData(newId, memory, filledOutline);
          if (initialProjectData) {
              await saveProject(initialProjectData);
              // Persist project ID so page reloads can recover progress
              if (typeof window !== 'undefined') {
                  sessionStorage.setItem('manuscale_session_project_id', newId);
                  sessionStorage.setItem('manuscale_session_view', 'WIZARD');
              }
          }

          for (let i = 0; i < filledOutline.length; i++) {
              if (ac.signal.aborted || !isMounted.current) break;
              if (isMounted.current) { setAutoGenCurrentIndex(i); setStreamLog(""); }
              const currentItem = filledOutline[i];
              let prevContext = "";
              if (i > 0 && filledOutline[i-1].content) { prevContext = filledOutline[i-1].content!.replace(/<[^>]+>/g, '').slice(-800); }
              let nextContext = "";
              if (i < filledOutline.length - 1) { nextContext = filledOutline[i+1].beat; }

              if (isMounted.current) setActiveAgentId('continuity');
              addLog(`Architecting Chapter ${i+1}: "${currentItem.title}"...`);
              let expandedBeat = currentItem.beat;
              let logicFlow = currentItem.logicFlow || [];

              if (logicFlow.length === 0) {
                  addLog(`Generating Logic Flow for "${currentItem.title}"...`);
                  expandedBeat = await expandNonFictionOutline(currentItem.beat, blueprint.title, globalSummary, ac.signal);
                  logicFlow = await breakDownChapter(currentItem.title, expandedBeat, blueprint.type, projectMemory, ac.signal);
                  
                  // Update the outline state so the user sees the plan
                  if (isMounted.current) {
                      setOutline(prev => {
                          const newOutline = [...prev];
                          const idx = newOutline.findIndex(o => o.id === currentItem.id);
                          if (idx !== -1) {
                              newOutline[idx] = { ...newOutline[idx], beat: expandedBeat, logicFlow: logicFlow };
                          }
                          return newOutline;
                      });
                  }
              }

              const finalBeat = `General Beat: ${expandedBeat}\nRequired Logic Flow:\n${logicFlow.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`;
              addLog(`Structure locked. Proceeding to research...`);
              
              if (ac.signal.aborted) break;
              await new Promise(resolve => setTimeout(resolve, 2000));

              let facts = "";
              let verifiedSources: {title: string, uri: string}[] = [];
              if (isMounted.current) setActiveAgentId('writer'); 
              addLog(`Performing Deep Research for "${currentItem.title}"...`);
              
              const researchResult = await gatherChapterFacts(finalBeat, blueprint, ac.signal);
              facts = researchResult.context;
              verifiedSources = researchResult.sources;

              if (verifiedSources.length > 0) {
                  if (isMounted.current) {
                      setAutoGenSources(prev => {
                          const newSrcs = verifiedSources.filter(s => !prev.some(p => p.uri === s.uri));
                          return [...prev, ...newSrcs];
                      });
                      addLog(`Found ${verifiedSources.length} verified sources.`);
                  }
              }
              if (ac.signal.aborted) break;
              await new Promise(resolve => setTimeout(resolve, 2000));

              const now = Date.now();
              const timeSinceLastPro = now - lastProCallTime.current;
              if (timeSinceLastPro < 32000) { 
                  const wait = 32000 - timeSinceLastPro;
                  addLog(`Cooling down Pro Model for ${Math.round(wait/1000)}s...`);
                  await new Promise(resolve => setTimeout(resolve, wait));
              }
              if (ac.signal.aborted) break;

              if (isMounted.current) setActiveAgentId('writer');
              addLog(`Drafting content (Pro)...`);
              const safeProfile = blueprint.profile || profile;
              
              lastProCallTime.current = Date.now();
              
              // Clear streamLog periodically to prevent memory bloat (keep only last 50KB)
              if (isMounted.current) {
                  setStreamLog(prev => {
                      if (prev.length > 50000) {
                          // Trim to last 25KB to leave room for new content
                          return prev.substring(prev.length - 25000);
                      }
                      return prev;
                  });
              }
              
              const refinedHtml = await agenticChapterGeneration(blueprint, safeProfile, { ...currentItem, beat: expandedBeat }, memory, (chunk) => { if (isMounted.current) setStreamLog(prev => prev + chunk); }, prevContext, nextContext, filledOutline.map(o => ({ ...o, content: undefined, generatedPages: undefined, sourceContent: undefined })), globalSummary, facts, ac.signal);
              
              if (ac.signal.aborted) break;
              
              if (isMounted.current) {
                  setActiveAgentId('editor');
                  addLog("Applying 'Red Pen' critique and polish...");
                  setStreamLog(refinedHtml); 
                  await new Promise(resolve => setTimeout(resolve, 1000));
              }

              let cleanHtml = refinedHtml.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '').trim();
              cleanHtml = cleanHtml.replace(/^[\s\S]*?<h1[^>]*>.*?<\/h1>/i, '').trim();
              
              const contentWithTitle = `<h1>Chapter ${i + 1}: ${currentItem.title}</h1>\n${cleanHtml}`;
              const pages = paginateContent(contentWithTitle);
              
              filledOutline[i] = { 
                  ...currentItem, 
                  content: contentWithTitle, 
                  generatedPages: pages, 
                  status: 'completed', 
                  beat: expandedBeat,
                  logicFlow: logicFlow,
                  sources: verifiedSources
              };
              
              await new Promise(resolve => setTimeout(resolve, 500));

              addLog(`SUCCESS: Chapter ${i+1} drafted.`);
              if (isMounted.current) setOutline([...filledOutline]);
              
              // Debounce saves: only save every 2 chapters to reduce memory pressure
              saveCounter++;
              let currentProjectData = constructEbookData(newId, memory, filledOutline);
              if (saveCounter >= 2 || i === filledOutline.length - 1) { // Force save on last chapter
                  if (currentProjectData) {
                      await saveProject(currentProjectData).catch(e => console.error("Background save failed", e));
                      saveCounter = 0; // Reset counter after save
                  }
              }
              
              if (limitOne && i === 0) { 
                  addLog(`Indexing arguments & concepts...`);
                  const aftermath = await analyzeChapterAftermath(refinedHtml, memory, 'Non-Fiction', ac.signal);
                  const merge = (existing: any[], newItems: any[]) => { const existingNames = new Set(existing.map(e => (e.name || '').toLowerCase())); return [...existing, ...newItems.filter(n => n && typeof n.name === 'string' && n.name.trim() !== '' && !existingNames.has(n.name.toLowerCase()))]; };
                  memory = { 
                      research: merge(memory.research || [], aftermath.newLore.research || []), 
                      keyFigures: merge(memory.keyFigures || [], aftermath.newLore.keyFigures || []),
                      glossary: merge(memory.glossary || [], aftermath.newLore.glossary || []),
                      concepts: merge(memory.concepts || [], aftermath.newLore.concepts || []),
                      argumentMap: [...(memory.argumentMap || [])],
                      characters: [...(memory.characters || [])],
                      world: [...(memory.world || [])],
                      plot: [...(memory.plot || [])],
                      dna: memory.dna
                  };
                  saveLocal(getProjectMemoryKey(newId), memory);
                  if (currentProjectData && isMounted.current) onGenerate(currentProjectData); 
                  if (isMounted.current) setIsAutoGenerating(false); 
                  return; 
              }

              if (isMounted.current) setActiveAgentId('lore');
              addLog(`Indexing Chapter ${i+1} arguments & concepts...`);
              const aftermath = await analyzeChapterAftermath(refinedHtml, memory, 'Non-Fiction', ac.signal);
              if (ac.signal.aborted) break;
              
              const merge = (existing: any[], newItems: any[]) => { const existingNames = new Set(existing.map(e => (e.name || '').toLowerCase())); return [...existing, ...newItems.filter(n => n && typeof n.name === 'string' && n.name.trim() !== '' && !existingNames.has(n.name.toLowerCase()))]; };
              memory = { 
                  research: merge(memory.research || [], aftermath.newLore.research || []), 
                  keyFigures: merge(memory.keyFigures || [], aftermath.newLore.keyFigures || []),
                  glossary: merge(memory.glossary || [], aftermath.newLore.glossary || []),
                  concepts: merge(memory.concepts || [], aftermath.newLore.concepts || []),
                  argumentMap: [...(memory.argumentMap || [])],
                  characters: [...(memory.characters || [])],
                  world: [...(memory.world || [])],
                  plot: [...(memory.plot || [])],
                  dna: memory.dna
              };
              saveLocal(getProjectMemoryKey(newId), memory); 
              if (isMounted.current) setProjectMemory(memory);
              
              const newEventSummary = `Chapter ${i+1}: ${aftermath.summary}`;
              // Trim globalSummary to max 2000 chars to prevent unbounded growth
              if (globalSummary.length > 2000) {
                  globalSummary = globalSummary.substring(globalSummary.length - 1500) + `\n${newEventSummary}`;
              } else {
                  globalSummary = globalSummary.length > 5000 ? await compressGlobalSummary(globalSummary, newEventSummary, ac.signal) : globalSummary + `\n${newEventSummary}`;
              }
              
              if (i < filledOutline.length - 1) { 
                  if (isMounted.current) setActiveAgentId('idle'); 
                  await new Promise(resolve => setTimeout(resolve, 1500)); 
              }
          }
          
          if (!ac.signal.aborted && isMounted.current) { 
              const finalProjectData = constructEbookData(newId, memory, filledOutline); 
              if (finalProjectData) { onGenerate(finalProjectData); } 
          }

      } catch (e: any) {
          if (e.message !== "Aborted" && e.message !== "Aborted by user") {
              addLog(`CRITICAL ERROR: ${e.message}`);
              console.error("AutoWrite failed", e);
          } else {
              addLog("Process stopped by user.");
          }
      } finally {
          if (isMounted.current) {
              setIsAutoGenerating(false);
              setIsStopping(false);
              abortControllerRef.current = null;
          }
      }
  };

  const constructEbookData = (id: string, memory: ProjectMemory, currentOutline: OutlineItem[]): EbookData | null => {
      if (!blueprint) return null;
      const pages: string[] = [];
      const finalAuthor = authorName.trim() || "";
      pages.push(`<div class="print-page print-flex-center title-page"><h1>${blueprint.title}</h1><h2 class="italic text-slate-500">${blueprint.subtitle || ''}</h2><div class="mt-8"></div>${finalAuthor ? `<p>By ${finalAuthor}</p>` : ''}</div>`);
      
      currentOutline.forEach((item, index) => { 
          if (item.status === 'completed' && item.generatedPages) { 
              pages.push(...item.generatedPages); 
          } else { 
              const preview = item.sourceContent 
                ? `Chapter Source: ${item.sourceContent.replace(/<[^>]+>/g, '').substring(0, 100)}...`
                : "Chapter waiting to be written...";
              pages.push(`<div class="print-page chapter-start"><h1>Chapter ${index + 1}: ${item.title}</h1><div class="p-4 bg-slate-50 border-l-4 border-brand-50 text-sm text-slate-600 mb-6 italic"><strong>Beat:</strong> ${item.beat}</div><p>${preview}</p></div>`); 
          } 
      });
      return { id: id, title: blueprint.title, author: finalAuthor, lastModified: Date.now(), pages: pages, coverImage: null, frontMatter: { year: new Date().getFullYear().toString(), abstract: blueprint.summary }, blueprint: blueprint, narrativeProfile: profile, outline: currentOutline, status: 'draft' };
  };

  const handleStopAutoWrite = () => { 
      setIsStopping(true); 
      if (abortControllerRef.current) {
          abortControllerRef.current.abort(); // KILL SWITCH
      }
      addLog("USER INTERRUPT: Stopping immediately..."); 
  };

  const handleManualFinalize = async () => {
      if (!blueprint) return;
      setIsFinalizing(true);
      const newId = crypto.randomUUID();
      let memory = projectMemory;
      if ((!memory.research || memory.research.length === 0)) {
          memory = await generateAuthorityBible(blueprint, outline, initialMemory);
      }
      saveLocal(getProjectMemoryKey(newId), memory);
      const finalData = constructEbookData(newId, memory, outline);
      if (finalData && isMounted.current) { onGenerate(finalData); }
      if (isMounted.current) setIsFinalizing(false);
  };

  const normalizeChapters = (items: OutlineItem[]) => items.map((item, idx) => ({ ...item, chapterNumber: idx + 1 }));

  const moveItem = (index: number, direction: 'up' | 'down') => {
      const newOutline = [...outline];
      if (direction === 'up' && index > 0) { [newOutline[index], newOutline[index-1]] = [newOutline[index-1], newOutline[index]]; } 
      else if (direction === 'down' && index < newOutline.length - 1) { [newOutline[index], newOutline[index+1]] = [newOutline[index+1], newOutline[index]]; }
      setOutline(normalizeChapters(newOutline));
  };

  const updateItem = (index: number, field: keyof OutlineItem, value: any) => { const newOutline = [...outline]; newOutline[index] = { ...newOutline[index], [field]: value }; setOutline(newOutline); };
  const deleteItem = (index: number) => { setOutline(normalizeChapters(outline.filter((_, i) => i !== index))); };
  const addItem = () => { const newItem: OutlineItem = { id: crypto.randomUUID(), chapterNumber: outline.length + 1, title: `New Chapter`, beat: "Describe what happens here...", targetWordCount: 2000 }; setOutline([...outline, newItem]); };

  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItemIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); 
      if (draggedItemIndex === null) return;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedItemIndex === null) return;
      if (draggedItemIndex === dropIndex) return;

      const newOutline = [...outline];
      const [draggedItem] = newOutline.splice(draggedItemIndex, 1);
      newOutline.splice(dropIndex, 0, draggedItem);
      
      setOutline(normalizeChapters(newOutline));
      setDraggedItemIndex(null);
  };

  const handleDragEnd = () => {
      setDraggedItemIndex(null);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let value = e.target.value;
      if (value.length > MAX_TOPIC_LENGTH) value = value.slice(0, MAX_TOPIC_LENGTH);
      value = value.replace(/<[^>]*>?/gm, ' ').replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
      setTopic(value);
  };

  const handleCalibrate = async () => {
      if (!sampleText.trim()) return;
      setIsCalibrating(true);
      try { const result = await calibrateStyleFromSample(sampleText); if (result && result.voice && isMounted.current) { setCalibratedStyle(result); setProfile(prev => ({ ...prev, ...result })); setShowCalibration(false); } } catch (e) { const errorMsg = e instanceof Error ? e.message : "Failed to calibrate writing style. Please try again."; console.error("Calibration error:", e); showToast(errorMsg, "error"); } finally { if (isMounted.current) setIsCalibrating(false); }
  };

  const handleMagicWand = async () => {
      if (!topic.trim()) return;
      setIsAnalyzing(true);
      setCustomStatus(null);
      try {
          let dnaContext = "";
          if (calibratedStyle) { 
              dnaContext = `STRICT STYLE ENFORCEMENT: Voice: ${calibratedStyle.voice}`; 
          }
          const enhancedPrompt = `${topic}\n\n${dnaContext}`;
          
          const result = await analyzeTopicAndConfigure(
              enhancedPrompt, 
              'Non-Fiction', 
              "Non-Fiction", 
              undefined, 
              (msg) => setCustomStatus(msg)
          );
          
          if (isMounted.current) { 
              setBlueprint(result); 
              setProfile(prev => ({ ...prev, ...result.profile })); // Merge safely
              setStep('BLUEPRINT'); 
          }
      } catch (e: any) { 
          console.error(e); 
          if (isMounted.current) { 
              showToast(e.message || "Analysis failed. Please try again.", 'error'); 
          } 
      } finally { 
          if (isMounted.current) {
              setIsAnalyzing(false); 
              setCustomStatus(null);
          }
      }
  };

  const handleGenerateOutline = async () => {
      if (!blueprint) return;
      setIsGeneratingOutline(true);
      
      let finalChapterCount = profile.chapterCount;
      if (blueprint.structure?.phases) {
          finalChapterCount = blueprint.structure.phases.reduce((acc, p) => acc + p.chapterCount, 0);
      }

      const updatedBlueprint = { ...blueprint, profile: { ...profile, chapterCount: finalChapterCount } };
      // We don't setBlueprint yet because we are about to enrich it with modes
      
      try { 
          const { outline: items, modes } = await generateProjectOutline(updatedBlueprint, initialMemory); 
          
          if (isMounted.current) { 
              // Enriched Blueprint with newly generated modes
              const finalBlueprint = { ...updatedBlueprint, chapterModes: modes };
              setBlueprint(finalBlueprint);
              
              setOutline(items); 
              setStep('OUTLINE'); 
          } 
      } catch (e: any) { 
          console.error("Outline failed", e); 
          if (isMounted.current) { 
              showToast("Failed to generate outline.", 'error'); 
          } 
      } finally { 
          if (isMounted.current) setIsGeneratingOutline(false); 
      }
  };

  const addLog = (msg: string) => { if (isMounted.current) setSystemLog(prev => [...prev, msg]); };

  if (step === 'IDEA') {
      return (
        <div className="max-w-3xl mx-auto py-12 px-6">
            <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-label mb-4 border border-slate-200">
                    <Sparkles size={12} className="text-primary-500"/> Phase 1: Concept
                 </div>
                 <h1 className="text-display text-slate-900 tracking-tight mb-4">Initialize New Project</h1>
                 <p className="text-body text-slate-500 max-w-lg mx-auto">Configure the foundational parameters. The AI Architect will use this data to construct a comprehensive production blueprint.</p>
            </div>
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative transition-all duration-300">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="text-label text-slate-500 mb-2">Project Type: Non-Fiction (Expert Engine)</div>
                </div>
                <div className="p-2"> <textarea value={topic} onChange={handleTopicChange} maxLength={MAX_TOPIC_LENGTH} placeholder="e.g. A comprehensive guide on urban gardening for beginners, covering soil types..." className="w-full text-xl md:text-2xl p-6 font-medium text-slate-800 placeholder:text-slate-300 outline-none resize-none bg-transparent min-h-[120px]" aria-label="Book Prompt" autoFocus={!topic} /> <div className={`text-micro text-right mt-1 px-4 font-mono transition-colors pb-2 ${topic.length >= MAX_TOPIC_LENGTH ? 'text-red-500 font-bold' : 'text-slate-400'}`}> {topic.length} / {MAX_TOPIC_LENGTH} </div> </div>
                <div className="px-6 pb-6 space-y-4"> 
                    <button onClick={handleMagicWand} disabled={!topic.trim() || isAnalyzing} className="w-full py-4 bg-action-600 hover:bg-action-700 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-action-500/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"> 
                        {isAnalyzing ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} 
                        {isAnalyzing ? (customStatus || ANALYSIS_STEPS[analysisStepIndex]) : 'Generate Blueprint'} 
                    </button> 
                </div>
            </div>
        </div>
      );
  }

  if (step === 'BLUEPRINT' && blueprint) {
      return (
          <div className="max-w-5xl mx-auto py-12 px-6">
              <div className="mb-8"> 
                  <button onClick={() => setStep('IDEA')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-heading mb-4"><ArrowLeft size={16}/> Back to Ideation</button> 
                  <h2 className="text-display text-slate-900">Structural Blueprint</h2> 
                  <p className="text-body text-slate-500">Review the narrative DNA and structure before generating the full outline.</p> 
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6"> 
                  {/* Left Column: Core Identity */}
                  <div className="md:col-span-4 space-y-6"> 
                      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden group"> 
                          <div className="absolute top-0 right-0 p-4 opacity-20"><List size={80}/></div> 
                          <div className="relative z-10"> 
                              <div className="text-label text-slate-400 mb-1">Non-Fiction / {blueprint.genre}</div> 
                              <h3 className="text-2xl font-serif font-bold leading-tight mb-2">{blueprint.title}</h3> 
                              <p className="text-body text-slate-400 italic mb-6">{blueprint.subtitle}</p> 
                              <div className="space-y-3 pt-6 border-t border-slate-800"> 
                                  <div><div className="text-label text-slate-500">Visual Style</div><div className="text-heading text-purple-400">{blueprint.visualStyle}</div></div> 
                                  <div><div className="text-label text-slate-500">Est. Word Count</div><div className="text-heading text-emerald-400">~{(blueprint.profile?.targetWordCount || 0).toLocaleString()}</div></div> 
                              </div> 
                          </div> 
                      </div> 
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"> 
                          <label className="text-label text-slate-500 mb-2 block">Author Name</label> 
                          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. J.K. Rowling" className="w-full p-2 border border-slate-200 rounded-lg text-heading outline-none focus:ring-2 focus:ring-primary-100" /> 
                      </div> 
                  </div> 
                  
                  {/* Right Column: Strategic DNA */}
                  <div className="md:col-span-8 space-y-6"> 
                      
                      {/* Strategic Core */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                          <div className={`flex items-center gap-2 mb-2 ${blueprint.mode === 'Narrative' ? 'text-purple-600' : 'text-primary-600'}`}> 
                              <Target size={20}/> 
                              <h3 className="text-label">Strategic Core ({blueprint.mode || 'Instructional'})</h3> 
                          </div>
                          
                          {blueprint.mode === 'Narrative' ? (
                              <>
                                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                    <div className="text-xs font-bold text-purple-800 uppercase mb-1">Controlling Idea</div>
                                    <p className="text-sm text-purple-900 font-medium italic">"{blueprint.controllingIdea || 'Theme not defined.'}"</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                                        <div className="text-xs font-bold text-purple-700 uppercase mb-1">Curiosity Hook</div>
                                        <p className="text-sm text-slate-800">{blueprint.readerPersona?.intellectualCuriosity || 'Unknown'}</p>
                                    </div>
                                    <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                                        <div className="text-xs font-bold text-purple-700 uppercase mb-1">Emotional Payoff</div>
                                        <p className="text-sm text-slate-800">{blueprint.readerPersona?.emotionalPayoff || 'Unknown'}</p>
                                    </div>
                                </div>
                                {blueprint.readerPersona?.historicalContext && (
                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Historical Context</div>
                                        <p className="text-sm text-slate-800">{blueprint.readerPersona.historicalContext}</p>
                                    </div>
                                )}
                              </>
                          ) : (
                              <>
                                <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl">
                                    <div className="text-xs font-bold text-primary-800 uppercase mb-1">Central Thesis</div>
                                    <p className="text-sm text-primary-900 font-medium italic">"{blueprint.centralThesis || 'Thesis not defined.'}"</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Reader Pain Point</div>
                                        <p className="text-sm text-slate-800">{blueprint.readerPersona?.primaryPainPoint || 'Unknown'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Reader Desire</div>
                                        <p className="text-sm text-slate-800">{blueprint.readerPersona?.desiredOutcome || 'Unknown'}</p>
                                    </div>
                                </div>
                              </>
                          )}
                      </div>

                      {/* Structural DNA - DYNAMIC ARCHITECTURE */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-2 text-indigo-600 mb-4"> <Layers size={20}/> <h3 className="text-label">Structural DNA</h3> </div>
                          
                          {blueprint.structure ? (
                              <div className="space-y-4">
                                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="text-xs font-bold text-indigo-800 uppercase">Archetype</div>
                                      </div>
                                      <div className="font-serif font-bold text-indigo-900 text-lg mb-1">{blueprint.structure.archetype}</div>
                                      <p className="text-xs text-indigo-700 leading-relaxed">{blueprint.structure.description}</p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Phased Roadmap</div>
                                      {blueprint.structure.phases.map((phase, i) => (
                                          <div key={i} className="flex gap-4 p-3 border border-slate-100 rounded-xl bg-slate-50/50 items-center">
                                              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">
                                                  {i + 1}
                                              </div>
                                              <div className="flex-grow">
                                                  <div className="flex justify-between items-center mb-0.5">
                                                      <div className="font-bold text-slate-800 text-sm">{phase.title}</div>
                                                      <div className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{phase.chapterCount} Chaps</div>
                                                  </div>
                                                  <div className="text-xs text-slate-500">{phase.intent}</div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ) : (
                              <div className="text-center py-8 text-slate-400">
                                  <Milestone size={32} className="mx-auto mb-2 opacity-50"/>
                                  <p className="text-sm">Standard Structure (No dynamic architecture generated)</p>
                              </div>
                          )}
                      </div>

                      {/* --- STRUCTURAL PALETTE (Pending) --- */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-80">
                          <div className="flex items-center gap-2 text-slate-400 mb-4"> 
                              <Boxes size={20}/> <h3 className="text-label">Structural Palette</h3> 
                          </div>
                          <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                              <Sparkles size={24} className="text-primary-400 mb-2"/>
                              <p className="text-sm font-bold text-slate-600">Chapter Modes Pending</p>
                              <p className="text-xs text-slate-400 mt-1">
                                  Bespoke chapter archetypes will be generated alongside your outline in the next step.
                              </p>
                          </div>
                      </div>

                      {/* Abstract Editor */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group"> 
                          <div className="flex justify-between items-center mb-3"> 
                              <div className="flex items-center gap-2 text-slate-600"> <FileText size={20}/> <h3 className="text-label">Book Abstract</h3> </div> 
                              <div className="text-label text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"> <Edit3 size={10}/> Editable </div> 
                          </div> 
                          <textarea value={blueprint.summary} onChange={(e) => setBlueprint({...blueprint, summary: e.target.value})} className="w-full text-body leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-primary-200 outline-none resize-none h-32" placeholder="Book summary..." /> 
                      </div> 
                      
                      {/* Voice Settings */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"> 
                          {/* ... existing voice UI */}
                          <div className="flex items-center justify-between mb-4 relative z-10">
                              <div className="flex items-center gap-2 text-slate-600"> <Cpu size={20}/> <h3 className="text-label">Voice DNA</h3> </div>
                              <button onClick={() => setShowCalibration(true)} className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                                  {calibratedStyle ? 'Style Cloned' : 'Clone Style'}
                              </button>
                          </div>
                          <textarea 
                              value={profile.voice} 
                              onChange={(e) => setProfile({...profile, voice: e.target.value})} 
                              className="w-full bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100 outline-none resize-none h-24 mb-2"
                              placeholder="Describe the writing voice (e.g. 'Witty, authoritative, using short sentences')."
                          />
                          <div className="grid grid-cols-2 gap-2">
                              {/* UPGRADE: Flexible Archetype Input */}
                              <input 
                                  type="text"
                                  value={profile.archetype || ''} 
                                  onChange={(e) => setProfile({...profile, archetype: e.target.value})} 
                                  placeholder="Archetype (e.g. The Sage)"
                                  className="bg-slate-50 text-xs border border-slate-100 rounded p-2 outline-none focus:ring-1 focus:ring-primary-200"
                              />
                              
                              <select 
                                  value={profile.pov || 'Second Person'} 
                                  onChange={(e) => setProfile({...profile, pov: e.target.value as any})} 
                                  className="bg-slate-50 text-xs border border-slate-100 rounded p-2 outline-none"
                              >
                                  <option value="First Person">First Person (I)</option>
                                  <option value="Second Person">Second Person (You)</option>
                                  <option value="Third Person Limited">Third Person Limited</option>
                                  <option value="Third Person Omniscient">Third Person Omniscient</option>
                              </select>
                          </div>
                      </div> 
                      
                      <button onClick={handleGenerateOutline} disabled={isGeneratingOutline} className="w-full py-4 bg-action-600 text-white rounded-xl text-heading uppercase tracking-widest shadow-lg shadow-action-500/20 hover:bg-action-700 transition-all flex items-center justify-center gap-2"> {isGeneratingOutline ? <Loader2 className="animate-spin" size={20}/> : <List size={20}/>} {isGeneratingOutline ? 'Architecting Modes & Outline...' : 'Generate Outline'} </button> 
                  </div> 
              </div>
              
              {/* Style Calibration Modal */}
              {showCalibration && (
                  <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                      {/* ... existing modal */}
                      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg text-slate-900">Clone Writing Style</h3>
                              <button onClick={() => setShowCalibration(false)}><X size={20} className="text-slate-400"/></button>
                          </div>
                          <p className="text-sm text-slate-500 mb-4">
                              Paste a sample of your writing. The AI will analyze your sentence structure, vocabulary, and tone to create a custom Voice DNA.
                          </p>
                          <textarea 
                              value={sampleText} 
                              onChange={(e) => setSampleText(e.target.value)} 
                              className="w-full h-48 p-4 border border-slate-200 rounded-xl text-sm mb-4 resize-none focus:ring-2 focus:ring-primary-200 outline-none bg-slate-50" 
                              placeholder="Paste text here..." 
                          />
                          <button 
                              onClick={handleCalibrate} 
                              disabled={isCalibrating || !sampleText.trim()} 
                              className="w-full py-3 bg-action-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-action-700 transition-colors"
                          >
                              {isCalibrating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} 
                              Analyze & Apply Style
                          </button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  if (step === 'OUTLINE') {
      return (
          <div className="max-w-5xl mx-auto py-12 px-6 relative">
              <AutoPilotModal 
                  isOpen={isAutoGenerating}
                  currentChapterIndex={autoGenCurrentIndex}
                  totalChapters={outline.length}
                  currentTitle={outline[autoGenCurrentIndex]?.title || ''}
                  streamLog={streamLog}
                  systemLog={systemLog}
                  liveSources={autoGenSources}
                  onStop={handleStopAutoWrite}
                  isStopping={isStopping}
                  blueprint={blueprint}
                  activeAgentId={activeAgentId}
              />
              
              {showContextStudio && (
                  <div className="fixed inset-0 z-50 flex flex-col bg-white">
                      <ResearchStudio 
                          isEmbedded 
                          initialMemory={projectMemory}
                          onMemoryUpdate={(newMem) => setProjectMemory(newMem)}
                          onClose={() => setShowContextStudio(false)} 
                      />
                  </div>
              )}

              <div className="flex justify-between items-center mb-8">
                  <div>
                      <h2 className="text-display text-slate-900">
                          Chapter Outline
                      </h2>
                      <p className="text-body text-slate-500">
                          Drag to reorder. Attach surgical context to specific chapters using the paperclip icon.
                      </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                          <button onClick={addItem} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-label text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"> <Plus size={14}/> Add </button>
                          <button onClick={() => setShowContextStudio(true)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-label text-slate-500 hover:text-indigo-600 hover:border-indigo-200 flex items-center gap-2 transition-colors"> 
                              <Database size={14}/> 
                              Knowledge Vault
                          </button>
                      </div>
                      
                      <div className="flex items-center gap-3">
                          <button onClick={handleManualFinalize} disabled={isFinalizing || isAutoGenerating} className="text-label text-slate-400 hover:text-slate-600 underline decoration-slate-300 hover:decoration-slate-500 transition-all mr-2">
                              Skip to Editor (Manual)
                          </button>

                          <button onClick={() => handleAutoWrite(true)} disabled={isFinalizing || isAutoGenerating} className="px-4 py-2 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl text-heading hover:border-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2">
                              <Play size={16} fill="currentColor" className="opacity-50"/> Test Chapter 1
                          </button>

                          <button onClick={() => handleAutoWrite(false)} disabled={isFinalizing || isAutoGenerating} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-heading hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 animate-pulse-slow">
                              <Zap size={16} fill="currentColor"/> Start Auto-Drafting
                          </button>
                      </div>
                  </div>
              </div>

              <div className="space-y-3">
                  {outline.map((item, idx) => (
                      <OutlineItemCard 
                        key={item.id} 
                        item={item} 
                        idx={idx} 
                        total={outline.length} 
                        moveItem={moveItem} 
                        updateItem={updateItem} 
                        deleteItem={deleteItem}
                        blueprintType={blueprint?.type || 'Non-Fiction'}
                        isPlanning={planningChapterId === item.id}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedItemIndex === idx}
                        availableModes={blueprint?.chapterModes}
                      />
                  ))}
              </div>
          </div>
      );
  }

  return null;
};

export default InputForm;
