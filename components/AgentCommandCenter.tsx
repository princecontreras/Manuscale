"use client";
import React, { useState, useRef, useEffect } from 'react';
import { AgentLog, EbookData, AgentRole, ProjectMemory } from '../types';
import { consultDirector, runSpecialistAgent, generateProjectOutline, streamChapterContent, generateImageFromPrompt, analyzeTopicAndConfigure, generateBibliography, gatherChapterFacts, generateMarketingPack, generateBookMockup, generateCopyright, generateMarketingImage } from '../services/aiClient';
import { saveProject, loadLocal, saveLocal, getProjectMemoryKey, loadFromDB, saveToDB, STORAGE_KEYS } from '../services/storage';
import { paginateContent } from '../utils/pagination';
import { generateEPUB, generateDOCX, generateMarketingAssetsZip } from '../services/publisher';
import { 
    Play, Square, Pause, StepForward,
    Target, Shield, Activity, Zap, 
    Layout, Image as ImageIcon, BookOpen, FileText,
    Brain, PenTool, CheckCircle2, Crown, Printer,
    ArrowLeft, Send, Terminal, Grid, Layers, Eye, List,
    BrainCircuit, HelpCircle, Bot, X
} from 'lucide-react';

import { Database, MessageSquare } from 'lucide-react';
import { useToast } from './ToastContext';

interface AgentCommandCenterProps {
    onBack: () => void;
}

const SESSION_KEY = 'manuscript_agent_session';
const MAX_STEPS_DEFAULT = 50;
const STAGNATION_LIMIT = 3;

// --- AGENT CONFIG ---
const AGENTS: {id: AgentRole, name: string, icon: any, color: string, ring: string, desc: string}[] = [
    { id: 'director', name: 'Director', icon: Crown, color: 'text-amber-500', ring: 'ring-amber-500', desc: 'Planning & Orchestration' },
    { id: 'strategist', name: 'The Strategist', icon: BrainCircuit, color: 'text-teal-500', ring: 'ring-teal-500', desc: 'Blueprint & Architecture' },
    { id: 'scholar', name: 'Scholar', icon: Database, color: 'text-sky-500', ring: 'ring-sky-500', desc: 'Research & Verification' },
    { id: 'scribe', name: 'Scribe', icon: PenTool, color: 'text-purple-500', ring: 'ring-purple-500', desc: 'Content Generation' },
    { id: 'editor', name: 'Editor', icon: CheckCircle2, color: 'text-rose-500', ring: 'ring-rose-500', desc: 'Critique & Refinement' },
    { id: 'designer', name: 'Designer', icon: ImageIcon, color: 'text-pink-500', ring: 'ring-pink-500', desc: 'Visual Assets' },
    { id: 'publisher', name: 'Publisher', icon: Printer, color: 'text-emerald-500', ring: 'ring-emerald-500', desc: 'Final Production' },
    { id: 'user', name: 'User Input', icon: MessageSquare, color: 'text-slate-500', ring: 'ring-slate-500', desc: 'Human Intervention' },
];

