
"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { EbookData, FrontMatter, MarketingAssets, BackMatter, OutlineItem } from '../types';
import { generateMarketingPack, generateBookMockup, generateAboutAuthor, generateCopyright, generateSpeech, generateBibliography, generateDedication, generateMarketingImage } from '../services/aiClient';
import { generateEPUB, generateDOCX, generateAudiobookZip, generateMarketingAssetsZip } from '../services/publisher';

import DOMPurify from 'dompurify';
import { paginateContent } from '../utils/pagination';
import { trackEvent } from '../services/analytics';
import { logActivity } from '../services/storage';
import { validateExportData } from '../utils/exportValidator';
import { CheckCircle2, AlertTriangle, Book, Share2, ArrowRight, Loader2, Sparkles, X, FileText, Image as ImageIcon, Tag, ShoppingCart, Copy, Check, Palette, List, Mic, Headphones, Play, Square, Volume2, ChevronDown, Smartphone, Tablet, Monitor, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useToast } from './ToastContext';

interface PublishWizardProps {
  data: EbookData;
  onUpdateData: (newData: Partial<EbookData>) => void;
  onClose: () => void;
  onOpenCoverStudio: (returnToWizard: boolean) => void;
  initialStep?: number;
  isDemoMode?: boolean;
}

// Helper to extract numeric price from potential AI chatter
const extractPrice = (text: string | undefined): string => {
    if (!text) return "9.99";
    // Match $XX.XX or XX.XX
    const match = text.match(/(\$)?(\d+(\.\d{1,2})?)/);
    if (match && match[2]) {
        return match[2];
    }
    return "9.99";
};

// Helper: Wrap raw PCM in WAV container for browser playback
const createWavBlob = (base64PCM: string): Blob => {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = bytes.length;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    return new Blob([header, bytes], { type: 'audio/wav' });
};

// --- FULL BOOK PREVIEW COMPONENTS ---

const getWordCount = (html: string): number => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 0 ? text.split(' ').length : 0;
};

const getReadingTime = (wordCount: number): string => {
    const mins = Math.ceil(wordCount / 250);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
};

