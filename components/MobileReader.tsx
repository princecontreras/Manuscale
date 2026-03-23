
"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { Bookmark, ChevronLeft, Type, Wifi, Battery, BookOpen } from 'lucide-react';
import { OutlineItem, DesignSettings } from '../types';
import DOMPurify from 'dompurify';

interface MobileReaderProps {
    title: string;
    outline: OutlineItem[];
    design?: DesignSettings;
    containerHeight?: number; // Optional override for scaling
}

export const MobileReader: React.FC<MobileReaderProps> = ({ title, outline, design, containerHeight }) => {
    const [chapterIdx, setChapterIdx] = useState(0);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [showChrome, setShowChrome] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [scale, setScale] = useState(1);
    const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('sepia');
    const [fontSize, setFontSize] = useState(100);
    const [font, setFont] = useState(design?.fontFamily || "'Merriweather', serif");

    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter for valid chapters (completed content)
    const validChapters = useMemo(() => outline.filter(o => o.status === 'completed' && o.content), [outline]);
    const currentChapter = validChapters[chapterIdx];

    const paraClass = design?.paragraphStyle === 'block' ? 'paragraph-block' : 'paragraph-indent';
    const dropCapClass = (design?.dropCaps) ? 'drop-caps' : '';

    useEffect(() => {
        const handleResize = () => {
            const h = containerHeight || window.innerHeight;
            const w = window.innerWidth;
            const phoneWidth = 403; // 375 + 28 border
            const phoneHeight = 840;
            const padding = 40;
            const scaleH = Math.min(1, (h - padding) / phoneHeight);
            const scaleW = Math.min(1, (w - padding) / phoneWidth);
            const newScale = Math.min(scaleH, scaleW);
            setScale(newScale);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [containerHeight]);

    const calculatePages = useCallback(() => {
        if (contentRef.current && containerRef.current) {
            const scrollW = contentRef.current.scrollWidth;
            const clientW = containerRef.current.clientWidth;
            const pages = Math.ceil(scrollW / clientW);
            setTotalPages(Math.max(1, pages));
        }
    }, [currentChapter, fontSize, font, theme]);

    useLayoutEffect(() => {
        const timer = setTimeout(calculatePages, 50);
        return () => clearTimeout(timer);
    }, [calculatePages, chapterIdx, fontSize, font, theme]);

    useEffect(() => setPage(0), [chapterIdx]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (page < totalPages - 1) {
            setPage(p => p + 1);
        } else if (chapterIdx < validChapters.length - 1) {
            setChapterIdx(c => c + 1);
            setPage(0);
        }
    }, [page, totalPages, chapterIdx, validChapters.length]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (page > 0) {
            setPage(p => p - 1);
        } else if (chapterIdx > 0) {
            setChapterIdx(c => c - 1);
            setPage(0); 
        }
    }, [page, chapterIdx]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === ' ') { e.preventDefault(); handleNext(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

    const themeColors = {
        light: 'bg-[#faf9f6] text-slate-900',
        sepia: 'bg-[#f4ecd8] text-[#5b4636]',
        dark: 'bg-[#1a1a1a] text-[#b0b0b0]'
    };

    const sanitizedContent = useMemo(() => {
        return currentChapter?.content ? DOMPurify.sanitize(currentChapter.content) : '';
    }, [currentChapter]);

    const progress = useMemo(() => {
        if (validChapters.length === 0) return 0;
        const chapterPart = (page + 1) / totalPages;
        return ((chapterIdx + chapterPart) / validChapters.length) * 100;
    }, [chapterIdx, page, totalPages, validChapters.length]);

    return (
       <div className="flex items-center justify-center min-h-full w-full py-4 select-none origin-top overflow-hidden">
           <div 
                className="relative bg-white border-[14px] border-slate-900 rounded-[3rem] shadow-2xl overflow-hidden ring-1 ring-black/5 transition-transform duration-300 ease-out"
                style={{ width: '375px', height: '800px', transform: `scale(${scale})`, transformOrigin: 'center center' }}
            >
               <div className={`absolute top-0 left-0 right-0 h-12 z-30 flex justify-between items-center px-6 pt-2 text-[10px] font-bold transition-colors duration-300 pointer-events-none ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                   <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   <div className="flex items-center gap-1.5"><Wifi size={10}/><Battery size={10}/></div>
               </div>

               <div className={`absolute top-0 left-0 right-0 h-24 z-20 flex items-end justify-between px-5 pb-4 transition-all duration-300 ${showChrome ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${theme === 'dark' ? 'bg-gradient-to-b from-black/90 to-transparent text-white' : 'bg-gradient-to-b from-white/95 to-transparent text-slate-800'}`}>
                   <button className="p-2 opacity-50 hover:opacity-100 transition-opacity"><ChevronLeft size={20}/></button> 
                   <div className="flex flex-col items-center pb-1">
                       <span className="text-[10px] font-bold uppercase tracking-widest line-clamp-1 max-w-[150px] opacity-70 mb-0.5">{title}</span>
                       <span className="text-[9px] opacity-50 font-medium">
                           {currentChapter ? (currentChapter.chapterNumber > 0 ? `Chapter ${currentChapter.chapterNumber}` : 'Front Matter') : 'Start'}
                       </span>
                   </div>
                   <button className="p-2 opacity-50 hover:opacity-100 transition-opacity"><Bookmark size={18} className="fill-current"/></button>
               </div>

               <div className={`w-full h-full relative ${themeColors[theme]} transition-colors duration-300 overflow-hidden`}>
                   <div className="absolute inset-y-0 left-0 w-[30%] z-10 cursor-w-resize active:bg-black/5 transition-colors" onClick={handlePrev}></div>
                   <div className="absolute inset-y-0 right-0 w-[30%] z-10 cursor-e-resize active:bg-black/5 transition-colors" onClick={handleNext}></div>
                   <div className="absolute inset-y-0 left-[30%] right-[30%] z-10 cursor-pointer" onClick={() => { setShowChrome(!showChrome); setShowSettings(false); }}></div>

                   {currentChapter ? (
                       <div className="w-full h-full pt-20 pb-16 px-6 box-border" ref={containerRef}>
                           <div 
                                ref={contentRef} 
                                className={`h-full max-w-none transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] book-content ${paraClass} ${dropCapClass}`} 
                                style={{ 
                                    columnWidth: 'calc(100% - 0px)', 
                                    columnGap: '48px',
                                    columnFill: 'auto', 
                                    height: '100%', 
                                    overflow: 'visible',
                                    transform: `translateX(calc(-${page} * (100% + 48px)))`, 
                                    '--ebook-font': font,
                                    '--font-size': `${(parseInt(design?.fontSize || '11pt') * fontSize / 100)}pt`,
                                    '--line-height': design?.lineHeight || '1.6',
                                    textAlign: design?.justification === 'justify' ? 'justify' : 'left',
                                    hyphens: 'auto', 
                                    color: 'inherit',
                                    fontFamily: 'var(--ebook-font)',
                                    fontSize: 'var(--font-size)',
                                    lineHeight: 'var(--line-height)'
                                } as React.CSSProperties} 
                                dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
                            />
                       </div>
                   ) : (
                       <div className="flex items-center justify-center h-full text-xs font-bold opacity-50 flex-col gap-2"><BookOpen size={24}/><span>End of Book</span></div>
                   )}
               </div>

               <div className={`absolute bottom-0 left-0 right-0 h-16 z-20 flex flex-col justify-end px-6 pb-4 transition-all duration-300 ${showChrome ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} ${theme === 'dark' ? 'bg-black/90 text-white' : 'bg-white/95 text-slate-800'} backdrop-blur-md border-t ${theme === 'dark' ? 'border-white/10' : 'border-black/5'}`}>
                    <div className="flex items-center gap-4 mb-1">
                        <span className="text-[10px] font-bold opacity-50 w-8 text-right">0%</span>
                        <div className="flex-1 h-1 bg-current opacity-10 rounded-full overflow-hidden relative"><div className="h-full bg-current opacity-50 transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                        <span className="text-[10px] font-bold opacity-50 w-8">{Math.round(progress)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest pl-1">Page {page + 1} of {totalPages}</div>
                        <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="p-2 opacity-70 hover:opacity-100 transition-opacity"><Type size={20}/></button>
                    </div>
               </div>

               {showSettings && (
                   <div className="absolute bottom-16 left-4 right-4 bg-white rounded-2xl shadow-2xl z-30 p-4 border border-slate-200 animate-in slide-in-from-bottom-2 text-slate-800" onClick={(e) => e.stopPropagation()}>
                       <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">{['light', 'sepia', 'dark'].map(t => (<button key={t} onClick={() => setTheme(t as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${theme === t ? 'bg-white shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-slate-200'}`}>{t}</button>))}</div>
                       <div className="flex items-center gap-4 mb-4 px-2"><span className="text-xs font-bold text-slate-400">A</span><input type="range" min="80" max="150" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"/><span className="text-lg font-bold text-slate-900">A</span></div>
                       <div className="grid grid-cols-2 gap-2"><button onClick={() => setFont("'Merriweather', serif")} className={`px-3 py-2 rounded-lg text-xs font-serif border transition-all ${font.includes('Merriweather') ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:bg-slate-50'}`}>Merriweather</button><button onClick={() => setFont("'Inter', sans-serif")} className={`px-3 py-2 rounded-lg text-xs font-sans border transition-all ${font.includes('Inter') ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:bg-slate-50'}`}>Inter</button></div>
                   </div>
               )}
           </div>
       </div>
    );
};