const AgentOnboarding: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [slide, setSlide] = useState(0);

    const SLIDES = [
        {
            title: "Autonomous Publishing Swarm Active",
            body: "Manuscale Autonomous Publishing Engine is not a chatbot. It is a team of specialized AI agents working in a recursive loop to build your book from scratch.",
            icon: Bot,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            title: "Phase 1: Strategy & Truth",
            body: "The Director manages the workflow. The Strategist (Teal) architects the blueprint and outline. The Scholar (Blue) connects to the live internet to verify facts and gather citations.",
            icon: BrainCircuit,
            color: "text-teal-400",
            bg: "bg-teal-500/10",
            border: "border-teal-500/20"
        },
        {
            title: "Phase 2: Production",
            body: "The Scribe (Purple) writes chapters using the Strategist's blueprint. The Editor (Red) critiques and refines prose. The Designer (Pink) creates visual assets.",
            icon: PenTool,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            title: "Phase 3: Publication",
            body: "The Publisher (Emerald) compiles the final manuscript. It generates professional EPUB and DOCX files and automatically downloads them straight to your device.",
            icon: Printer,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20"
        },
        {
            title: "Your Command Role",
            body: "You are the Human-in-the-Loop. Define the mission objective clearly. Monitor the budget. If agents get stuck, use the 'Inject Command' box to steer them.",
            icon: Target,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        }
    ];

    const current = SLIDES[slide];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* Visual Area */}
                <div className={`h-48 ${current.bg} flex items-center justify-center border-b ${current.border} relative overflow-hidden transition-colors duration-500`}>
                    <div className={`absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent)]`}></div>
                    <current.icon size={80} className={`${current.color} drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-500 transform scale-110`}/>
                </div>

                {/* Content Area */}
                <div className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-white mb-4 transition-all duration-300">{current.title}</h3>
                    <p className="text-slate-400 leading-relaxed mb-8 h-20 transition-all duration-300 text-sm">{current.body}</p>
                    
                    {/* Dots */}
                    <div className="flex justify-center gap-2 mb-8">
                        {SLIDES.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === slide ? 'bg-white w-6' : 'bg-slate-700'}`}></div>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3">
                        {slide > 0 ? (
                            <button onClick={() => setSlide(s => s - 1)} className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm transition-colors">
                                Back
                            </button>
                        ) : (
                            <button onClick={onClose} className="px-6 py-3 rounded-xl text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors">
                                Skip
                            </button>
                        )}
                        
                        <button 
                            onClick={() => {
                                if (slide < SLIDES.length - 1) setSlide(s => s + 1);
                                else onClose();
                            }}
                            className="flex-grow py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-900/20 transition-all hover:scale-[1.02]"
                        >
                            {slide === SLIDES.length - 1 ? "Initialize Publishing Swarm" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({ onBack }) => {
    const { showToast } = useToast();
    // --- STATE: CORE ---
    const [project, setProject] = useState<Partial<EbookData>>({});
    const [mission, setMission] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [includeCopyright, setIncludeCopyright] = useState(true);
    const [includeBibliography, setIncludeBibliography] = useState(true);
    
    // --- STATE: CONTROL ---
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [manualOverride, setManualOverride] = useState('');
    
    // --- STATE: VISUALIZATION ---
    const [activeTab, setActiveTab] = useState<'stream' | 'structure' | 'assets' | 'vault'>('stream');
    const [projectMemory, setProjectMemory] = useState<ProjectMemory>({ characters: [], world: [], research: [], plot: [], keyFigures: [], glossary: [], concepts: [] });
    const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
    const [agentReasoning, setAgentReasoning] = useState<string>('');
    const [agentAction, setAgentAction] = useState<string>('');
    const [logs, setLogs] = useState<AgentLog[]>([]);
    
    const [liveStreamContent, setLiveStreamContent] = useState<string>('');
    const [liveStreamChapterIdx, setLiveStreamChapterIdx] = useState<number | null>(null);

    // --- STATE: INTERACTION ---
    const [showUserModal, setShowUserModal] = useState(false);
    const [userResponse, setUserResponse] = useState('');
    const [directorQuestion, setDirectorQuestion] = useState('');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showNeuralActivity, setShowNeuralActivity] = useState(false);

    // --- STATE: SAFETY & METRICS ---
    const [stepCount, setStepCount] = useState(0);

    // --- REFS ---
    const projectRef = useRef<Partial<EbookData>>({});
    const historyRef = useRef<{role: string, content: string}[]>([]);
    
    // CRITICAL FIX: Use Ref for revision counts to avoid stale state in loop
    const revisionCountsRef = useRef<Record<string, number>>({});
    
    const stopRef = useRef(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const streamEndRef = useRef<HTMLDivElement>(null);
    const lastStateHash = useRef<string>("");
    const stagnationCount = useRef(0);

    // --- INITIALIZATION ---
    useEffect(() => {
        const restoreSession = async () => {
            const session = await loadLocal<{goal: string, logs: AgentLog[]} | null>(SESSION_KEY, null);
            if (session) {
                setMission(session.goal || '');
                setLogs(session.logs || []);
                historyRef.current = session.logs
                    .filter(l => l.agentRole && l.agentRole !== 'user' && l.type !== 'thought')
                    .map(l => ({ role: l.agentRole!, content: l.content }));
            }
            
            if (projectRef.current.id) {
                const mem = await loadLocal<ProjectMemory>(getProjectMemoryKey(projectRef.current.id), { characters: [], world: [], research: [], plot: [], keyFigures: [], glossary: [], concepts: [] });
                setProjectMemory(mem);
            }
        };
        restoreSession();

        if (!projectRef.current.id) {
            const init: Partial<EbookData> = {
                id: crypto.randomUUID(),
                lastModified: Date.now(),
                status: 'draft',
                wordCount: 0,
                title: 'Untitled Project',
                outline: []
            };
            projectRef.current = init;
            setProject(init);
        }

        // Onboarding Check
        const checkOnboarding = async () => {
            const seen = await loadFromDB(STORAGE_KEYS.ONBOARDING_SEEN, false);
            if (!seen) {
                setShowOnboarding(true);
            }
        };
        checkOnboarding();
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs, agentReasoning]);

    // Auto-scroll stream if active
    useEffect(() => {
        if (activeTab === 'stream') {
            streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [project.outline, activeTab]);

    const handleCloseOnboarding = async () => {
        await saveToDB(STORAGE_KEYS.ONBOARDING_SEEN, true);
        setShowOnboarding(false);
    };

    const addLog = (agent: AgentRole, content: string, type: AgentLog['type'] = 'chat_agent') => {
        const newLog: AgentLog = { id: crypto.randomUUID(), timestamp: Date.now(), type, agentRole: agent, content };
        setLogs(prev => [...prev, newLog]);
        if (agent !== 'user' && type !== 'thought') {
            historyRef.current.push({ role: agent, content });
        }
        saveLocal(SESSION_KEY, { goal: mission, logs: [...logs, newLog] });
    };

    const handleUserReply = () => {
        if (!userResponse.trim()) return;
        
        addLog('user', userResponse, 'chat_user');
        
        if (directorQuestion.toLowerCase().includes('author')) {
            projectRef.current.author = userResponse;
            setProject(prev => ({...prev, author: userResponse}));
        } else if (directorQuestion.toLowerCase().includes('title')) {
            projectRef.current.title = userResponse;
            setProject(prev => ({...prev, title: userResponse}));
        } else if (directorQuestion.toLowerCase().includes('copyright')) {
            const isYes = userResponse.toLowerCase().includes('yes') || userResponse.toLowerCase() === 'y';
            projectRef.current.frontMatter = { ...projectRef.current.frontMatter, includeCopyright: isYes };
            setProject(prev => ({...prev, frontMatter: { ...prev.frontMatter, includeCopyright: isYes }}));
        } else if (directorQuestion.toLowerCase().includes('bibliography')) {
            const isYes = userResponse.toLowerCase().includes('yes') || userResponse.toLowerCase() === 'y';
            projectRef.current.backMatter = { ...projectRef.current.backMatter, includeBibliography: isYes };
            setProject(prev => ({...prev, backMatter: { ...prev.backMatter, includeBibliography: isYes }}));
        }

        setShowUserModal(false);
        setUserResponse('');
        setDirectorQuestion('');
        
        setIsRunning(true);
        handleStart();
    };

    // --- CORE LOGIC: THE STEP FUNCTION ---
    const runStep = async () => {
        if (stopRef.current) return false;

        try {
            // 2. STAGNATION & LOOP SAFETY
            if (stepCount >= MAX_STEPS_DEFAULT) {
                addLog('director', "SAFETY HALT: Max steps reached.", 'error');
                setIsRunning(false);
                return false;
            }

            const currentStateHash = JSON.stringify({
                title: projectRef.current.title,
                author: authorName,
                includeCopyright,
                includeBibliography,
                outlineCount: projectRef.current.outline?.length,
                completedCount: projectRef.current.outline?.filter(c => c.status === 'completed').length,
                cover: !!projectRef.current.coverImage,
                revisions: JSON.stringify(revisionCountsRef.current),
                askedCopyright: true,
                askedBibliography: true
            });

            if (currentStateHash === lastStateHash.current) {
                stagnationCount.current += 1;
                if (stagnationCount.current >= STAGNATION_LIMIT) {
                    addLog('director', "SAFETY HALT: Project Stagnation Detected. No progress in 3 cycles.", 'error');
                    setIsRunning(false);
                    return false;
                }
            } else {
                stagnationCount.current = 0;
            }
            lastStateHash.current = currentStateHash;
            setStepCount(prev => prev + 1);

            // 3. DIRECTOR PHASE (Context Slicing)
            setActiveAgent('director');
            setAgentAction("Consulting FSM...");
            setAgentReasoning(""); 

            const slimProject = {
                title: projectRef.current.title,
                author: authorName || projectRef.current.author,
                hasBlueprint: !!projectRef.current.blueprint,
                hasOutline: (projectRef.current.outline?.length || 0) > 0,
                hasCover: !!projectRef.current.coverImage,
                askedCopyright: true,
                askedBibliography: true,
                outline: projectRef.current.outline?.map(c => ({
                    id: c.id,
                    title: c.title,
                    status: c.status,
                    revisionCount: revisionCountsRef.current[c.id] || 0
                })) || []
            };
            
            const slimHistory = historyRef.current.slice(-5);

            let currentInstruction = mission;
            if (manualOverride) {
                currentInstruction += `\n\nURGENT INTERVENTION: ${manualOverride}`;
                addLog('user', `INJECTION: ${manualOverride}`, 'action');
                setManualOverride(''); 
            }

            const directive = await consultDirector(currentInstruction, slimProject, slimHistory);
            
            setAgentReasoning(directive.reasoning);
            setAgentAction(`Commanding @${directive.targetAgent}`);
            await new Promise(r => setTimeout(r, 1000));

            if (directive.targetAgent === 'user') {
                setIsRunning(false);
                stopRef.current = true;
                setDirectorQuestion(directive.instruction);
                setShowUserModal(true);
                addLog('director', directive.instruction, 'chat_agent');
                return false;
            }

            // 4. EXECUTION PHASE
            setActiveAgent(directive.targetAgent);
            setAgentAction("Working...");
            
            let output = "";
            const newState = { ...projectRef.current };

            switch (directive.targetAgent) {
                case 'scholar':
                    output = (await runSpecialistAgent('scholar', directive.instruction, {})).output;
                    break;
                
                case 'strategist':
                    if (directive.instruction.toLowerCase().includes('blueprint')) {
                        // Deep Blueprinting
                        const bp = await analyzeTopicAndConfigure(mission, 'Non-Fiction', 'Non-Fiction');
                        newState.blueprint = bp;
                        if (!newState.title || newState.title === 'Untitled Project') newState.title = bp.title;
                        output = `Blueprint created: ${bp.title} [${bp.mode}]`;
                        setActiveTab('assets');
                    }
                    else if (directive.instruction.toLowerCase().includes('outline')) {
                        // Outline Generation
                        const { outline, modes } = await generateProjectOutline(newState.blueprint!);
                        newState.outline = outline;
                        if (newState.blueprint) {
                            newState.blueprint = { ...newState.blueprint, chapterModes: modes };
                        }
                        output = `Outline generated: ${outline.length} chapters.`;
                        setActiveTab('structure');
                    }
                    else {
                        output = "Strategist task unclear.";
                    }
                    break;

                case 'scribe':
                    if (directive.instruction.includes('Chapter ID')) {
                        const match = directive.instruction.match(/Chapter ID ([a-zA-Z0-9-]+)/);
                        const chapterId = match ? match[1] : null;
                        
                        if (chapterId) {
                            const chapterIdx = newState.outline!.findIndex(c => c.id === chapterId);
                            if (chapterIdx !== -1) {
                                const chapter = newState.outline![chapterIdx];
                                
                                // 1. SCHOLAR PHASE
                                setActiveAgent('scholar');
                                setActiveTab('vault');
                                addLog('scholar', `Performing Deep Research for Chapter ${chapterIdx + 1}: "${chapter.title}"...`, 'action');
                                
                                const researchResult = await gatherChapterFacts(chapter.beat, newState.blueprint!);
                                
                                const newMemory = { ...projectMemory };
                                if (researchResult.sources.length > 0) {
                                    researchResult.sources.forEach(src => {
                                        if (!newMemory.research.some(r => r.sourceUrl === src.uri)) {
                                            newMemory.research.push({
                                                id: crypto.randomUUID(),
                                                name: src.title,
                                                description: `Source for Chapter ${chapterIdx + 1}`,
                                                sourceUrl: src.uri,
                                                category: 'Source'
                                            });
                                        }
                                    });
                                }
                                
                                if (researchResult.context) {
                                    newMemory.research.push({
                                        id: crypto.randomUUID(),
                                        name: `Facts: ${chapter.title}`,
                                        description: researchResult.context,
                                        category: 'Fact'
                                    });
                                }
                                
                                setProjectMemory(newMemory);
                                if (newState.id) saveLocal(getProjectMemoryKey(newState.id), newMemory);
                                
                                addLog('scholar', `Found ${researchResult.sources.length} verified sources and extracted facts.`, 'success');
                                
                                // 2. SCRIBE PHASE
                                setActiveAgent('scribe');
                                setActiveTab('stream');
                                setLiveStreamChapterIdx(chapterIdx);
                                setLiveStreamContent('');
                                const modeName = chapter.mode && newState.blueprint!.chapterModes ? newState.blueprint!.chapterModes.find(m => m.id === chapter.mode)?.name : 'Standard';
                                addLog('scribe', `Drafting Chapter ${chapterIdx + 1} using archetype: [${modeName}]...`, 'action');
                                
                                let prevContext = "";
                                if (chapterIdx > 0 && newState.outline![chapterIdx - 1].content) {
                                    prevContext = newState.outline![chapterIdx - 1].content!.replace(/<[^>]+>/g, '').slice(-800);
                                }
                                let nextContext = "";
                                if (chapterIdx < newState.outline!.length - 1) {
                                    nextContext = newState.outline![chapterIdx + 1].beat;
                                }

                                let fullText = "";
                                await streamChapterContent(
                                    newState.blueprint!,
                                    newState.blueprint!.profile,
                                    chapter,
                                    newMemory,
                                    (chunk: string) => {
                                        fullText += chunk;
                                        setLiveStreamContent(fullText);
                                    }, 
                                    prevContext, nextContext, newState.outline!, "", researchResult.context, undefined
                                );
                                
                                fullText = fullText.replace(/^[\s\S]*?<h1[^>]*>.*?<\/h1>/i, '').trim();
                                const contentWithTitle = `<h1>Chapter ${chapterIdx + 1}: ${chapter.title}</h1>\n${fullText}`;
                                const newPages = paginateContent(contentWithTitle);
                                
                                newState.outline![chapterIdx] = { 
                                    ...chapter, 
                                    content: contentWithTitle, 
                                    generatedPages: newPages, 
                                    status: 'completed' 
                                };
                                setLiveStreamChapterIdx(null);
                                setLiveStreamContent('');
                                output = `Drafted Chapter ${chapterIdx + 1}`;
                            }
                        } else {
                            output = "Scribe error: Could not identify chapter ID.";
                        }
                    }
                    break;
                case 'editor':
                    const match = directive.instruction.match(/Chapter ID ([a-zA-Z0-9-]+)/);
                    if (match) {
                        const cid = match[1];
                        // FIX: Update REF immediately for next loop iteration
                        revisionCountsRef.current[cid] = (revisionCountsRef.current[cid] || 0) + 1;
                        output = `Critiqued Chapter (Rev ${revisionCountsRef.current[cid]})`;
                    } else {
                        output = "Editor review complete.";
                    }
                    break;
                case 'designer':
                    setActiveTab('assets');
                    addLog('designer', 'Architecting visual design prompt...', 'action');
                    
                    // The Designer agent is responsible for the visual prompt
                    const designResult = await runSpecialistAgent('designer', directive.instruction || `Create a professional book cover design for a ${newState.blueprint?.type || 'book'} about ${newState.title}`, {
                        title: newState.title,
                        genre: newState.blueprint?.genre,
                        blueprint: newState.blueprint
                    });

                    let basePrompt = designResult.output || `Professional book cover art`;
                    
                    // If basePrompt contains the title, strip it or ignore it to avoid double titles
                    if (newState.title && basePrompt.includes(newState.title)) {
                        basePrompt = basePrompt.replace(new RegExp(newState.title, 'gi'), '').replace(/["']/g, '').trim();
                    }

                    const hasAuthor = (authorName || newState.author) && (authorName || newState.author) !== 'The Author';
                    
                    // USE COVER STUDIO TEMPLATE
                    const finalPrompt = `STRICT 2D FLAT BOOK COVER ART. Aspect Ratio 3:4. FULL BLEED, NO BORDERS, EDGE-TO-EDGE COMPOSITION. 