const KDPPreview: React.FC<{
    title: string;
    subtitle?: string;
    author?: string;
    coverImage?: string | null;
    frontMatter: FrontMatter;
    backMatter: BackMatter;
    outline: OutlineItem[];
    design?: any;
}> = ({ title, subtitle, author, coverImage, frontMatter, backMatter, outline, design }) => {
    const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('phone');
    const [activeIdx, setActiveIdx] = useState(0);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [showTOC, setShowTOC] = useState(false);
    const [showChrome, setShowChrome] = useState(true);

    const touchStartX = useRef<number | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const completedChapters = useMemo(() =>
        outline.filter(c => c.status === 'completed' && c.content),
    [outline]);

    const totalWords = useMemo(() =>
        completedChapters.reduce((sum, c) => sum + getWordCount(c.content!), 0),
    [completedChapters]);

    const fullOutline = useMemo((): OutlineItem[] => {
        const pages: OutlineItem[] = [];

        pages.push({
            id: '__kdp_title__',
            chapterNumber: 0,
            title: 'Title Page',
            beat: '',
            targetWordCount: 0,
            status: 'completed',
            content: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:2em 1em;">
                ${coverImage ? `<img src="${coverImage}" alt="Cover" style="max-height:200px;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,0.2);margin-bottom:2em;"/>` : ''}
                <h1 style="font-size:1.8em;font-weight:700;line-height:1.2;margin-bottom:0.4em;">${title}</h1>
                ${subtitle ? `<p style="font-size:1em;color:#94a3b8;margin-bottom:0.5em;font-style:italic;">${subtitle}</p>` : ''}
                ${author ? `<p style="font-size:0.9em;color:#64748b;margin-top:1.5em;">by <strong>${author}</strong></p>` : ''}
            </div>`
        });

        if (frontMatter.copyright) {
            pages.push({
                id: '__kdp_copyright__',
                chapterNumber: 0,
                title: 'Copyright',
                beat: '',
                targetWordCount: 0,
                status: 'completed',
                content: `<div style="font-size:0.75em;text-align:center;padding:3em 1em;color:#94a3b8;line-height:1.6;">${frontMatter.copyright.replace(/\n/g, '<br/>')}</div>`
            });
        }

        if (frontMatter.dedication) {
            pages.push({
                id: '__kdp_dedication__',
                chapterNumber: 0,
                title: 'Dedication',
                beat: '',
                targetWordCount: 0,
                status: 'completed',
                content: `<div style="font-style:italic;text-align:center;padding:4em 2em;font-size:1.05em;line-height:1.8;">${frontMatter.dedication}</div>`
            });
        }

        completedChapters.forEach(c => pages.push(c));

        if (frontMatter.aboutAuthor) {
            pages.push({
                id: '__kdp_about__',
                chapterNumber: 0,
                title: 'About the Author',
                beat: '',
                targetWordCount: 0,
                status: 'completed',
                content: `<div style="padding:1em 0;"><h2 style="font-size:1.3em;font-weight:700;margin-bottom:1em;padding-bottom:0.5em;border-bottom:1px solid #e2e8f0;">About the Author</h2><p style="line-height:1.7;">${frontMatter.aboutAuthor}</p></div>`
            });
        }

        return pages;
    }, [title, subtitle, author, coverImage, frontMatter, completedChapters]);

    const currentEntry = fullOutline[Math.min(activeIdx, fullOutline.length - 1)] || fullOutline[0];

    const sanitizedContent = useMemo(() => {
        if (!currentEntry?.content) return '';
        return DOMPurify.sanitize(currentEntry.content, {
            ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','hr','div','span',
                           'strong','b','em','i','u','mark','ol','ul','li',
                           'blockquote','img','a'],
            ALLOWED_ATTR: ['style','class','src','alt','href']
        });
    }, [currentEntry]);

    const designStyles: React.CSSProperties = {
        fontFamily: design?.fontFamily || "'Georgia', serif",
        lineHeight: design?.lineHeight || '1.75',
    };

    // Reset page when section or device changes
    useEffect(() => { setPage(0); setTotalPages(1); }, [activeIdx, device]);

    // Measure total pages via CSS column overflow
    const calculatePages = useCallback(() => {
        if (!contentRef.current || !containerRef.current) return;
        const scrollW = contentRef.current.scrollWidth;
        const clientW = containerRef.current.clientWidth;
        if (clientW > 0) setTotalPages(Math.max(1, Math.ceil(scrollW / clientW)));
    }, [sanitizedContent, device]);

    useLayoutEffect(() => {
        const timer = setTimeout(calculatePages, 100);
        return () => clearTimeout(timer);
    }, [calculatePages]);

    const goNext = useCallback(() => {
        if (page < totalPages - 1) setPage(p => p + 1);
        else if (activeIdx < fullOutline.length - 1) setActiveIdx(i => i + 1);
    }, [page, totalPages, activeIdx, fullOutline.length]);

    const goPrev = useCallback(() => {
        if (page > 0) setPage(p => p - 1);
        else if (activeIdx > 0) setActiveIdx(i => i - 1);
    }, [page, activeIdx]);

    const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 40) return;
        if (delta < 0) goNext(); else goPrev();
    };
    const handlePhoneTap = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        if (x < w * 0.35) goPrev();
        else if (x > w * 0.65) goNext();
        else setShowChrome(c => !c);
    };

    const DEVICES = [
        { id: 'phone' as const, label: 'Phone', Icon: Smartphone },
        { id: 'tablet' as const, label: 'Tablet', Icon: Tablet },
        { id: 'desktop' as const, label: 'Desktop', Icon: Monitor },
    ];

    const progressPct = fullOutline.length > 1 ? (activeIdx / (fullOutline.length - 1)) * 100 : 100;

    // Inline helper (not a React component) — column-paginated content with flip animation
    const renderColumns = (padding: string) => (
        <div ref={containerRef} className="w-full h-full overflow-hidden"
             onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div ref={contentRef}
                 style={{
                     height: '100%',
                     columnWidth: 'calc(100% - 0px)',
                     columnGap: '0px',
                     columnFill: 'auto',
                     overflow: 'visible',
                     padding,
                     boxSizing: 'border-box',
                     transform: `translateX(calc(-${page} * 100%))`,
                     transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                     ...designStyles,
                 } as React.CSSProperties}
                 dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 bg-gradient-to-r from-primary-50 to-blue-50 p-4 rounded-xl border border-primary-100">
                <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Words</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{totalWords.toLocaleString()}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Reading Time</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{getReadingTime(totalWords)}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Chapters</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                        {completedChapters.length}<span className="text-sm font-normal text-slate-400"> / {outline.length}</span>
                    </div>
                </div>
            </div>

            {/* KDP-style device toolbar */}
            <div className="flex items-center justify-between bg-slate-900 rounded-xl px-3 py-2">
                <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
                    {DEVICES.map(({ id, label, Icon }) => (
                        <button key={id} onClick={() => setDevice(id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${device === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
                <span className="text-xs text-slate-500 truncate max-w-[30%] hidden md:block">{title}</span>
                <button onClick={() => setShowTOC(t => !t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showTOC ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    <BookOpen size={13} /> <span className="hidden sm:inline">Contents</span>
                </button>
            </div>

            {/* Preview area */}
            <div className="relative bg-slate-300 rounded-xl flex overflow-hidden" style={{ minHeight: 680 }}>
                {/* TOC Sidebar */}
                {showTOC && (
                    <div className="w-56 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
                        <div className="px-4 py-3 border-b bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Table of Contents</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{fullOutline.length} sections</p>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {fullOutline.map((ch, i) => (
                                <button key={ch.id} onClick={() => setActiveIdx(i)}
                                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors border-l-2 ${i === activeIdx ? 'bg-primary-50 text-primary-700 font-semibold border-primary-500' : 'text-slate-600 hover:bg-slate-50 border-transparent'}`}
                                >
                                    <span className="block truncate">
                                        {ch.chapterNumber > 0 && <span className="text-slate-400 mr-1.5 font-mono">{ch.chapterNumber}.</span>}
                                        {ch.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Device frame */}
                <div className="flex-grow flex items-center justify-center p-4 sm:p-8 overflow-auto">

                    {/* PHONE — sepia e-reader, tap left/right to flip, tap center to toggle chrome */}
                    {device === 'phone' && (
                        <div className="relative bg-[#f4ecd8] border-[14px] border-slate-900 rounded-[3rem] shadow-2xl overflow-hidden select-none"
                             style={{ width: 375, height: 800 }}>
                            {/* Status bar */}
                            <div className="absolute top-0 inset-x-0 h-10 z-30 flex justify-between items-center px-6 pt-2 text-[10px] font-bold text-[#5b4636]/50 pointer-events-none">
                                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="opacity-60">●●● ▮</span>
                            </div>
                            {/* Top chrome */}
                            <div className={`absolute top-0 inset-x-0 h-20 z-20 pointer-events-none transition-opacity duration-300 ${showChrome ? 'opacity-100' : 'opacity-0'} bg-gradient-to-b from-[#f4ecd8] to-transparent flex items-end justify-between px-5 pb-3`}>
                                <span className="text-[9px] font-bold text-[#5b4636] uppercase tracking-widest truncate max-w-[55%] opacity-60">{title}</span>
                                <span className="text-[8px] text-[#5b4636] opacity-40 truncate max-w-[40%]">{currentEntry?.title}</span>
                            </div>
                            {/* Tappable/swipeable content area */}
                            <div className={`absolute inset-0 ${showChrome ? 'pt-20 pb-16' : 'pt-10 pb-4'}`}
                                 onClick={handlePhoneTap} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                                {renderColumns('0.25rem 1.5rem')}
                            </div>
                            {/* Bottom chrome */}
                            <div className={`absolute bottom-0 inset-x-0 h-16 z-20 pointer-events-none transition-opacity duration-300 ${showChrome ? 'opacity-100' : 'opacity-0'} bg-gradient-to-t from-[#f4ecd8] to-transparent flex flex-col justify-end px-5 pb-3`}>
                                <div className="h-0.5 bg-[#5b4636]/15 rounded-full mb-2 overflow-hidden">
                                    <div className="h-full bg-[#8b7355] transition-all" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="flex justify-between text-[9px] text-[#5b4636]/40 font-bold">
                                    <span className="truncate max-w-[65%]">{currentEntry?.title}</span>
                                    <span>{page + 1} / {totalPages}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TABLET — iPad frame with side arrow buttons + swipe */}
                    {device === 'tablet' && (
                        <div className="mx-auto rounded-[1.5rem] border-[10px] border-slate-700 shadow-2xl overflow-hidden flex flex-col bg-[#faf9f7] select-none"
                             style={{ width: 660, height: 600, maxWidth: '100%' }}>
                            <div className="flex items-center justify-between px-5 py-2 bg-white border-b border-slate-200 shrink-0">
                                <span className="text-xs font-semibold text-slate-600 truncate max-w-[45%]">{title}</span>
                                <span className="text-xs text-slate-400 truncate max-w-[45%]">{currentEntry?.title}</span>
                            </div>
                            <div className="flex-grow min-h-0 relative overflow-hidden">
                                {renderColumns('2rem 3rem')}
                                <button onClick={(e) => { e.stopPropagation(); goPrev(); }} disabled={activeIdx === 0 && page === 0}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow border border-slate-200 disabled:opacity-20 hover:bg-slate-50 transition-all">
                                    <ChevronLeft size={16} className="text-slate-700" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); goNext(); }} disabled={activeIdx >= fullOutline.length - 1 && page >= totalPages - 1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow border border-slate-200 disabled:opacity-20 hover:bg-slate-50 transition-all">
                                    <ChevronRight size={16} className="text-slate-700" />
                                </button>
                            </div>
                            <div className="shrink-0 bg-white border-t border-slate-200">
                                <div className="h-1 bg-slate-100">
                                    <div className="h-full bg-primary-400 transition-all" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="flex items-center justify-center py-1.5 text-[10px] text-slate-400 font-mono">
                                    Page {page + 1} of {totalPages} · Section {activeIdx + 1} of {fullOutline.length}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DESKTOP — browser chrome frame with side arrow buttons + swipe */}
                    {device === 'desktop' && (
                        <div className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-slate-400 flex flex-col bg-[#faf9f7] select-none"
                             style={{ height: 600 }}>
                            <div className="flex items-center gap-1.5 px-3 h-9 bg-slate-800 shrink-0">
                                <div className="w-3 h-3 rounded-full bg-red-400 opacity-80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
                                <div className="w-3 h-3 rounded-full bg-green-400 opacity-80" />
                                <div className="flex-grow flex justify-center">
                                    <div className="bg-slate-700 text-slate-300 text-[10px] px-4 py-0.5 rounded-full truncate max-w-xs">Manuscale eBook Preview</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 shrink-0">
                                <span className="text-sm font-semibold text-slate-700 truncate max-w-[50%]">{title}</span>
                                <span className="text-xs text-slate-400">{currentEntry?.title}</span>
                            </div>
                            <div className="flex-grow min-h-0 relative overflow-hidden">
                                {renderColumns('2.5rem 5rem')}
                                <button onClick={(e) => { e.stopPropagation(); goPrev(); }} disabled={activeIdx === 0 && page === 0}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white/90 rounded-full shadow border border-slate-200 disabled:opacity-20 hover:bg-slate-50 transition-all">
                                    <ChevronLeft size={18} className="text-slate-700" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); goNext(); }} disabled={activeIdx >= fullOutline.length - 1 && page >= totalPages - 1}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white/90 rounded-full shadow border border-slate-200 disabled:opacity-20 hover:bg-slate-50 transition-all">
                                    <ChevronRight size={18} className="text-slate-700" />
                                </button>
                            </div>
                            <div className="shrink-0 bg-white border-t border-slate-200">
                                <div className="h-1 bg-slate-100">
                                    <div className="h-full bg-primary-400 transition-all" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="flex items-center justify-center py-1.5 text-[10px] text-slate-400 font-mono">
                                    Page {page + 1} of {totalPages} · Section {activeIdx + 1} of {fullOutline.length}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PublishWizard: React.FC<PublishWizardProps> = ({ data, onUpdateData, onClose, onOpenCoverStudio, initialStep, isDemoMode }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(initialStep || 1);
  const [loading, setLoading] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isGeneratingDedication, setIsGeneratingDedication] = useState(false);
  
  const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
  
  const [metadata, setMetadata] = useState({
      title: data.title || '',
      author: data.author || '',
      isbn: data.isbn || '',
      subtitle: data.blueprint?.subtitle || ''
  });
  
  const [frontMatter, setFrontMatter] = useState<FrontMatter>(data.frontMatter || {});
  const [backMatter, setBackMatter] = useState<BackMatter>(data.backMatter || { includeBibliography: true });

  const [assets, setAssets] = useState<MarketingAssets | null>(
    data.marketing || null
  );
  const [mockup, setMockup] = useState<string | null>(data.marketing?.mockupImage || null);
  
  const [finalDownloadableData, setFinalDownloadableData] = useState<EbookData | null>(null);
  const [isDownloadingEPUB, setIsDownloadingEPUB] = useState(false);
  const [isDownloadingDOCX, setIsDownloadingDOCX] = useState(false);
  // Tracks whether background marketing-image generation is still in-flight.
  // The download handler awaits this before building the zip so images are
  // always included.
  const marketingImagePromiseRef = useRef<Promise<void> | null>(null);
  const [isMarketingImagesReady, setIsMarketingImagesReady] = useState(false);
  
  const [successTab, setSuccessTab] = useState<'downloads' | 'store' | 'amazon' | 'audio'>('downloads');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Audio State
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedQuality, setSelectedQuality] = useState<'standard' | 'premium'>('standard');
  const [audioProgress, setAudioProgress] = useState(0);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isAudioGenerated, setIsAudioGenerated] = useState(false);
  const [audiobookBlob, setAudiobookBlob] = useState<Blob | null>(null);
  
  // Voice Preview State
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Smart Citation Count
  const totalSources = (data.outline || []).reduce((acc, item) => acc + (item.sources?.length || 0), 0);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleDownloadEPUB = async () => {
    if (!finalDownloadableData || isDownloadingEPUB) return;

    // Pre-flight validation
    const validation = validateExportData(finalDownloadableData);
    if (!validation.isValid) {
      showToast(validation.errors[0] || 'Cannot export: no valid chapters found.', 'error');
      return;
    }
    if (validation.warnings.length > 0) {
      // Non-blocking warning (skipped chapters)
      showToast(validation.warnings[0], 'warning');
    }

    setIsDownloadingEPUB(true);
    try {
      await generateEPUB(finalDownloadableData);
      trackEvent('download_epub', { title: finalDownloadableData.title });
      showToast(`EPUB downloaded — ${validation.completedChapters} of ${validation.totalChapters} chapters included.`, 'success');
    } catch (e: any) {
      console.error('EPUB download error:', e);
      showToast(e.message || 'Failed to generate EPUB. Please try again.', 'error');
    } finally {
      setIsDownloadingEPUB(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!finalDownloadableData || isDownloadingDOCX) return;

    // Pre-flight validation
    const validation = validateExportData(finalDownloadableData);
    if (!validation.isValid) {
      showToast(validation.errors[0] || 'Cannot export: no valid chapters found.', 'error');
      return;
    }
    if (validation.warnings.length > 0) {
      showToast(validation.warnings[0], 'warning');
    }

    setIsDownloadingDOCX(true);
    try {
      await generateDOCX(finalDownloadableData);
      trackEvent('download_docx', { title: finalDownloadableData.title });
      showToast(`DOCX downloaded — ${validation.completedChapters} of ${validation.totalChapters} chapters included.`, 'success');
    } catch (e: any) {
      console.error('DOCX download error:', e);
      showToast(e.message || 'Failed to generate DOCX. Please try again.', 'error');
    } finally {
      setIsDownloadingDOCX(false);
    }
  };

  const handleGenBio = async () => {
      setIsGeneratingBio(true);
      const bio = await generateAboutAuthor(metadata.author, data.blueprint?.summary || '');
      setFrontMatter(prev => ({ ...prev, aboutAuthor: bio }));
      setIsGeneratingBio(false);
  };

  const handleGenDedication = async () => {
      setIsGeneratingDedication(true);
      const dedication = await generateDedication(metadata.title || 'Untitled', data.blueprint?.summary || '');
      setFrontMatter(prev => ({ ...prev, dedication: dedication }));
      setIsGeneratingDedication(false);
  };

  const handleGenCopyright = () => {
      setFrontMatter(prev => ({ ...prev, copyright: generateCopyright(metadata.author) }));
  };

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(id);
      setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenCoverStudio = () => {
      onUpdateData({
          title: metadata.title,
          author: metadata.author,
          isbn: metadata.isbn,
          frontMatter: frontMatter,
          backMatter: backMatter
      });
      // Pass 'true' to indicate we want to return to the wizard after closing the studio
      onOpenCoverStudio(true);
  };

  const handleDownloadMetadata = () => {
      if (!assets) return;
      trackEvent('download_asset', { type: 'metadata_txt' });
      
      const plainTextBlurb = assets.blurb ? assets.blurb.replace(/<[^>]+>/g, '').trim() : '';
      const kPrice = extractPrice(assets.priceStrategy);
      const pPrice = (parseFloat(kPrice) + 8.00).toFixed(2);
      const socialContent = assets.socialPosts.map(p => `[${p.platform}]\n${p.content}`).join('\n\n');
      
      // DEFENSIVE: Ensure aPlusContent is an array
      const aPlusContent = (assets.aPlusContent && Array.isArray(assets.aPlusContent)) ? assets.aPlusContent.map((m, i) => 
`MODULE ${i + 1}: Standard Image Header with Text
Headline: ${m.headline}
Body: ${m.body}
Image Prompt: ${m.imagePrompt}`
      ).join('\n\n') : "No A+ Content generated.";

      const textContent = `BOOK METADATA
--------------------------------------------------
TITLE: ${metadata.title}
SUBTITLE: ${metadata.subtitle || 'N/A'}
AUTHOR: ${metadata.author}
ISBN: ${metadata.isbn || 'N/A'}

--------------------------------------------------
PROJECT PREMISE / SUMMARY
--------------------------------------------------
${data.blueprint?.summary || 'N/A'}

--------------------------------------------------
RECOMMENDED PRICING
--------------------------------------------------
Kindle eBook: $${kPrice}
Paperback:    $${pPrice}

Strategy Notes:
${assets.priceStrategy}

--------------------------------------------------
BOOK BLURB (Plain Text / Back Cover)
--------------------------------------------------
${plainTextBlurb}

--------------------------------------------------
AMAZON DESCRIPTION (HTML for KDP)
--------------------------------------------------
${assets.amazonDescription || assets.blurb}

--------------------------------------------------
KEYWORDS (${assets.keywords.length})
--------------------------------------------------
${assets.keywords.join('\n')}

--------------------------------------------------
CATEGORIES
--------------------------------------------------
${assets.categories.join('\n')}

--------------------------------------------------
AMAZON A+ CONTENT STRATEGY
--------------------------------------------------
${aPlusContent}

--------------------------------------------------
SOCIAL MEDIA SNIPPETS
--------------------------------------------------
${socialContent}

--------------------------------------------------
EMAIL PROMOTION TEMPLATE
--------------------------------------------------
${assets.emailPromotionTemplate || 'N/A'}

--------------------------------------------------
AD COPY EXAMPLES
--------------------------------------------------
${assets.adCopyExamples ? assets.adCopyExamples.map(ad => `[${ad.platform}]\n${ad.copy}`).join('\n\n') : 'N/A'}
`;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${metadata.title.replace(/\s+/g, '_')}_Metadata.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (mockup) {
          setTimeout(() => {
              const imgLink = document.createElement('a');
              imgLink.href = mockup;
              imgLink.download = `${metadata.title.replace(/\s+/g, '_')}_Mockup.png`;
              document.body.appendChild(imgLink);
              imgLink.click();
              document.body.removeChild(imgLink);
          }, 500);
      }
  };

  const handleGenerateAudiobook = async () => {
      if (!finalDownloadableData || finalDownloadableData.audiobookGenerated) return;
      setIsGeneratingAudio(true);
      setAudioProgress(0);
      try {
          const blob = await generateAudiobookZip(finalDownloadableData, selectedVoice, (progress) => {
              setAudioProgress(progress);
          }, true, selectedQuality);
          if (blob) {
            setAudiobookBlob(blob);
            setIsAudioGenerated(true);
            onUpdateData({ audiobookGenerated: true });
          }
      } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Failed to generate audiobook. Please try again.";
          console.error("Audiobook generation error:", e);
          showToast(errorMsg, 'error');
      } finally {
          setIsGeneratingAudio(false);
          setAudioProgress(0);
      }
  };

  const handleVoicePreview = async (e: React.MouseEvent, voiceId: string) => {
      e.stopPropagation();
      e.preventDefault();

      if (previewingVoice === voiceId) {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
          setPreviewingVoice(null);
          return;
      }

      if (audioRef.current) {
          audioRef.current.pause();
      }

      setPreviewingVoice(voiceId);

      try {
          const sampleText = `Hello. This is a sample of the ${voiceId} voice reading your book.`;
          const base64Audio = await generateSpeech(sampleText, voiceId);
          
          if (!base64Audio) throw new Error("Failed to generate audio");

          const blob = createWavBlob(base64Audio);
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          
          audio.onended = () => {
              setPreviewingVoice(null);
              URL.revokeObjectURL(url);
          };
          
          audioRef.current = audio;
          await audio.play();
      } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Failed to generate voice preview. Please try again.";
          console.error("Voice preview error:", err);
          showToast(errorMsg, 'error');
          setPreviewingVoice(null);
      }
  };

  const performPublish = async () => {
      if (isDemoMode) {
          showToast('Downloads are not available in demo mode. Sign up to download your book!', 'info');
          return;
      }
      setLoading(true);
      try {
          let processedOutline = data.outline ? [...data.outline] : [];
          let bibliographyHtml = '';
          const allSources: {title: string, uri: string}[] = [];

          if (backMatter.includeBibliography && processedOutline.length > 0) {
              processedOutline.forEach(item => {
                  // 1. Collect structured sources
                  if (item.sources && item.sources.length > 0) {
                      allSources.push(...item.sources);
                  }
                  
                  // 2. Fallback: Parse legacy .chapter-sources div in content
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
                          // Clean up source div from content for final book version
                          sourceDiv.remove();
                          
                          // Update content in processed outline
                          const newContent = doc.body.innerHTML;
                          item.content = newContent;
                          // DEFER: Don't paginate on publish - it's heavy DOM manipulation
                          // Pagination will happen on demand in the reader/renderer
                          // item.generatedPages = paginateContent(newContent);
                      }
                  }
              });

              // De-duplicate by URI
              const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());

              if (uniqueSources.length > 0) {
                  // Use Agentic Bibliography Generation with timeout protection
                  try {
                      const timeoutPromise = new Promise<string>((_, reject) =>
                          setTimeout(() => reject(new Error('Bibliography generation timed out')), 30000)
                      );
                      bibliographyHtml = await Promise.race([
                          generateBibliography(uniqueSources),
                          timeoutPromise
                      ]);
                  } catch (bibError: any) {
                      console.warn('Bibliography generation failed, continuing without bibliography:', bibError.message);
                      showToast('Bibliography generation took too long and was skipped. Your book will be published without it.', 'warning');
                      bibliographyHtml = '';
                  }
              }
          }

          const finalBackMatter = { ...backMatter, bibliography: bibliographyHtml || undefined };

          const updates: Partial<EbookData> = {
              title: metadata.title,
              author: metadata.author,
              isbn: metadata.isbn,
              status: 'published',
              marketing: assets || undefined,
              frontMatter: frontMatter,
              backMatter: finalBackMatter,
              outline: processedOutline, 
              publishDate: Date.now()
          };
          
          const finalData = { ...data, ...updates } as EbookData;
          setFinalDownloadableData(finalData);

          onUpdateData(updates);
          
          trackEvent('publish_book', { 
              title: metadata.title, 
              genre: data.blueprint?.genre,
              word_count: data.wordCount
          });
          // Properly await the async logActivity function
          try {
              await logActivity('publish_book', metadata.title || 'Untitled');
          } catch (activityErr) {
              console.warn('Failed to log activity:', activityErr);
              // Don't fail the publish for activity logging
          }

          setStep(5); 
      } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error';
          console.error('Publish failed:', errorMsg, e);
          showToast(`Publishing failed: ${errorMsg}. Please try again.`, 'error');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (step === 5 && !assets && data.blueprint && !isGeneratingAssets && finalDownloadableData) {
          const runBackgroundJob = async () => {
              // @ts-ignore
              if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
                  // @ts-ignore
                  await window.aistudio.openSelectKey();
              }
              
              setIsGeneratingAssets(true);
              try {
                  const [newAssets, newMockup] = await Promise.all([
                      generateMarketingPack(data.blueprint!),
                      !mockup && data.coverImage ? generateBookMockup(metadata.title, data.coverImage) : Promise.resolve(mockup)
                  ]);

                  let updatedAssets = { ...newAssets };
                  
                  // Start image generation in background (non-blocking)
                  // Images will populate as they complete without blocking UI updates.
                  // The promise is stored in a ref so the download handler can await
                  // it, guaranteeing images are present in the zip.
                  if (updatedAssets && data.coverImage) {
                      setIsMarketingImagesReady(false);
                      // Run each batch sequentially with a small gap to avoid hitting
                      // Gemini rate limits when firing 7 image requests simultaneously.
                      marketingImagePromiseRef.current = (async () => {
                          const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
                          try {
                              const fbImages = await Promise.all(
                                  (updatedAssets.facebookAdCreatives || []).map(c =>
                                      generateMarketingImage(c.prompt, data.coverImage!, () => {})
                                  )
                              );
                              updatedAssets.facebookAdCreatives = (updatedAssets.facebookAdCreatives || []).map((c, i) => ({...c, image: fbImages[i]}));

                              await delay(400);
                              const socialImages = await Promise.all(
                                  (updatedAssets.socialMediaGraphics || []).map(c =>
                                      generateMarketingImage(c.prompt, data.coverImage!, () => {})
                                  )
                              );
                              updatedAssets.socialMediaGraphics = (updatedAssets.socialMediaGraphics || []).map((c, i) => ({...c, image: socialImages[i]}));

                              await delay(400);
                              const quoteImages = await Promise.all(
                                  (updatedAssets.quoteGraphics || []).map(c =>
                                      generateMarketingImage(c.quote, data.coverImage!, () => {})
                                  )
                              );
                              updatedAssets.quoteGraphics = (updatedAssets.quoteGraphics || []).map((c, i) => ({...c, image: quoteImages[i]}));

                              setAssets(updatedAssets);
                              onUpdateData({ marketing: updatedAssets });
                              setFinalDownloadableData(prev => prev ? { ...prev, marketing: updatedAssets } : null);
                          } catch (err) {
                              console.warn('Background image generation failed (non-critical):', err);
                          } finally {
                              setIsMarketingImagesReady(true);
                          }
                      })();
                  } else {
                      setIsMarketingImagesReady(true);
                  }

                  if (updatedAssets) {
                      updatedAssets.mockupImage = newMockup || undefined;
                      setAssets(updatedAssets);
                      setMockup(newMockup);
                      
                      onUpdateData({ marketing: updatedAssets });
                      
                      setFinalDownloadableData(prev => prev ? { ...prev, marketing: updatedAssets } : null);
                  }
              } catch (e) {
                  const errorMsg = e instanceof Error ? e.message : "Failed to generate publishing assets. Please try again.";
                  console.error("Asset generation error:", e);
                  showToast(errorMsg, 'error');
              } finally {
                  setIsGeneratingAssets(false);
              }
          };
          runBackgroundJob();
      }
  }, [step, assets, data.blueprint, data.coverImage, metadata.title, mockup, finalDownloadableData]); 

  const kindlePrice = assets ? extractPrice(assets.priceStrategy) : "9.99";
  const paperbackPrice = (parseFloat(kindlePrice) + 8.00).toFixed(2);

  const VOICES = [
      { id: 'Aoede', label: 'Aoede (Female, Professional)', desc: 'Best for non-fiction & business' },
      { id: 'Zephyr', label: 'Zephyr (Male, Authoritative)', desc: 'Ideal for technical & educational' },
      { id: 'Kore', label: 'Kore (Female, Clear)', desc: 'Great for self-help & wellness' },
      { id: 'Fenrir', label: 'Fenrir (Male, Deep)', desc: 'Good for history & biographies' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
           <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-500 ${step === 5 ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white'}`}>
                   {step < 5 ? step : <CheckCircle2 size={24}/>}
               </div>
               <div>
                   <h2 className="text-xl font-bold text-slate-900">Publishing Wizard</h2>
                   <p className="text-xs text-slate-500">
                       {step < 5 ? `Step ${step} of 4: Configuration` : 'Publication Complete'}
                   </p>
               </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
               <X size={20}/>
           </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-8 bg-white">
            
            {/* STEP 1: METADATA */}
            {step === 1 && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Tag size={20}/> Book Metadata</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Book Title</label>
                            <input value={metadata.title || ''} onChange={e => setMetadata({...metadata, title: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-200 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subtitle</label>
                            <input value={metadata.subtitle || ''} onChange={e => setMetadata({...metadata, subtitle: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-slate-600 focus:ring-2 focus:ring-primary-200 outline-none" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Author Name</label>
                                <input value={metadata.author || ''} onChange={e => setMetadata({...metadata, author: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-primary-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ISBN (Optional)</label>
                                <input value={metadata.isbn || ''} onChange={e => setMetadata({...metadata, isbn: e.target.value})} placeholder="978-..." className="w-full p-3 border border-slate-200 rounded-xl font-mono text-slate-600 focus:ring-2 focus:ring-primary-200 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: FRONT/BACK MATTER */}
            {step === 2 && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><List size={20}/> Front & Back Matter</h3>
                    
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700">Copyright Page</label>
                            <button onClick={handleGenCopyright} className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1"><Sparkles size={12}/> Auto-Generate</button>
                        </div>
                        <textarea value={frontMatter.copyright || ''} onChange={e => setFrontMatter({...frontMatter, copyright: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg text-xs text-slate-600 h-24 resize-none focus:ring-2 focus:ring-primary-200 outline-none" placeholder="Copyright © 2024..." />
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700">Dedication</label>
                            <button onClick={handleGenDedication} disabled={isGeneratingDedication} className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1">{isGeneratingDedication ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Auto-Generate</button>
                        </div>
                        <input value={frontMatter.dedication || ''} onChange={e => setFrontMatter({...frontMatter, dedication: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-primary-200 outline-none" placeholder="To my cat..." />
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700">About the Author</label>
                            <button onClick={handleGenBio} disabled={isGeneratingBio} className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1">{isGeneratingBio ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Auto-Write Bio</button>
                        </div>
                        <textarea value={frontMatter.aboutAuthor || ''} onChange={e => setFrontMatter({...frontMatter, aboutAuthor: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-600 h-32 resize-none focus:ring-2 focus:ring-primary-200 outline-none" placeholder="Short biography..." />
                    </div>

                    <div className={`flex items-center gap-3 p-4 border rounded-xl ${totalSources > 0 ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                        <input 
                            type="checkbox" 
                            checked={!!backMatter.includeBibliography && totalSources > 0} 
                            onChange={e => setBackMatter({...backMatter, includeBibliography: e.target.checked})} 
                            disabled={totalSources === 0}
                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 disabled:opacity-50" 
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-700">Include Reference Page</span>
                                {totalSources > 0 ? (
                                    <span className="text-xs sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                        {totalSources} Citations Found
                                    </span>
                                ) : (
                                    <span className="text-xs sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
                                        No Citations Found
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {totalSources > 0 
                                    ? "Automatically compile a formatted list of verified sources at the end of the book." 
                                    : "No verified sources were detected in your project outline."}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: COVER */}
            {step === 3 && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4 text-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2"><ImageIcon size={20}/> Cover Design</h3>
                    <div className="aspect-[2/3] max-w-sm mx-auto bg-slate-100 rounded-xl shadow-lg overflow-hidden border border-slate-200 relative group">
                        {data.coverImage ? (
                            <>
                                <img src={data.coverImage} className="w-full h-full object-cover" alt="Cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button onClick={handleOpenCoverStudio} className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2">
                                        <Palette size={14}/> Edit Cover
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={handleOpenCoverStudio}>
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                    <Palette size={24} className="text-primary-600"/>
                                </div>
                                <span className="text-sm font-bold text-slate-600">Create Cover Design</span>
                                <span className="text-xs text-slate-400 mt-2">Open Studio</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-slate-500">Ensure your cover is high-resolution before publishing.</p>
                </div>
            )}

            {/* STEP 4: PREVIEW */}
            {step === 4 && (
                <div className="max-w-5xl mx-auto space-y-4 animate-in slide-in-from-right-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Final Preview</h3>
                        <p className="text-sm text-slate-500">Preview your ebook across Phone, Tablet, and Desktop. Use the Contents panel to jump to any section.</p>
                    </div>
                    <KDPPreview
                        title={metadata.title}
                        subtitle={metadata.subtitle}
                        author={metadata.author}
                        coverImage={data.coverImage}
                        frontMatter={frontMatter}
                        backMatter={backMatter}
                        outline={data.outline || []}
                        design={data.design}
                    />
                </div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === 5 && (
                <div className="h-full flex flex-col animate-in zoom-in-95 duration-500">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <CheckCircle2 size={32}/>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-2">Published Successfully!</h3>
                        <p className="text-slate-500">Your book is ready for the world.</p>
                    </div>

                    <div className="flex justify-center gap-1 sm:gap-2 mb-6 border-b border-slate-100 pb-1 overflow-x-auto">
                        <button onClick={() => setSuccessTab('downloads')} className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${successTab === 'downloads' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Downloads</button>
                        <button onClick={() => setSuccessTab('store')} className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${successTab === 'store' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Marketing Kit</button>
                        <button onClick={() => setSuccessTab('audio')} className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${successTab === 'audio' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><Headphones size={14}/> Audiobook</button>
                    </div>

                    <div className="flex-grow overflow-y-auto px-4">
                        {successTab === 'downloads' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                <button
                                    onClick={handleDownloadEPUB}
                                    disabled={isDownloadingEPUB || !finalDownloadableData}
                                    className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-primary-300 hover:bg-primary-50 transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-slate-400 group-hover:text-primary-600">
                                        {isDownloadingEPUB ? <Loader2 size={24} className="animate-spin" /> : <Book size={24}/>}
                                    </div>
                                    <div className="font-bold text-slate-900 mb-1">{isDownloadingEPUB ? 'Building EPUB...' : 'Download EPUB'}</div>
                                    <div className="text-xs text-slate-500">Standard ebook format for Kindle, Apple Books, Kobo.</div>
                                </button>

                                <button
                                    onClick={handleDownloadDOCX}
                                    disabled={isDownloadingDOCX || !finalDownloadableData}
                                    className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600">
                                        {isDownloadingDOCX ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24}/>}
                                    </div>
                                    <div className="font-bold text-slate-900 mb-1">{isDownloadingDOCX ? 'Building DOCX...' : 'Download DOCX'}</div>
                                    <div className="text-xs text-slate-500">Word document for editing or print layout.</div>
                                </button>
                            </div>
                        )}

                        {successTab === 'audio' && (
                            <div className="max-w-xl mx-auto space-y-6">
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                                    <div className="w-12 h-12 bg-white text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Headphones size={24}/>
                                    </div>
                                    <h4 className="text-heading text-slate-900 mb-2">Audiobook Studio</h4>
                                    <p className="text-body text-slate-500 text-xs mb-6">
                                        Generate a complete audiobook narrating every chapter of your book.
                                        This process consumes significant AI quota.
                                    </p>

                                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-left mb-6">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Voice Selection</label>
                                        <div className="space-y-2">
                                            {VOICES.map(voice => (
                                                <div key={voice.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selectedVoice === voice.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                                    <label className="flex items-center gap-3 cursor-pointer flex-grow">
                                                        <input 
                                                            type="radio" 
                                                            name="voice" 
                                                            value={voice.id} 
                                                            checked={selectedVoice === voice.id} 
                                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                                            className="text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">{voice.label}</div>
                                                            <div className="text-xs text-slate-500">{voice.desc}</div>
                                                        </div>
                                                    </label>
                                                    <button
                                                        onClick={(e) => handleVoicePreview(e, voice.id)}
                                                        className={`p-2 rounded-full transition-colors flex-shrink-0 ${previewingVoice === voice.id ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                                                        title="Preview Voice"
                                                    >
                                                        {previewingVoice === voice.id ? <Square size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2 block">Quality Tier</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setSelectedQuality('standard')}
                                                className={`flex-1 p-2 text-xs font-bold rounded-lg border ${selectedQuality === 'standard' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                                            >
                                                Standard (Fast)
                                            </button>
                                            <button 
                                                onClick={() => setSelectedQuality('premium')}
                                                className={`flex-1 p-2 text-xs font-bold rounded-lg border ${selectedQuality === 'premium' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                                            >
                                                Premium (High Fidelity)
                                            </button>
                                        </div>
                                    </div>

                                    {isGeneratingAudio ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                                <span>Generating...</span>
                                                <span>{audioProgress}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${audioProgress}%` }}></div>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">Please do not close this window.</p>
                                        </div>
                                    ) : audiobookBlob ? (
                                        <button 
                                            onClick={() => {
                                                const url = URL.createObjectURL(audiobookBlob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = `${metadata.title.replace(/\s+/g, '_')}_Audiobook.zip`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                URL.revokeObjectURL(url);
                                            }}
                                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={16}/> Download Audiobook
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleGenerateAudiobook}
                                            disabled={finalDownloadableData?.audiobookGenerated || isGeneratingAudio}
                                            className={`w-full py-3 ${finalDownloadableData?.audiobookGenerated ? 'bg-slate-400' : 'bg-indigo-600'} text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2`}
                                        >
                                            <Mic size={16}/> {finalDownloadableData?.audiobookGenerated ? 'Audiobook Generated' : 'Generate Audiobook'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {successTab === 'store' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                {isGeneratingAssets ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Loader2 size={32} className="animate-spin mx-auto mb-4 text-primary-600"/>
                                        <p className="text-sm font-bold">Generating Marketing Assets...</p>
                                        <p className="text-xs mt-2">Creating 3D mockups, social posts, and ad copy.</p>
                                    </div>
                                ) : (
                                    assets ? (
                                        <div className="space-y-6">
                                            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex gap-6 items-center">
                                                {mockup && <img src={mockup} className="h-32 w-auto object-contain rounded-lg bg-white/10" alt="3D Mockup"/>}
                                                <div>
                                                    <h4 className="font-bold text-lg mb-1">Promotional Kit Ready</h4>
                                                    <p className="text-sm text-slate-300 mb-4">Includes social media posts, A+ content, and sales copy.</p>
                                                    <button
                                                        onClick={async () => {
                                                            if (!finalDownloadableData) return;
                                                            // Await background image generation so all images are in the zip
                                                            if (marketingImagePromiseRef.current) {
                                                                await marketingImagePromiseRef.current;
                                                                marketingImagePromiseRef.current = null;
                                                            }
                                                            await generateMarketingAssetsZip(finalDownloadableData);
                                                        }}
                                                        disabled={!isMarketingImagesReady}
                                                        className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                                    >
                                                        {isMarketingImagesReady ? 'Download All Assets' : 'Generating Images…'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Pricing Strategy</div>
                                                    <div className="text-xl font-black text-slate-900">${kindlePrice} <span className="text-sm font-normal text-slate-500">eBook</span></div>
                                                    <div className="text-xl font-black text-slate-900">${paperbackPrice} <span className="text-sm font-normal text-slate-500">Print</span></div>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Keywords</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {assets?.keywords && assets.keywords.slice(0,5).map(k => <span key={k} className="px-2 sm:px-1.5 py-0.5 bg-slate-100 rounded text-xs sm:text-[10px] text-slate-600">{k}</span>)}
                                                        {assets?.keywords && assets.keywords.length > 5 && <span className="px-2 sm:px-1.5 py-0.5 bg-slate-100 rounded text-xs sm:text-[10px] text-slate-600">+{assets.keywords.length - 5} more</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* New Marketing Assets Display */}
                                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-4">Ad Creatives & Graphics</div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {assets.facebookAdCreatives?.[0]?.image && (
                                                        <div className="space-y-2">
                                                            <img src={assets.facebookAdCreatives[0].image} className="w-full aspect-square object-cover rounded-lg border border-slate-100" alt="Facebook Ad" />
                                                            <div className="text-xs sm:text-[10px] font-bold text-slate-500 uppercase text-center">Facebook Ad</div>
                                                        </div>
                                                    )}
                                                    {assets.socialMediaGraphics?.[0]?.image && (
                                                        <div className="space-y-2">
                                                            <img src={assets.socialMediaGraphics[0].image} className="w-full aspect-square object-cover rounded-lg border border-slate-100" alt="Social Media Graphic" />
                                                            <div className="text-xs sm:text-[10px] font-bold text-slate-500 uppercase text-center">Social Graphic</div>
                                                        </div>
                                                    )}
                                                    {assets.quoteGraphics?.[0]?.image && (
                                                        <div className="space-y-2">
                                                            <img src={assets.quoteGraphics[0].image} className="w-full aspect-square object-cover rounded-lg border border-slate-100" alt="Quote Graphic" />
                                                            <div className="text-xs sm:text-[10px] font-bold text-slate-500 uppercase text-center">Quote Graphic</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-400 py-12">Failed to load assets.</div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>

        {/* Footer Navigation */}
        {step < 5 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <button 
                    onClick={handleBack} 
                    disabled={step === 1 || loading} 
                    className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    Back
                </button>
                <div className="flex gap-2">
                    {step < 4 ? (
                        <button 
                            onClick={handleNext} 
                            className="bg-slate-900 hover:bg-primary-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                            Next Step <ArrowRight size={16}/>
                        </button>
                    ) : (
                        isDemoMode ? (
                            <div className="flex flex-col items-end gap-2">
                                <button 
                                    disabled
                                    className="bg-slate-400 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 opacity-70 cursor-not-allowed"
                                >
                                    <CheckCircle2 size={16}/>
                                    Publish Now
                                </button>
                                <p className="text-xs text-slate-500">Sign up for a subscription to publish your book</p>
                            </div>
                        ) : (
                        <button 
                            onClick={performPublish} 
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                            {loading ? 'Publishing...' : 'Publish Now'}
                        </button>
                        )
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PublishWizard;
