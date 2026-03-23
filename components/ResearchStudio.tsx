
"use client";
import React, { useState, useEffect } from 'react';
import { 
    Search, Plus, X, Trash2, Globe, ArrowLeft, Loader2, 
    FileText, CheckCircle2, Copy, BrainCircuit, Database, CheckSquare, Square, Users, Book
} from 'lucide-react';
import { 
    performResearch, 
    synthesizeBlueprintFromMemory 
} from '../services/aiClient';
import { loadLocal, getProjectMemoryKey, saveLocal, loadProject } from '../services/storage';
import { ProjectMemory, MemoryBankItem, ProjectBlueprint } from '../types';

import { useToast } from './ToastContext';

interface ResearchStudioProps {
  projectId?: string;
  onCreateProject?: (blueprint: ProjectBlueprint, memory: ProjectMemory) => void;
  initialMemory?: ProjectMemory; 
  onMemoryUpdate?: (memory: ProjectMemory) => void;
  onClose?: () => void;
  onBack?: () => void;
  isEmbedded?: boolean;
}

interface FactCard {
    id: string;
    content: string;
    source: string;
    url?: string;
    isPinned: boolean;
}

type TabType = 'knowledge' | 'entities' | 'glossary';

const DRAFT_KEY = 'manuscript_research_draft';