Visual Description: ${basePrompt}. 
TYPOGRAPHY: Include Book Title: "${newState.title || 'Untitled'}"${newState.blueprint?.subtitle ? `, Subtitle: "${newState.blueprint.subtitle}"` : ''}${hasAuthor ? `, and Author Name: "${authorName || newState.author}"` : '. DO NOT INCLUDE ANY AUTHOR NAME.'}. 
High resolution, detailed, professional publishing quality. 
Avoid repetitive cyan color schemes; use a unique and striking color palette related to the book's theme. 
STRICTLY GENERATE ONLY THE COVER ARTWORK ITSELF. DO NOT GENERATE A BOOK MOCKUP, DO NOT SHOW A PHYSICAL BOOK. JUST THE COVER ART DESIGN.
CRITICAL: Do NOT duplicate the title. Only include the title text once.`;
                    
                    addLog('designer', 'Generating high-resolution artwork...', 'action');
                    const image = await generateImageFromPrompt(finalPrompt, 'fast');
                    if (image) {
                        newState.coverImage = image;
                        output = "Cover generated.";
                    } else {
                        output = "Designer failed to generate image.";
                        console.warn("Designer returned null image");
                    }
                    break;
                case 'publisher':
                    if (newState.id && newState.title) {
                        if (!newState.marketing && newState.blueprint) {
                            addLog('publisher', 'Generating Marketing Assets...', 'action');
                            try {
                                newState.marketing = await generateMarketingPack(newState.blueprint);
                                
                                if (newState.coverImage && newState.marketing) {
                                    addLog('publisher', 'Generating Marketing Images & Mockup...', 'action');
                                    
                                    const marketingAssets = newState.marketing;
                                    const coverImage = newState.coverImage;

                                    // Parallel generation of ALL images + mockup together
                                    const [fbImages, socialImages, quoteImages, mockup] = await Promise.all([
                                        Promise.all((marketingAssets.facebookAdCreatives || []).map(c => generateMarketingImage(c.prompt, coverImage, () => {}))),
                                        Promise.all((marketingAssets.socialMediaGraphics || []).map(c => generateMarketingImage(c.prompt, coverImage, () => {}))),
                                        Promise.all((marketingAssets.quoteGraphics || []).map(c => generateMarketingImage(c.quote, coverImage, () => {}))),
                                        !newState.marketing.mockupImage ? generateBookMockup(newState.title, coverImage) : Promise.resolve(newState.marketing.mockupImage)
                                    ]);
                                    
                                    newState.marketing.facebookAdCreatives = (marketingAssets.facebookAdCreatives || []).map((c, i) => ({...c, image: fbImages[i]}));
                                    newState.marketing.socialMediaGraphics = (marketingAssets.socialMediaGraphics || []).map((c, i) => ({...c, image: socialImages[i]}));
                                    newState.marketing.quoteGraphics = (marketingAssets.quoteGraphics || []).map((c, i) => ({...c, image: quoteImages[i]}));
                                    if (mockup) newState.marketing.mockupImage = mockup;
                                }
                            } catch (e) {
                                const errorMsg = e instanceof Error ? e.message : "Failed to generate marketing assets. Please try again.";
                                console.error("Marketing asset generation error:", e);
                                showToast(errorMsg, "error");
                                addLog('publisher', 'Failed to generate marketing assets, skipping...', 'error');
                            }
                        }

                        if (includeCopyright && !newState.frontMatter?.copyright) {
                            addLog('publisher', 'Generating Copyright Page...', 'action');
                            if (!newState.frontMatter) newState.frontMatter = { includeCopyright: true };
                            newState.frontMatter.copyright = generateCopyright(authorName || newState.author || 'Unknown');
                        }

                        if (includeBibliography && !newState.backMatter?.bibliography) {
                            addLog('publisher', 'Generating Bibliography...', 'action');
                            if (!newState.backMatter) newState.backMatter = { includeBibliography: true };
                            try {
                                let bibliographyHtml = '';
                                const allSources: {title: string, uri: string}[] = [];
                                
                                if (newState.outline && newState.outline.length > 0) {
                                    newState.outline.forEach(item => {
                                        if (item.sources && item.sources.length > 0) {
                                            allSources.push(...item.sources);
                                        }
                                        
                                        if (item.status === 'completed' && item.content) {
                                            const parser = new DOMParser();
                                            const doc = parser.parseFromString(item.content, 'text/html');
                                            const sourceDiv = doc.querySelector('.chapter-sources');
                                            
                                            if (sourceDiv) {
                                                sourceDiv.querySelectorAll('li').forEach(li => {
                                                    const a = li.querySelector('a');
                                                    if (a && a.href) {
                                                        allSources.push({
                                                            title: a.textContent || "External Source",
                                                            uri: a.href
                                                        });
                                                    }
                                                });
                                                sourceDiv.remove();
                                                
                                                const newContent = doc.body.innerHTML;
                                                item.content = newContent;
                                                item.generatedPages = paginateContent(newContent);
                                            }
                                        }
                                    });
                                    
                                    const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());
                                    
                                    if (uniqueSources.length > 0) {
                                        bibliographyHtml = await generateBibliography(uniqueSources);
                                    }
                                }
                                
                                newState.backMatter.bibliography = bibliographyHtml || undefined;
                            } catch (e) {
                                const errorMsg = e instanceof Error ? e.message : "Failed to generate bibliography. Please try again.";
                                console.error("Bibliography generation error:", e);
                                showToast(errorMsg, "error");
                                addLog('publisher', 'Failed to generate bibliography, skipping...', 'error');
                            }
                        }

                        addLog('publisher', 'Compiling and Downloading Files...', 'action');
                        await generateEPUB(newState as EbookData);
                        await new Promise(r => setTimeout(r, 500)); // Small delay to prevent browser blocking multiple downloads
                        await generateDOCX(newState as EbookData);
                        await new Promise(r => setTimeout(r, 500));
                        await generateMarketingAssetsZip(newState as EbookData);

                        output = "EPUB, DOCX, and Marketing Assets Generated and Downloaded.";
                        newState.status = 'published';
                        setIsRunning(false); // Done
                        stopRef.current = true; // Stop the director loop
                    }
                    break;
                default:
                    return true;
            }

            // 5. UPDATE STATE
            projectRef.current = newState;
            setProject(newState);
            if (newState.id && newState.title) await saveProject(newState as EbookData);
            
            addLog(directive.targetAgent, output, 'success');
            setActiveAgent(null);
            
            return true;

        } catch (e: any) {
            const errorMsg = e instanceof Error ? e.message : "An error occurred during agent execution. Please try again.";
            console.error("Agent execution error:", e);
            showToast(errorMsg, "error");
            addLog('director', `ERROR: ${e.message}`, 'error');
            setIsRunning(false);
            stopRef.current = true;
            return false;
        }
    };

    // --- CONTROLS ---

    const handleStart = async () => {
        if (!mission.trim()) return;
        
        // Initialize project with metadata from UI
        projectRef.current = {
            ...projectRef.current,
            author: authorName || projectRef.current.author,
            frontMatter: {
                ...projectRef.current.frontMatter,
                includeCopyright: includeCopyright
            },
            backMatter: {
                ...projectRef.current.backMatter,
                includeBibliography: includeBibliography
            }
        };
        setProject(projectRef.current);

        setIsRunning(true);
        setIsPaused(false);
        stopRef.current = false;
        
        while (!stopRef.current) {
            if (isPaused) {
                await new Promise(r => setTimeout(r, 500));
                continue;
            }
            const shouldContinue = await runStep();
            if (!shouldContinue) break;
            
            await new Promise(r => setTimeout(r, 2000)); // Pacing
        }
        setIsRunning(false);
    };

    const handlePause = () => {
        setIsPaused(true);
        stopRef.current = true;
        setIsRunning(false);
    };

    const handleReset = () => {
        stopRef.current = true;
        setIsRunning(false);
        setIsPaused(false);
        setLogs([]);
        setStepCount(0);
        stagnationCount.current = 0;
        revisionCountsRef.current = {};
        projectRef.current = { id: crypto.randomUUID() };
        setProject(projectRef.current);
        setMission('');
    };

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 h-screen w-full font-sans overflow-hidden bg-slate-900">
            {showOnboarding && <AgentOnboarding onClose={handleCloseOnboarding} />}

            {/* LEFT: Controls & Monitor (3 Cols) */}
            <div className="lg:col-span-3 min-h-[40vh] lg:min-h-0 lg:h-full lg:border-r border-slate-800 bg-slate-950 text-slate-300 flex flex-col z-20 shadow-xl overflow-y-auto lg:overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white"><ArrowLeft size={18}/></button>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Publishing Studio</h2>
                    </div>
                    <button onClick={() => setShowOnboarding(true)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-primary-400" title="Agent Guide">
                        <HelpCircle size={18}/>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-primary-500 font-bold text-xs uppercase"><Target size={14}/> Objective</div>
                        <textarea 
                            value={mission} onChange={(e) => setMission(e.target.value)} disabled={isRunning}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none resize-none h-24 mb-4"
                            placeholder="Describe your book project..."
                        />

                        {/* Metadata Inputs */}
                        <div className="space-y-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Author Name</label>
                                <input 
                                    type="text"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    disabled={isRunning}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-primary-500 outline-none transition-all"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={includeCopyright}
                                            onChange={(e) => setIncludeCopyright(e.target.checked)}
                                            disabled={isRunning}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 bg-slate-950 border border-slate-800 rounded-md peer-checked:bg-brand-600 peer-checked:border-brand-600 transition-all"></div>
                                        <CheckCircle2 size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">Include Copyright Page</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={includeBibliography}
                                            onChange={(e) => setIncludeBibliography(e.target.checked)}
                                            disabled={isRunning}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 bg-slate-950 border border-slate-800 rounded-md peer-checked:bg-brand-600 peer-checked:border-brand-600 transition-all"></div>
                                        <CheckCircle2 size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">Include Bibliography</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {!isRunning ? (
                                <button onClick={handleStart} disabled={!mission} className="col-span-2 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"><Play size={16}/> Start Agent</button>
                            ) : (
                                <button onClick={handlePause} className="col-span-2 bg-amber-500 hover:bg-amber-400 text-slate-900 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"><Pause size={16}/> Pause</button>
                            )}
                            <button onClick={() => runStep()} disabled={isRunning && !isPaused} className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"><StepForward size={14}/> Step</button>
                            <button onClick={handleReset} className="bg-slate-800 hover:bg-red-900/50 text-slate-400 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><Zap size={14}/> Reset</button>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2 font-bold text-xs text-slate-500 uppercase"><Shield size={12}/> Safety Circuit</div>
                        <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between text-xs">
                                <span>Recursion Depth</span>
                                <span>{stepCount} / {MAX_STEPS_DEFAULT}</span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{width: `${(stepCount/MAX_STEPS_DEFAULT)*100}%`}}></div></div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="relative">
                        <input value={manualOverride} onChange={(e) => setManualOverride(e.target.value)} placeholder="Inject command..." className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:border-brand-500 outline-none"/>
                        <button className="absolute right-2 top-1.5 text-brand-500 hover:text-white" disabled={!manualOverride}><Send size={14}/></button>
                    </div>
                </div>
            </div>

            {/* CENTER: Visualization (6 Cols) */}
            <div className="lg:col-span-6 h-full bg-slate-900 flex flex-col relative border-t lg:border-t-0 border-slate-800 overflow-hidden">
                <div className="h-14 bg-slate-950 border-b border-slate-800 flex items-center px-2 sm:px-4 justify-between shadow-sm z-10 flex-shrink-0">
                    <div className="flex gap-1 bg-slate-900 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                        <button onClick={() => setActiveTab('stream')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'stream' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Terminal size={14}/> Live Stream
                        </button>
                        <button onClick={() => setActiveTab('structure')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'structure' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                            <List size={14}/> Structure
                        </button>
                        <button onClick={() => setActiveTab('assets')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'assets' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Layers size={14}/> Assets
                        </button>
                        <button onClick={() => setActiveTab('vault')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'vault' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Database size={14}/> Vault
                        </button>
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate max-w-[200px]">{project.title || "Initializing..."}</div>
                </div>
                
                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto bg-slate-900 p-6 relative custom-scrollbar">
                    
                    {/* VIEW: LIVE STREAM */}
                    {activeTab === 'stream' && (
                        <div className="max-w-2xl mx-auto min-h-full">
                            {project.outline?.length === 0 && !project.title ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                                    <Terminal size={48} className="mb-4 opacity-50"/>
                                    <p className="text-sm">Awaiting agent output...</p>
                                </div>
                            ) : (
                                <div className="space-y-12 pb-20">
                                    {project.outline?.filter(c => c.status === 'completed').map((c, i) => (
                                        <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                            <div className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">
                                                Chapter {i + 1}: {c.title}
                                            </div>
                                            <div 
                                                className="prose prose-invert prose-sm max-w-none text-slate-300 font-serif leading-relaxed"
                                                dangerouslySetInnerHTML={{__html: c.content || ''}}
                                            />
                                        </div>
                                    ))}
                                    {liveStreamChapterIdx !== null && liveStreamContent && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                            <div className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                                                <Activity size={12} className="animate-pulse" />
                                                Drafting Chapter {liveStreamChapterIdx + 1}: {project.outline?.[liveStreamChapterIdx]?.title}
                                            </div>
                                            <div 
                                                className="prose prose-invert prose-sm max-w-none text-slate-300 font-serif leading-relaxed"
                                                dangerouslySetInnerHTML={{__html: liveStreamContent}}
                                            />
                                        </div>
                                    )}
                                    {/* Placeholder for current activity */}
                                    <div ref={streamEndRef} className="h-10"></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW: STRUCTURE */}
                    {activeTab === 'structure' && (
                        <div className="max-w-3xl mx-auto space-y-2">
                            {project.outline && project.outline.length > 0 ? (
                                project.outline.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-700">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 text-sm">{item.title}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{item.beat}</div>
                                                {item.mode && project.blueprint?.chapterModes && (
                                                    <div className="text-[10px] text-brand-400 mt-1 flex items-center gap-1">
                                                        <Layers size={10} /> {project.blueprint.chapterModes.find(m => m.id === item.mode)?.name || item.mode}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {revisionCountsRef.current[item.id] > 0 && (
                                                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded border border-amber-500/20">
                                                    Rev {revisionCountsRef.current[item.id]}
                                                </span>
                                            )}
                                            {item.status === 'completed' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                                    <CheckCircle2 size={12}/> Done
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold bg-slate-700/50 px-2 py-1 rounded border border-slate-700">
                                                    <div className="w-2 h-2 rounded-full bg-slate-500"></div> Pending
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-slate-500">
                                    <List size={48} className="mx-auto mb-4 opacity-50"/>
                                    <p className="text-sm">Outline not yet generated.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW: ASSETS */}
                    {activeTab === 'assets' && (
                        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><ImageIcon size={16}/> Cover Art</h3>
                                {project.coverImage ? (
                                    <img src={project.coverImage} className="w-full rounded-lg shadow-2xl border border-slate-600" alt="Cover"/>
                                ) : (
                                    <div className="aspect-[2/3] bg-slate-900 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-700 text-slate-600 text-xs">
                                        Pending Designer...
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Layout size={16}/> Blueprint DNA</h3>
                                    {project.blueprint ? (
                                        <div className="space-y-4 text-xs">
                                            <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                <div className="text-slate-500">Type</div>
                                                <div className="col-span-2 text-slate-200">{project.blueprint.type} / {project.blueprint.genre}</div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                <div className="text-slate-500">Mode</div>
                                                <div className="col-span-2 text-slate-200">{project.blueprint.mode}</div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                <div className="text-slate-500">Theme</div>
                                                <div className="col-span-2 text-slate-200">{project.blueprint.visualStyle}</div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                <div className="text-slate-500">Target</div>
                                                <div className="col-span-2 text-slate-200">{project.blueprint.profile?.targetAudience}</div>
                                            </div>
                                            {project.blueprint.centralThesis && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                    <div className="text-slate-500">Central Thesis</div>
                                                    <div className="col-span-2 text-slate-200">{project.blueprint.centralThesis}</div>
                                                </div>
                                            )}
                                            {project.blueprint.readerPersona?.primaryPainPoint && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                    <div className="text-slate-500">Reader Pain Point</div>
                                                    <div className="col-span-2 text-slate-200">{project.blueprint.readerPersona.primaryPainPoint}</div>
                                                </div>
                                            )}
                                            {project.blueprint.readerPersona?.desiredOutcome && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                    <div className="text-slate-500">Reader Desire</div>
                                                    <div className="col-span-2 text-slate-200">{project.blueprint.readerPersona.desiredOutcome}</div>
                                                </div>
                                            )}
                                            {project.blueprint.controllingIdea && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                    <div className="text-slate-500">Controlling Idea</div>
                                                    <div className="col-span-2 text-slate-200">{project.blueprint.controllingIdea}</div>
                                                </div>
                                            )}
                                            {project.blueprint.readerPersona?.intellectualCuriosity && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                    <div className="text-slate-500">Curiosity Hook</div>
                                                    <div className="col-span-2 text-slate-200">{project.blueprint.readerPersona.intellectualCuriosity}</div>
                                                </div>
                                            )}
                                            {project.blueprint.readerPersona?.emotionalPayoff && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                    <div className="text-slate-500">Emotional Payoff</div>
                                                    <div className="col-span-2 text-slate-200">{project.blueprint.readerPersona.emotionalPayoff}</div>
                                                </div>
                                            )}
                                            {project.blueprint.readerPersona?.historicalContext && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700">
                                                    <div className="text-slate-500">History Context</div>
                                                    <div className="col-span-2 text-slate-200">{project.blueprint.readerPersona.historicalContext}</div>
                                                </div>
                                            )}
                                            {project.blueprint.structure && (
                                                <div className="mt-4">
                                                    <div className="text-brand-400 font-bold mb-2">Structural Archetype: {project.blueprint.structure.archetype}</div>
                                                    <div className="text-slate-400 mb-3">{project.blueprint.structure.description}</div>
                                                    <div className="space-y-2">
                                                        {project.blueprint.structure.phases.map((phase, idx) => (
                                                            <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                                                <div className="font-bold text-slate-300">{phase.title} ({phase.chapterCount} chapters)</div>
                                                                <div className="text-slate-500 mt-1">{phase.intent}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {project.blueprint.chapterModes && project.blueprint.chapterModes.length > 0 && (
                                                <div className="mt-4">
                                                    <div className="text-brand-400 font-bold mb-2">Chapter Archetypes (Palette)</div>
                                                    <div className="space-y-2">
                                                        {project.blueprint.chapterModes.map((mode, idx) => (
                                                            <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                                                <div className="font-bold text-slate-300">{mode.name}</div>
                                                                <div className="text-slate-500 mt-1">{mode.purpose}</div>
                                                                <div className="text-emerald-400/80 mt-1 font-mono text-[10px]">{mode.signature.join(' → ')}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 text-xs italic">Blueprint pending...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: VAULT */}
                    {activeTab === 'vault' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Database className="text-brand-500" /> Knowledge Vault
                                </h2>
                                <div className="text-xs text-slate-400 font-mono">
                                    {projectMemory.research.length} Facts & Sources
                                </div>
                            </div>
                            
                            {projectMemory.research.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <Database size={48} className="mx-auto mb-4 opacity-50"/>
                                    <p className="text-sm">Vault is empty. Scholar agent will populate this during research.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {projectMemory.research.map((item, i) => (
                                        <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {item.category === 'Source' ? (
                                                        <BookOpen size={14} className="text-blue-400" />
                                                    ) : (
                                                        <FileText size={14} className="text-emerald-400" />
                                                    )}
                                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{item.category}</span>
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">{item.name}</h3>
                                            <p className="text-xs text-slate-400 line-clamp-4 mb-3">{item.description}</p>
                                            {item.sourceUrl && (
                                                <div className="text-[10px] text-brand-400 truncate block bg-brand-500/10 px-2 py-1 rounded border border-brand-500/20">
                                                    “{item.name}”. (n.d.). Resource link. <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-brand-300 underline">{item.sourceUrl}</a>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User Modal Overlay */}
                {showUserModal && (
                    <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:right-8 sm:left-auto z-50 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-10">
                        <div className="p-4 bg-slate-900 text-white"><div className="font-bold text-sm">Director Request</div><div className="text-xs text-slate-300 mt-1">{directorQuestion}</div></div>
                        <div className="p-3 bg-slate-50 flex gap-2">
                            <input value={userResponse} onChange={(e) => setUserResponse(e.target.value)} className="flex-grow p-2 rounded border text-sm outline-none" placeholder="Answer..." autoFocus onKeyDown={e => e.key === 'Enter' && handleUserReply()}/>
                            <button onClick={handleUserReply} className="bg-slate-900 text-white p-2 rounded hover:bg-slate-700"><Send size={16}/></button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT: Agent Activity & Logs (3 Cols) */}
            <div className="lg:col-span-3 min-h-[30vh] lg:min-h-0 lg:h-full bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-xl z-20 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-4"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Brain size={12}/> Neural Activity</h3></div>
                    <div className={`p-4 rounded-xl border-2 transition-all ${activeAgent ? `bg-white ring-2 ring-brand-500 shadow-lg` : 'border-slate-200 bg-slate-50 grayscale opacity-70'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 flex-shrink-0"><Activity size={20} className={activeAgent ? "animate-pulse text-emerald-500" : "text-slate-400"}/></div>
                            <div><div className="font-bold text-slate-900 text-sm capitalize">{activeAgent || 'Idle'}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider">{agentAction || 'Standby'}</div></div>
                        </div>
                        {activeAgent && <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 italic max-h-40 overflow-y-auto custom-scrollbar">"{agentReasoning}"</div>}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
                    {logs.map((log) => {
                        const agent = AGENTS.find(a => a.id === log.agentRole);
                        if (!agent) return null;
                        return (
                            <div key={log.id} className="flex gap-3 items-start text-xs animate-in slide-in-from-bottom-2 duration-300">
                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${agent.color.replace('text-','bg-')}`}></div>
                                <div><span className={`font-bold uppercase ${agent.color}`}>{agent.name}</span> <span className="text-slate-600">{log.content}</span></div>
                            </div>
                        );
                    })}
                    <div ref={logsEndRef} className="h-4" />
                </div>
            </div>

        </div>
    );
};

export default AgentCommandCenter;