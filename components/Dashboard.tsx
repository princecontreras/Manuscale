
"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Plus, BookOpen, Trash2, FileText, ChevronRight, PenTool, AlertTriangle, CheckCircle2, Search, Share2, X, Download, Copy, Check, Image as ImageIcon, Twitter, Linkedin, Sparkles, Wand2, Bot, GraduationCap, ChevronDown, ChevronUp, Loader2, Upload, Settings, ShoppingCart, List, FileUp, Package, Database, RefreshCw, Zap, Clock } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import { useToast } from './ToastContext';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { ConfirmationModal } from './ConfirmationModal';
import { ProjectMetadata, EbookData } from '../types';
import { deleteProject, syncProjectIndex, loadProject, saveProject, logActivity } from '../services/storage';
import { ProfileDropdown } from './ProfileDropdown';

export interface DashboardProps {
  onOpenProject: (id: string) => void;
  onCreateNew: (mode?: string) => void;
  onOpenRemixEngine: () => void;
  onOpenResearchStudio: () => void;
  onOpenAgent: () => void;
  onExit: () => void;
  onViewProfile: () => void;
}

type SortOption = 'newest' | 'oldest' | 'az' | 'za';
type FilterOption = 'all' | 'draft' | 'published';

const ProjectSkeleton = () => (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm h-[320px] flex flex-col animate-pulse">
        <div className="aspect-[2/3] bg-slate-100 rounded-lg mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
    </div>
);