const CurationModal: React.FC<{
    memory: ProjectMemory;
    onClose: () => void;
    onConfirm: (thesis: string, selectedIds: string[]) => void;
    isLoading: boolean;
}> = ({ memory, onClose, onConfirm, isLoading }) => {
    const [thesis, setThesis] = useState("");
    const allItems = [
        ...memory.research, 
        ...memory.keyFigures, 
        ...memory.glossary
    ];
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(allItems.map(i => i.id)));

    const toggleId = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><BrainCircuit size={20} className="text-amber-600"/> Curate Project Context</h3>
                        <p className="text-xs text-neutral-dark/60">Select verified knowledge to ground the AI.</p>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Core Thesis / Book Goal</label>
                        <textarea 
                            value={thesis}
                            onChange={(e) => setThesis(e.target.value)}
                            placeholder="e.g. 'A comprehensive guide on sustainable coffee farming for beginners.'"
                            className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 outline-none resize-none h-24"
                            autoFocus
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Knowledge Assets</label>
                            <span className="text-xs text-slate-400">{selectedIds.size} / {allItems.length} selected</span>
                        </div>
                        <div className="space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50 max-h-60 overflow-y-auto">
                            {allItems.map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => toggleId(item.id)}
                                    className={`p-3 rounded-lg flex items-start gap-3 cursor-pointer transition-colors border ${selectedIds.has(item.id) ? 'bg-white border-amber-200' : 'bg-transparent border-transparent hover:bg-slate-100'}`}
                                >
                                    <div className={`mt-0.5 ${selectedIds.has(item.id) ? 'text-amber-600' : 'text-slate-300'}`}>
                                        {selectedIds.has(item.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                    </div>
                                    <div className="text-sm text-slate-700 leading-snug">
                                        <div className="font-bold mb-0.5 flex items-center gap-2">
                                            {item.category === 'KeyFigure' && <Users size={12}/>}
                                            {item.category === 'Term' && <Book size={12}/>}
                                            {item.name}
                                        </div>
                                        <div className="text-xs text-slate-500 line-clamp-1">{item.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                    <button 
                        onClick={() => onConfirm(thesis, Array.from(selectedIds))}
                        disabled={isLoading || selectedIds.size === 0}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin"/> : <BrainCircuit size={16}/>}
                        Generate Blueprint
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResearchStudio: React.FC<ResearchStudioProps> = ({ 
    projectId, onCreateProject, initialMemory, onMemoryUpdate, onClose, onBack, isEmbedded = false 
}) => {
    const { showToast } = useToast();
    const [memory, setMemory] = useState<ProjectMemory>(initialMemory || { research: [], keyFigures: [], glossary: [], concepts: [], characters: [], world: [], plot: [] });
    const [activeTab, setActiveTab] = useState<TabType>('knowledge');
    const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Research State
    const [searchQuery, setSearchQuery] = useState('');
    const [foundFacts, setFoundFacts] = useState<FactCard[]>([]);

    // Curation State
    const [showCurationModal, setShowCurationModal] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (projectId) {
                const mem = await loadLocal(getProjectMemoryKey(projectId), { research: [], keyFigures: [], glossary: [], concepts: [], characters: [], world: [], plot: [] });
                setMemory(mem);
                setIsLoaded(true);
            } else if (initialMemory) {
                setMemory(initialMemory);
                setIsLoaded(true);
            } else {
                // Standalone Mode: Load Draft
                const draft = await loadLocal(DRAFT_KEY, null);
                if (draft) setMemory(draft);
                setIsLoaded(true);
            }
        };
        init();
    }, [projectId, initialMemory]);

    useEffect(() => {
        if (!isLoaded) return; // Prevent overwriting DB with empty state before load

        if (projectId) {
            saveLocal(getProjectMemoryKey(projectId), memory);
        } else if (isEmbedded && onMemoryUpdate) {
            onMemoryUpdate(memory);
        } else {
            // Standalone Mode: Save Draft
            saveLocal(DRAFT_KEY, memory);
        }
    }, [memory, projectId, isEmbedded, onMemoryUpdate, isLoaded]);

    const createEntity = () => {
        const newId = crypto.randomUUID();
        let newItem: MemoryBankItem = { id: newId, name: 'Untitled', description: '' };
        
        if (activeTab === 'knowledge') {
            newItem.name = 'New Topic';
            newItem.category = 'Research';
            setMemory(prev => ({ ...prev, research: [...prev.research, newItem] }));
        } else if (activeTab === 'entities') {
            newItem.name = 'New Entity';
            newItem.category = 'KeyFigure';
            setMemory(prev => ({ ...prev, keyFigures: [...prev.keyFigures, newItem] }));
        } else {
            newItem.name = 'New Term';
            newItem.category = 'Term';
            setMemory(prev => ({ ...prev, glossary: [...prev.glossary, newItem] }));
        }

        setActiveEntityId(newId);
        setFoundFacts([]);
    };

    const deleteEntity = (id: string) => {
        if (activeTab === 'knowledge') {
            setMemory(prev => ({ ...prev, research: prev.research.filter(i => i.id !== id) }));
        } else if (activeTab === 'entities') {
            setMemory(prev => ({ ...prev, keyFigures: prev.keyFigures.filter(i => i.id !== id) }));
        } else {
            setMemory(prev => ({ ...prev, glossary: prev.glossary.filter(i => i.id !== id) }));
        }
        if (activeEntityId === id) setActiveEntityId(null);
    };

    const getActiveList = () => {
        if (activeTab === 'knowledge') return memory.research;
        if (activeTab === 'entities') return memory.keyFigures;
        return memory.glossary;
    };

    const getActiveItem = () => {
        if (!activeEntityId) return null;
        return getActiveList().find(i => i.id === activeEntityId);
    };

    const updateActiveItem = (updates: Partial<MemoryBankItem>) => {
        if (!activeEntityId) return;
        const updater = (list: MemoryBankItem[]) => list.map(r => r.id === activeEntityId ? { ...r, ...updates } : r);
        
        if (activeTab === 'knowledge') setMemory(prev => ({ ...prev, research: updater(prev.research) }));
        else if (activeTab === 'entities') setMemory(prev => ({ ...prev, keyFigures: updater(prev.keyFigures) }));
        else setMemory(prev => ({ ...prev, glossary: updater(prev.glossary) }));
    };

    const handleResearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const { facts, sources } = await performResearch(searchQuery);
            
            const newCards: FactCard[] = facts.map(f => {
                const cleanText = f.replace(/^[\*\-]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
                return {
                    id: crypto.randomUUID(),
                    content: cleanText,
                    source: sources.find(s => s.uri && f.includes(s.title))?.title || 'Web Source',
                    url: sources.find(s => s.uri)?.uri,
                    isPinned: false
                };
            });
            
            setFoundFacts(newCards);
            
            // Auto-rename if titled "Untitled"
            const item = getActiveItem();
            if (item && item.name.includes('Untitled')) {
                updateActiveItem({ name: searchQuery });
            }

        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "Failed to search and add facts. Please try again.";
            console.error("Research error:", e);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    const pinFact = (card: FactCard) => {
        const item = getActiveItem();
        if (!item) return;

        const currentFacts = item.description || "";
        const newFactEntry = `• ${card.content} [${card.source}]`;
        
        let newDescription = currentFacts;
        
        if (!currentFacts.trim()) {
            newDescription = newFactEntry;
        } else if (!currentFacts.includes(card.content)) {
            const separator = currentFacts.endsWith('\n') ? '' : '\n\n';
            newDescription = currentFacts + separator + newFactEntry;
        }
        
        updateActiveItem({ description: newDescription });
        setFoundFacts(prev => prev.map(f => f.id === card.id ? { ...f, isPinned: true } : f));
    };

    const confirmCrystallization = async (thesis: string, selectedIds: string[]) => {
        if (!onCreateProject) return;
        setLoading(true);
        try {
            const filteredMemory: ProjectMemory = {
                research: memory.research.filter(item => selectedIds.includes(item.id)),
                keyFigures: memory.keyFigures.filter(item => selectedIds.includes(item.id)),
                glossary: memory.glossary.filter(item => selectedIds.includes(item.id)),
                concepts: memory.concepts.filter(item => selectedIds.includes(item.id)),
                characters: [],
                world: [],
                plot: []
            };

            const blueprint = await synthesizeBlueprintFromMemory(filteredMemory, thesis);
            if (blueprint) {
                blueprint.type = 'Non-Fiction';
                // Clean draft before transitioning
                saveLocal(DRAFT_KEY, { research: [], keyFigures: [], glossary: [], concepts: [], characters: [], world: [], plot: [] });
                onCreateProject(blueprint, filteredMemory);
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "Failed to curate research and create blueprint. Please try again.";
            console.error("Curation error:", e);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
            setShowCurationModal(false);
        }
    };

    const activeItem = getActiveItem();
    const totalAssets = memory.research.length + memory.keyFigures.length + memory.glossary.length;

    const [showMobileSidebar, setShowMobileSidebar] = React.useState(false);

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-white font-sans overflow-hidden selection:bg-amber-100 selection:text-amber-900">
            {showCurationModal && (
                <CurationModal 
                    memory={memory} 
                    onClose={() => setShowCurationModal(false)}
                    onConfirm={confirmCrystallization}
                    isLoading={loading}
                />
            )}

            {/* Mobile sidebar toggle */}
            <div className="md:hidden flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
                <button onClick={onBack || onClose} className="text-slate-400 hover:text-slate-900 p-2 rounded hover:bg-slate-100">
                    <ArrowLeft size={18}/>
                </button>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Database size={12}/> Knowledge Vault
                </span>
                <button onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="text-slate-500 p-2 rounded hover:bg-slate-100">
                    {showMobileSidebar ? <X size={18}/> : <Search size={18}/>}
                </button>
            </div>

            {/* 1. NAVIGATION SIDEBAR */}
            <div className={`${showMobileSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-slate-50 border-r border-slate-200 flex-col z-20 flex-shrink-0 ${showMobileSidebar ? 'absolute inset-0 top-[52px] z-30' : ''}`}>
                <div className="hidden md:flex p-4 border-b border-slate-100 justify-between items-center bg-slate-50">
                    <button onClick={onBack || onClose} className="text-slate-400 hover:text-slate-900 transition-colors p-1 -ml-1 rounded hover:bg-slate-100" title="Back">
                        <ArrowLeft size={18}/>
                    </button>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Database size={12}/> Knowledge Vault
                    </span>
                </div>

                <div className="flex gap-1 p-2 border-b border-slate-100">
                    <button onClick={() => { setActiveTab('knowledge'); setActiveEntityId(null); }} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${activeTab === 'knowledge' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-400'}`}>Knowledge</button>
                    <button onClick={() => { setActiveTab('entities'); setActiveEntityId(null); }} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${activeTab === 'entities' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400'}`}>Entities</button>
                    <button onClick={() => { setActiveTab('glossary'); setActiveEntityId(null); }} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${activeTab === 'glossary' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Glossary</button>
                </div>

                <div className="flex-grow overflow-y-auto p-2 space-y-1">
                    {getActiveList().map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => { setActiveEntityId(item.id); setFoundFacts([]); }}
                            className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${activeEntityId === item.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <span className="truncate flex-grow">{item.name}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteEntity(item.id); }} 
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"
                            >
                                <Trash2 size={12}/>
                            </button>
                        </div>
                    ))}
                    
                    <button onClick={createEntity} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 hover:border-slate-400 mt-2 flex items-center justify-center gap-1">
                        <Plus size={12}/> Add {activeTab === 'knowledge' ? 'Topic' : activeTab === 'entities' ? 'Entity' : 'Term'}
                    </button>
                </div>

                {/* Footer Action */}
                {!isEmbedded && totalAssets > 0 && (
                    <div className="p-3 border-t border-slate-200">
                        <button 
                            onClick={() => setShowCurationModal(true)}
                            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <BrainCircuit size={14}/> Create Project
                        </button>
                    </div>
                )}
            </div>

            {/* 2. MAIN DOCUMENT WORKSPACE */}
            <div className="flex-grow flex flex-col h-full overflow-hidden bg-white relative">
                {activeItem ? (
                    <div className="flex-grow flex flex-col h-full w-full">
                        
                        {/* DOCUMENT HEADER */}
                        <div className="pt-10 px-8 lg:px-12 pb-2 flex-shrink-0">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{activeTab === 'entities' ? 'Key Entity / Actor' : activeTab === 'glossary' ? 'Terminology / Jargon' : 'Knowledge Item'}</div>
                            <input 
                                value={activeItem.name}
                                onChange={(e) => updateActiveItem({ name: e.target.value })}
                                className="text-3xl font-serif font-bold text-slate-900 placeholder-slate-300 outline-none bg-transparent w-full"
                                placeholder="Untitled"
                            />
                            <div className="h-px w-full bg-slate-100 mt-6"></div>
                        </div>

                        {/* WORKSPACE SPLIT VIEW */}
                        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
                            
                            {/* LEFT: EDITOR */}
                            <div className="flex-grow flex flex-col h-full relative group">
                                <div className="absolute top-2 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] uppercase font-bold text-slate-300 bg-white px-2 py-1 rounded border border-slate-100">Content</span>
                                </div>
                                <textarea 
                                    value={activeItem.description}
                                    onChange={(e) => updateActiveItem({ description: e.target.value })}
                                    className="flex-grow w-full resize-none outline-none text-lg text-slate-700 leading-relaxed font-serif placeholder:text-slate-300 p-8 lg:px-12"
                                    placeholder={activeTab === 'knowledge' ? "Paste or pin verified facts and concepts here..." : activeTab === 'entities' ? "Describe the person, company, or organization..." : "Define the term, acronym, or specific jargon..."}
                                />
                            </div>

                            {/* RIGHT: FACT HUNTER (Only active for Research tab, or optionally all) */}
                            <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col h-64 lg:h-full border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/50">
                                <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                        <input 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 outline-none shadow-sm placeholder:text-slate-400"
                                            placeholder="Verify with Google Search..."
                                        />
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                                    {loading ? (
                                        <div className="text-center py-10 text-slate-400">
                                            <Loader2 size={24} className="animate-spin mx-auto mb-2"/>
                                            <span className="text-xs">Hunting...</span>
                                        </div>
                                    ) : foundFacts.length > 0 ? (
                                        foundFacts.map(card => (
                                            <div key={card.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                                <p className="text-xs text-slate-700 mb-2 leading-relaxed line-clamp-4">{card.content}</p>
                                                <div className="flex justify-between items-center border-t border-slate-50 pt-2 mt-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]" title={card.source}>{card.source}</span>
                                                    {card.isPinned ? (
                                                        <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={10}/> Pinned</span>
                                                    ) : (
                                                        <button onClick={() => pinFact(card)} className="text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                                                            <Copy size={10}/> Pin
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 opacity-40">
                                            <Globe size={24} className="mx-auto mb-2 text-slate-400"/>
                                            <p className="text-xs text-slate-500">Search to find verified facts.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Empty State
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/30">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Database size={32} className="text-slate-300"/>
                        </div>
                        <p className="text-sm font-medium text-slate-600">Select an item to edit.</p>
                        <p className="text-xs text-slate-400 mt-2">Use the sidebar to create Research Topics, People, or Concepts.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchStudio;