const MarketingModal: React.FC<{ data: EbookData, onClose: () => void }> = ({ data, onClose }) => {
    if (!data.marketing) return null;
    const { marketing } = data;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-900">Marketing Kit</h3>
                    <Button variant="ghost" size="sm" onClick={onClose}><X size={20} /></Button>
                </div>
                <div className="flex-grow overflow-y-auto p-8 space-y-8">
                    <section>
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Book Blurb</h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {marketing.blurb}
                        </div>
                    </section>
                    <section>
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Social Media Posts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {marketing.socialPosts.map((post, i) => (
                                <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-primary-600 uppercase">
                                        {post.platform.includes('Twitter') ? <Twitter size={14}/> : post.platform.includes('LinkedIn') ? <Linkedin size={14}/> : <Share2 size={14}/>}
                                        {post.platform}
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{post.content}</p>
                                    <Button variant="neutral" size="sm" onClick={() => navigator.clipboard.writeText(post.content)} className="mt-3"><Copy size={12}/> Copy</Button>
                                </div>
                            ))}
                        </div>
                    </section>
                    {/* DEFENSIVE CHECK: Ensure aPlusContent is an array */}
                    {marketing.aPlusContent && Array.isArray(marketing.aPlusContent) && (
                        <section>
                            <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Amazon A+ Content Strategy</h4>
                            <div className="space-y-4">
                                {marketing.aPlusContent.map((module, i) => (
                                    <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                        <div className="font-bold text-slate-800 mb-1">{module.headline}</div>
                                        <p className="text-sm text-slate-600 mb-2">{module.body}</p>
                                        <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-200 flex gap-2 items-start">
                                            <ImageIcon size={14} className="shrink-0 mt-0.5"/>
                                            <span className="italic">Image Prompt: {module.imagePrompt}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

const ApiSettingsModal: React.FC<{ onClose: () => void, onExit: () => void }> = ({ onClose, onExit }) => {
    const [saved, setSaved] = useState(false);

    const handleDownloadLogo = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const startX = 200;
            const baselineY = 300;

            // Draw "Manu" (Serif Italic)
            ctx.font = "italic 500 200px 'Merriweather', serif";
            ctx.fillStyle = "#64748b"; // Slate 500
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.fillText("Manu", startX, baselineY);

            // Measure first part to position second part
            const manuWidth = ctx.measureText("Manu").width;

            // Draw "scale" (Sans Bold)
            ctx.font = "900 200px 'Inter', sans-serif";
            ctx.fillStyle = "#0f172a"; // Slate 900
            // Tight tracking simulation
            if ('letterSpacing' in ctx) { (ctx as any).letterSpacing = "-10px"; }
            ctx.fillText("scale", startX + manuWidth, baselineY);
            
            // Measure scale
            if ('letterSpacing' in ctx) { (ctx as any).letterSpacing = "0px"; }
            const scaleWidth = ctx.measureText("scale").width;

            // Draw Dot (Brand Color)
            ctx.fillStyle = "#d97706"; // Brand 600
            ctx.beginPath();
            // A square dot looks more technical
            ctx.rect(startX + manuWidth + scaleWidth - 10, baselineY - 30, 30, 30);
            ctx.fill();

            // Note: Subtitle removed per request

            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'Manuscale_Brand_Logo.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-900">Settings</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                            <Package size={20}/>
                        </div>
                        <div>
                            <h3 className="text-title text-slate-900">Brand Assets</h3>
                            <p className="text-label text-slate-500">Official logos and marks</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center mb-6">
                        <div className="mb-4 scale-150"><Logo /></div>
                        <Button variant="neutral" size="sm" onClick={handleDownloadLogo} className="gap-2"><Download size={14}/> Download Logo</Button>
                    </div>
                    <p className="text-xs text-slate-400 text-center">Manuscale</p>
                    <div className="flex justify-end mt-6">
                        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ onOpenProject, onCreateNew, onOpenRemixEngine, onOpenResearchStudio, onOpenAgent, onExit, onViewProfile }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [marketingModalData, setMarketingModalData] = useState<EbookData | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [filterOption, setFilterOption] = useState<FilterOption>('all');
    const [showStudioOptions, setShowStudioOptions] = useState(false);
    const [showKnowledgeOptions, setShowKnowledgeOptions] = useState(false);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;
        
        const initDashboard = async () => {
            setIsLoading(true);
            try {
                const syncedIndex = await syncProjectIndex();
                if (isMounted) setProjects(syncedIndex);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : "Failed to load projects. Please refresh the page.";
                console.error("Dashboard initialization failed:", e);
                showToast(errorMessage, "error");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initDashboard();
        
        return () => { isMounted = false; };
    }, []);

    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const executeDelete = async () => {
        if (deleteId) {
            try {
                const deletedProject = projects.find(p => p.id === deleteId);
                await deleteProject(deleteId);
                setProjects(prev => prev.filter(p => p.id !== deleteId));
                setDeleteId(null);
                showToast("Project deleted successfully.", "success");
                logActivity('delete_project', deletedProject?.title || deleteId);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : "Failed to delete project. Please try again.";
                console.error("Delete error:", e);
                showToast(errorMessage, "error");
            }
        }
    };

    const handleOpenMarketing = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const data = await loadProject(id);
        if (data && data.marketing) {
            setMarketingModalData(data);
        } else {
            showToast("No marketing assets found. Please publish this project first.", 'info');
        }
    };

    const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.id && json.title) {
                    const newProject = { ...json, id: crypto.randomUUID(), lastModified: Date.now() };
                    await saveProject(newProject);
                    const synced = await syncProjectIndex();
                    setProjects(synced);
                    showToast("Project imported successfully!", 'success');
                } else {
                    showToast("Invalid project file. Please ensure it's a valid Manuscale project file.", 'error');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to import project. File may be corrupted or invalid.";
                console.error("Project import error:", err);
                showToast(errorMessage, 'error');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filteredProjects = projects
        .filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (p.author && p.author.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesFilter = filterOption === 'all' || p.status === filterOption || (filterOption === 'draft' && !p.status);
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            if (sortOption === 'newest') return b.lastModified - a.lastModified;
            if (sortOption === 'oldest') return a.lastModified - b.lastModified;
            if (sortOption === 'az') return a.title.localeCompare(b.title);
            if (sortOption === 'za') return b.title.localeCompare(a.title);
            return 0;
        });

    const [activeTab, setActiveTab] = useState<'projects' | 'profile'>('projects');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        onExit();
    };

    return (
        <div className="max-w-7xl mx-auto py-6 sm:py-12 px-4 sm:px-6 relative">
            {/* Header / Brand */}
            <div className="flex items-center mb-8 sm:mb-12">
                <Logo />
            </div>

            <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-1">Publishing Studio</h1>
                            <p className="text-xs sm:text-sm text-slate-500">Your private space for high-value publishing.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => {}}
                                className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-900 text-white"
                            >
                                Projects
                            </button>
                            <ProfileDropdown onViewProfile={onViewProfile} onLogout={() => setShowLogoutConfirm(true)} />
                            <button 
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                            >
                                <Settings size={14}/> Settings
                            </button>

                            <button 
                                onClick={() => setShowGuide(!showGuide)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${showGuide ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                <GraduationCap size={14} /> Guide
                                {showGuide ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                        </div>
                    </div>

            {/* Guide Section */}
            {showGuide && (
                <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 mb-8 sm:mb-12 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-primary-500 p-2 rounded-lg text-white shadow-lg shadow-primary-500/20">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-heading font-bold text-white">Publishing Workflows</h2>
                                <p className="text-sm text-slate-400">Choose your path to high-value non-fiction publishing.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-primary-500/20 text-primary-400 rounded-lg flex items-center justify-center">
                                        <PenTool size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Manuscript Workshop</h3>
                                </div>
                                <ul className="space-y-3 text-sm text-slate-300">
                                    <li className="flex gap-2">
                                        <CheckCircle2 size={16} className="text-primary-400 shrink-0 mt-0.5" />
                                        <span><strong>Guided Setup:</strong> Define your topic and target audience.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 size={16} className="text-primary-400 shrink-0 mt-0.5" />
                                        <span><strong>Logic Flow:</strong> Review and refine the AI-generated structural plan.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 size={16} className="text-primary-400 shrink-0 mt-0.5" />
                                        <span><strong>Interactive Writing:</strong> Draft chapters one-by-one with full control.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                                        <Zap size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Autonomous Publishing Engine</h3>
                                </div>
                                <ul className="space-y-3 text-sm text-slate-300">
                                    <li className="flex gap-2">
                                        <CheckCircle2 size={16} className="text-primary-400 shrink-0 mt-0.5" />
                                        <span><strong>Autonomous Agents:</strong> Set a goal and let the agents take over.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 size={16} className="text-primary-400 shrink-0 mt-0.5" />
                                        <span><strong>Recursive Production:</strong> Agents research, plan, and write the entire book.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle2 size={16} className="text-primary-400 shrink-0 mt-0.5" />
                                        <span><strong>Hands-Free Publishing:</strong> Get a complete draft ready for export.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HERO CARDS - The New "Two Paths" Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="flex flex-col gap-6">
                    <button
                        onClick={() => setShowStudioOptions(!showStudioOptions)}
                        className={`group relative overflow-hidden bg-white p-8 rounded-3xl border shadow-xl text-left transition-all h-full ${showStudioOptions ? 'border-slate-900 ring-2 ring-slate-900/5' : 'border-slate-200 hover:border-slate-900 hover:shadow-2xl'}`}
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <PenTool size={120} />
                        </div>
                        <div className="w-14 h-14 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                            <PenTool size={28} />
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-slate-900 mb-2">Manuscript Workshop</h3>
                        <p className="text-slate-500 mb-6 max-w-sm text-sm">The interactive workshop. Choose how you want to build your knowledge asset.</p>
                        <div className="mt-auto">
                            <span className="inline-flex items-center gap-2 font-bold text-slate-900 text-sm">
                                {showStudioOptions ? 'Select an option below' : 'Enter Studio'} 
                                {showStudioOptions ? <ChevronUp size={16}/> : <ChevronRight size={16}/>}
                            </span>
                        </div>
                    </button>

                    {/* STUDIO OPTIONS SUB-MENU */}
                    {showStudioOptions && (
                        <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <button 
                                onClick={() => onCreateNew('WIZARD')}
                                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
                            >
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Topic or Idea</div>
                                    <div className="text-xs text-slate-500">Start from a simple concept and let AI research and outline it.</div>
                                </div>
                            </button>
                            <button 
                                onClick={() => setShowKnowledgeOptions(!showKnowledgeOptions)}
                                className={`flex items-center gap-4 p-4 bg-white border rounded-2xl transition-all text-left group ${showKnowledgeOptions ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showKnowledgeOptions ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'}`}>
                                    <Database size={20} />
                                </div>
                                <div className="flex-grow">
                                    <div className="text-sm font-bold text-slate-900">The Knowledge Engine</div>
                                    <div className="text-xs text-slate-500">Grounded Studio: Build from proprietary data or existing content.</div>
                                </div>
                                {showKnowledgeOptions ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                            </button>

                            {showKnowledgeOptions && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <button 
                                        onClick={onOpenResearchStudio}
                                        className="flex flex-col gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <FileUp size={16} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">Specific Knowledge</div>
                                            <div className="text-[10px] text-slate-500 leading-tight">Upload facts and raw data.</div>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={onOpenRemixEngine}
                                        className="flex flex-col gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                            <RefreshCw size={16} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">Existing Sources</div>
                                            <div className="text-[10px] text-slate-500 leading-tight">Remix notes and blog posts.</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={onOpenAgent}
                    className="group relative overflow-hidden bg-primary-600 p-8 rounded-3xl border border-primary-700 shadow-xl text-left hover:border-white/50 hover:shadow-primary-900/20 transition-all h-full"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-white group-hover:opacity-10 transition-opacity">
                        <Bot size={120} />
                    </div>
                    <div className="w-14 h-14 bg-primary-700 text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform border border-primary-500">
                        <Zap size={28} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-heading font-bold text-white">Autonomous Publishing Engine</h3>
                        <span className="bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">AGENTIC</span>
                    </div>
                    <p className="text-primary-50 mb-6 max-w-sm text-sm">The autonomous engine. Give it a goal and walk away. It <strong className="text-white">independently</strong> researches, plans, and writes the entire book recursively.</p>
                    <div className="mt-auto">
                        <span className="inline-flex items-center gap-2 font-bold text-white text-sm group-hover:underline">Launch Agent <ChevronRight size={16}/></span>
                    </div>
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-6 sm:mb-8 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search assets..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary-100 rounded-lg outline-none text-sm transition-all"
                    />
                </div>
                
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setFilterOption('all')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterOption === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>All</button>
                        <button onClick={() => setFilterOption('draft')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterOption === 'draft' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Drafts</button>
                        <button onClick={() => setFilterOption('published')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterOption === 'published' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Published</button>
                    </div>
                    <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="bg-slate-50 border-transparent hover:bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 outline-none cursor-pointer">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="az">A-Z</option>
                        <option value="za">Z-A</option>
                    </select>
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
                    {[1, 2, 3, 4].map((i) => (<ProjectSkeleton key={i} />))}
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-16 text-center flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6"><BookOpen size={40} /></div>
                    <h3 className="text-title text-slate-900 mb-2">No products yet</h3>
                    <p className="text-body text-slate-500 max-w-md mx-auto mb-8">Start your journey as a digital creator. Create your first book product using the Studio above.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
                    {/* Removed "Create New Product" tile as per new design */}
                    {filteredProjects.map((project) => (
                        <div key={project.id} onClick={() => onOpenProject(project.id)} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer group hover:shadow-xl hover:border-primary-200 hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300 flex flex-col h-full relative">
                            <div className="aspect-[2/3] bg-slate-100 relative overflow-hidden border-b border-slate-100 group-image-container">
                                {project.coverImage ? (
                                    <>
                                        <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.querySelector('.fallback-cover')?.classList.remove('hidden'); }} />
                                        <div className="fallback-cover hidden w-full h-full flex flex-col items-center justify-center text-slate-300 p-6 text-center bg-slate-50 absolute inset-0"><BookOpen size={48} className="mb-4 opacity-50" /><span className="text-label opacity-50">Image Error</span></div>
                                    </>
                                ) : (<div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-6 text-center bg-slate-50"><BookOpen size={48} className="mb-4 opacity-50" /><span className="text-label opacity-50">No Cover</span></div>)}
                                <div className="absolute top-3 right-3 z-10">{project.status === 'published' ? (<span className="bg-emerald-500 text-white text-micro font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 animate-in fade-in zoom-in"><CheckCircle2 size={10} /> Published</span>) : (<span className="bg-slate-900/50 backdrop-blur-sm text-white text-micro font-bold px-2 py-1 rounded-full shadow-md">Draft</span>)}</div>
                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-2"><button className="bg-white text-primary-600 px-4 py-2 rounded-full text-heading transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg flex items-center gap-2"><PenTool size={14} /> Open Studio</button></div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="text-title text-slate-900 line-clamp-2 leading-tight mb-2 group-hover:text-primary-600 transition-colors" title={project.title}>{project.title}</h3>
                                {project.author && <p className="text-body text-slate-500 mb-4">by {project.author}</p>}
                                <div className="mt-auto space-y-3 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2 text-micro text-slate-400"><Clock size={12} /><span>Edited {formatDate(project.lastModified)}</span></div>
                                    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-micro font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md"><FileText size={12} /><span>{project.wordCount ? project.wordCount.toLocaleString() : 0} words</span></div><div className="flex items-center gap-1">{project.status === 'published' && (<button onClick={(e) => handleOpenMarketing(e, project.id)} className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-1.5 rounded transition-colors"><Share2 size={16} /></button>)}<button type="button" onClick={(e) => confirmDelete(e, project.id)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button></div></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>

            {showLogoutConfirm && (
                <ConfirmationModal
                    isOpen={showLogoutConfirm}
                    onCancel={() => setShowLogoutConfirm(false)}
                    onConfirm={handleLogout}
                    title="Logout"
                    message="Are you sure you want to log out?"
                />
            )}
            {deleteId && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"><div className="bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className="p-6 text-center"><div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} /></div><h3 className="text-title text-slate-900 mb-2">Delete this product?</h3><p className="text-body text-slate-500">This action cannot be undone. All content, assets, and settings will be lost.</p></div><div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-heading text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button><button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl text-heading text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md">Yes, Delete</button></div></div></div>)}
            {marketingModalData && (<MarketingModal data={marketingModalData} onClose={() => setMarketingModalData(null)} />)}
            {showSettings && (<ApiSettingsModal onClose={() => setShowSettings(false)} onExit={onExit} />)}
        </div>
    );
};

export default Dashboard;
