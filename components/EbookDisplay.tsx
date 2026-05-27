
"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { EbookData, FrontMatter, OutlineItem, DesignSettings, Annotation, BackMatter, ProjectMemory } from '../types';
import { streamChapterContent, performMagicRefinement, analyzeChapterAftermath, proofreadChapter } from '../services/aiClient';
import { loadLocal, saveLocal, getProjectMemoryKey } from '../services/storage';
import { paginateContent } from '../utils/pagination';
import PublishWizard from './PublishWizard';
import { MobileReader } from './MobileReader';
import useUndoRedo from '../hooks/useUndoRedo';
import DOMPurify from 'dompurify';
import { Image as ImageIcon, Bold, Italic, Underline, Heading1, Heading2, Heading3, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, Sparkles, Wand2, Edit3, CheckCircle2, Loader2, ArrowRight, ArrowLeft, X, AlertTriangle, BookOpen, Palette, ListOrdered, Quote, Trash2, Check, RefreshCw, Feather, Undo, Redo, MoveVertical, CheckCheck, Scissors, Brain, Users, Globe, Book, FileText, Database, Zap, ChevronLeft, ChevronRight, Table, Info } from 'lucide-react';
import { useToast } from './ToastContext';
import { Button } from './Button';

const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'div', 'span', 'section', 'article',
                   'strong', 'b', 'em', 'i', 'u', 'mark', 'small', 'del', 'ins', 'sup', 'sub',
                   'ol', 'ul', 'li', 'dl', 'dt', 'dd',
                   'blockquote', 'quote', 'pre', 'code',
                   'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'col', 'colgroup',
                   'a', 'img', 'figure', 'figcaption',
                   'video', 'audio', 'source', 'iframe',
                   'details', 'summary',
                   'cite', 'abbr', 'address', 'time'],
    ALLOWED_ATTR: ['class', 'style', 'id', 'href', 'src', 'alt', 'title', 'width', 'height', 'data-*', 'aria-*']
};

interface EbookDisplayProps {
  data: EbookData;
  onUpdate: (pages: string[], frontMatter?: FrontMatter, extra?: Partial<EbookData>) => void;
  onSetCover: (image: string | null) => void;
  onOpenCoverStudio: (fromWizard?: boolean) => void;
  onOpenCoAuthor: () => void;
  onBackToDashboard?: () => void;

  initialWizardState?: boolean;
  onResetWizardState?: () => void;
  isDemoMode?: boolean;
}

const NON_FICTION_DESIGN: DesignSettings = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "11pt",
    lineHeight: "1.8", 
    dropCaps: false,
    justification: 'left', 
    paragraphStyle: 'block', 
    chapterDecoration: false,
    theme: 'modern'
};

const getSmartDesign = (type?: string): DesignSettings => {
    return NON_FICTION_DESIGN; // Default to Non-Fiction now
};

interface ManuscriptState {
    outline: OutlineItem[];
    annotations: Annotation[];
    design: DesignSettings;
    frontMatter: FrontMatter;
    backMatter: BackMatter;
}

// --- HELPER COMPONENTS ---

const SelectionMenu: React.FC<{ 
    position: { top: number, left: number } | null, 
    onAction: (action: string) => void,
    onFormat: (cmd: string, val?: string) => void,
    onClose: () => void 
}> = ({ position, onAction, onFormat, onClose }) => {
    if (!position) return null;

    return (
        <div 
            className="fixed z-50 flex flex-col bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 selection-menu-enter transform -translate-x-1/2 -translate-y-full"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
            {/* Formatting Row */}
            <div className="flex items-center p-1 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onFormat('bold'); }} className="p-1.5"><Bold size={14}/></Button>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onFormat('italic'); }} className="p-1.5"><Italic size={14}/></Button>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onFormat('underline'); }} className="p-1.5"><Underline size={14}/></Button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onFormat('formatBlock', 'h2'); }} className="p-1.5"><Heading2 size={14}/></Button>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onFormat('formatBlock', 'h3'); }} className="p-1.5"><Heading3 size={14}/></Button>
            </div>
            
            {/* AI Tools Row */}
            <div className="flex items-center p-1 gap-0.5">
                <div className="flex items-center px-2 border-r border-slate-100 mr-1">
                    <Sparkles size={14} className="text-primary-500 mr-1"/>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI</span>
                </div>
                
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onAction('clarify'); }} className="px-2 py-1.5 text-xs font-medium" title="Make it clearer">
                    Clarify
                </Button>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onAction('academic'); }} className="px-2 py-1.5 text-xs font-medium" title="Academic Tone">
                    Academic
                </Button>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onAction('expand'); }} className="px-2 py-1.5 text-xs font-medium" title="Add detail">
                    Expand
                </Button>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onAction('summarize'); }} className="px-2 py-1.5 text-xs font-medium" title="Summarize">
                    Summarize
                </Button>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onAction('critique'); }} className="px-2 py-1.5 text-xs font-medium" title="Critique & Improve">
                    Critique
                </Button>

                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); onClose(); }} className="p-1.5"><X size={14}/></Button>
            </div>
        </div>
    );
};

const ChapterEditor = React.memo<{ 
    html: string, 
    onChange: (html: string) => void, 
    design: DesignSettings,
    isDemoMode?: boolean 
}>(({ html, onChange, design, isDemoMode }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isTyping = useRef(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number, left: number } | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    useLayoutEffect(() => {
        if (editorRef.current) {
            const currentHtml = editorRef.current.innerHTML;
            // Only update if content actually differs to prevent cursor loss
            if (currentHtml !== html) {
                // Clear typing flag for external updates (undo/redo)
                // This ensures undo/redo updates apply immediately
                const wasTyping = isTyping.current;
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = null;
                }
                isTyping.current = false;
                
                // Preserve cursor position if possible
                const selection = window.getSelection();
                let cursorOffset = 0;
                if (selection && selection.rangeCount > 0 && wasTyping) {
                    // Only preserve cursor if user was actively typing (not undo/redo)
                    const range = selection.getRangeAt(0);
                    const preRange = range.cloneRange();
                    preRange.selectNodeContents(editorRef.current);
                    preRange.setEnd(range.endContainer, range.endOffset);
                    cursorOffset = preRange.toString().length;
                }
                
                editorRef.current.innerHTML = html;
                
                // Restore cursor position if we had one from typing (not undo/redo)
                if (cursorOffset > 0 && selection && wasTyping) {
                    const range = document.createRange();
                    let charCount = 0;
                    let found = false;
                    
                    const traverse = (node: Node) => {
                        if (found) return;
                        if (node.nodeType === Node.TEXT_NODE) {
                            const nextCharCount = charCount + (node as any).length;
                            if (nextCharCount >= cursorOffset) {
                                range.setStart(node, cursorOffset - charCount);
                                found = true;
                                return;
                            }
                            charCount = nextCharCount;
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            for (let child of node.childNodes) {
                                traverse(child);
                                if (found) return;
                            }
                        }
                    };
                    
                    traverse(editorRef.current);
                    if (found) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            }
        }
    }, [html]);

    const handleInput = () => {
        isTyping.current = true;
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        // Clear existing timeout to reset the timer
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => { 
            isTyping.current = false;
            typingTimeoutRef.current = null;
        }, 500); 
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const handleSelect = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
            setMenuPos(null);
            return;
        }
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (selection.toString().trim().length > 5) {
            // Account for scroll offset to position menu correctly
            const scrollOffset = window.scrollY;
            // Position above selection, centered horizontally
            setMenuPos({ 
                top: rect.top + scrollOffset - 8,
                left: rect.left + (rect.width / 2) 
            });
        } else {
            setMenuPos(null);
        }
    };

    const handleFormat = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const performAIAction = async (action: string) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        
        const text = selection.toString();
        const range = selection.getRangeAt(0);
        
        setIsThinking(true);
        setMenuPos(null); 

        try {
            let instruction = "";
            switch (action) {
                case 'clarify': instruction = "Rewrite this to be crystal clear, removing jargon and simplifying complex sentences. Make it easy to understand for a general audience."; break;
                case 'academic': instruction = "Rewrite this in a highly professional, academic, and authoritative tone. Use precise terminology suitable for a non-fiction book."; break;
                case 'expand': instruction = "Expand on this idea. Add more depth, context, or examples to flesh out the concept thoroughly."; break;
                case 'summarize': instruction = "Summarize this text into a concise, punchy overview. Highlight the key takeaways."; break;
                case 'critique': instruction = "Critique this text for logical flow, clarity, and impact, then provide a rewritten version that addresses these flaws. Return ONLY the improved rewritten version."; break;
            }

            const refined = await performMagicRefinement(text, instruction);
            
            range.deleteContents();
            // Wrap refined content in a paragraph to preserve styling
            const wrappedRefined = `<p>${refined}</p>`;
            try {
                const fragment = document.createRange().createContextualFragment(wrappedRefined);
                range.insertNode(fragment);
                
                // Ensure updated content includes proper paragraph classes
                if (editorRef.current) {
                    onChange(editorRef.current.innerHTML);
                }
            } catch (parseError) {
                // If wrapping fails, try plain insertion
                const fragment = document.createRange().createContextualFragment(refined);
                range.insertNode(fragment);
                if (editorRef.current) onChange(editorRef.current.innerHTML);
            }
            
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to refine text';
            console.error('AI refinement error:', errorMsg);
            // Could integrate with toast notification here if available
        } finally {
            setIsThinking(false);
        }
    };

    const styles: React.CSSProperties = {
        fontFamily: design.fontFamily,
        fontSize: design.fontSize,
        lineHeight: design.lineHeight,
        textAlign: design.justification === 'justify' ? 'justify' : 'left',
        '--ebook-font': design.fontFamily,
        '--font-size': design.fontSize,
        '--line-height': design.lineHeight,
        '--paragraph-spacing': design.paragraphSpacing || '0',
        '--first-line-indent': design.firstLineIndent || '0',
        '--block-indent': design.blockIndent || '0',
    } as React.CSSProperties;
    
    const paraClass = design.paragraphStyle === 'block' ? 'paragraph-block' : 'paragraph-indent';

    return (
        <div className="w-full max-w-full sm:max-w-[8.5in] mx-auto bg-white shadow-md sm:shadow-xl min-h-[auto] sm:min-h-[11in] p-3 sm:p-6 md:p-[1in] mb-6 sm:mb-10 transition-all relative group" style={styles as any}>
             <div className="absolute inset-0 pointer-events-none border border-slate-100 m-3 sm:m-6 md:m-[1in] opacity-0 group-hover:opacity-100 transition-opacity"></div>
             
             {isThinking && (
                 <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-primary-100 text-primary-600 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold animate-pulse z-10">
                     <Sparkles size={14}/> Polishing...
                 </div>
             )}

             <SelectionMenu position={menuPos} onAction={performAIAction} onFormat={handleFormat} onClose={() => setMenuPos(null)} />

            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onMouseUp={handleSelect}
                onKeyUp={handleSelect}
                className={`outline-none focus:outline-none book-content ${paraClass}`}
                style={{ ...styles, minHeight: '9in' } as React.CSSProperties}
                spellCheck="true"
            />
        </div>
    );
});

const ContextReviewDialog: React.FC<{ 
    newLore: ProjectMemory, 
    onAdd: (items: ProjectMemory) => void, 
    onDiscard: () => void 
}> = ({ newLore, onAdd, onDiscard }) => {
    const totalItems = newLore.keyFigures.length + newLore.glossary.length + newLore.concepts.length;
    if (totalItems === 0) return null;
    
    return (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-8 sm:right-8 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-2xl border border-slate-700 w-full sm:w-80">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center animate-pulse">
                            <Brain size={20} className="text-white"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">New Concepts Found</h4>
                            <p className="text-[10px] text-slate-400">Found {totalItems} items to index.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onDiscard} className="p-1"><X size={16}/></Button>
                </div>
                
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                    {newLore.keyFigures.map((c, i) => (
                        <div key={i} className="bg-slate-800 p-2 rounded-lg border border-slate-700 text-xs">
                            <div className="font-bold text-primary-400 flex items-center gap-2"><Users size={12}/> {c.name}</div>
                            <div className="text-slate-400 line-clamp-1">{c.description}</div>
                        </div>
                    ))}
                    {newLore.concepts.map((w, i) => (
                        <div key={i} className="bg-slate-800 p-2 rounded-lg border border-slate-700 text-xs">
                            <div className="font-bold text-amber-400 flex items-center gap-2"><FileText size={12}/> {w.name}</div>
                            <div className="text-slate-400 line-clamp-1">{w.description}</div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={onDiscard} className="flex-1">Ignore</Button>
                    <Button variant="primary" size="sm" onClick={() => onAdd(newLore)} className="flex-1">Add to Vault</Button>
                </div>
            </div>
        </div>
    );
};

const NavigationSidebar: React.FC<{ 
    outline: OutlineItem[], 
    activeChapterId: string | null, 
    onNavigate: (id: string) => void,
    onClose: () => void 
}> = ({ outline, activeChapterId, onNavigate, onClose }) => {
    return (
        <div className="fixed top-0 left-0 h-full w-[85vw] sm:w-80 max-w-80 bg-white shadow-2xl border-r border-slate-200 z-50 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><List size={18}/> Contents</h3>
                <Button variant="ghost" size="sm" onClick={onClose} className="p-1" title="Close Panel"><X size={20} className="text-slate-400 hover:text-slate-600"/></Button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {outline.map((item, idx) => {
                    const isActive = item.id === activeChapterId;
                    return (
                        <div 
                            key={item.id} 
                            onClick={() => {
                                onNavigate(item.id);
                                const el = document.getElementById(`chapter-${item.id}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer group active:scale-95 ${isActive ? 'bg-primary-50 border-primary-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>Chapter {item.chapterNumber}</span>
                                <span className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-action-400' : item.status === 'writing' ? 'bg-amber-400' : 'bg-slate-300'}`}></span>
                            </div>
                            <div className={`text-sm font-bold leading-tight ${isActive ? 'text-primary-900' : 'text-slate-700'}`}>{item.title}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const EditorToolbar: React.FC<{ activeFormats: Record<string, boolean>; onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean; onFormat?: (cmd: string, val?: string) => void; }> = ({ activeFormats, onUndo, onRedo, canUndo, canRedo, onFormat }) => {
    const handleAction = (e: React.MouseEvent, cmd: string, val?: string) => { 
        e.preventDefault(); 
        if (onFormat) { onFormat(cmd, val); } else { document.execCommand(cmd, false, val); } 
    };
    
    const insertPageBreak = () => {
        const hr = `<hr class="page-break" style="page-break-after: always; border-top: 1px dashed #ccc; margin: 2em 0;" title="Page Break">`;
        document.execCommand('insertHTML', false, hr);
    };

    const insertTable = () => {
        const table = `<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;">
            <thead>
                <tr>
                    <th style="border: 1px solid #cbd5e1; padding: 0.5em; background-color: #f8fafc;">Header 1</th>
                    <th style="border: 1px solid #cbd5e1; padding: 0.5em; background-color: #f8fafc;">Header 2</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 0.5em;">Data 1</td>
                    <td style="border: 1px solid #cbd5e1; padding: 0.5em;">Data 2</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 0.5em;">Data 3</td>
                    <td style="border: 1px solid #cbd5e1; padding: 0.5em;">Data 4</td>
                </tr>
            </tbody>
        </table><p><br></p>`;
        document.execCommand('insertHTML', false, table);
    };

    const insertCallout = () => {
        const callout = `<div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 1em; margin: 1.5em 0; border-radius: 0 0.5em 0.5em 0;">
            <p style="margin: 0; color: #1e40af; font-weight: 500;"><strong>Note:</strong> Enter your callout text here.</p>
        </div><p><br></p>`;
        document.execCommand('insertHTML', false, callout);
    };

    const handleHistoryAction = (action: () => void) => {
        // Find and focus the contentEditable editor before calling undo/redo
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
            editor.focus();
        }
        // Call action immediately (no setTimeout delay)
        action();
    };
    const Btn = ({ cmd, val, icon: Icon, active, title, onClick, disabled }: any) => ( 
        <Button variant={active ? 'primary' : 'ghost'} size="sm" onMouseDown={onClick ? undefined : (e) => handleAction(e, cmd, val)} onClick={onClick} disabled={disabled} className={`p-1.5 md:p-2 ${active ? 'bg-primary-100 text-primary-700' : 'text-slate-600'}`} title={title}> <Icon size={16} strokeWidth={active ? 2.5 : 2} /> </Button> 
    );
    const Divider = () => <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>;
    return ( 
        <div className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm px-4 py-2 flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide"> 
            <Btn cmd="undo" icon={Undo} onClick={onUndo ? (e: any) => handleHistoryAction(onUndo) : undefined} title="Undo" disabled={onUndo && !canUndo} /> 
            <Btn cmd="redo" icon={Redo} onClick={onRedo ? (e: any) => handleHistoryAction(onRedo) : undefined} title="Redo" disabled={onRedo && !canRedo} /> 
            <Divider /> 
            <Btn cmd="formatBlock" val="h1" icon={Heading1} active={activeFormats.h1} title="Heading 1" /> 
            <Btn cmd="formatBlock" val="h2" icon={Heading2} active={activeFormats.h2} title="Heading 2" /> 
            <Btn cmd="formatBlock" val="h3" icon={Heading3} active={activeFormats.h3} title="Heading 3" /> 
            <Btn cmd="formatBlock" val="p" icon={Type} active={!activeFormats.h1 && !activeFormats.h2 && !activeFormats.h3} title="Paragraph" /> 
            <Divider /> 
            <Btn cmd="bold" icon={Bold} active={activeFormats.bold} title="Bold" /> 
            <Btn cmd="italic" icon={Italic} active={activeFormats.italic} title="Italic" /> 
            <Btn cmd="underline" icon={Underline} active={activeFormats.underline} title="Underline" /> 
            <Divider /> 
            <Btn cmd="justifyLeft" icon={AlignLeft} active={activeFormats.justifyLeft} title="Align Left" /> 
            <Btn cmd="justifyCenter" icon={AlignCenter} active={activeFormats.justifyCenter} title="Align Center" /> 
            <Btn cmd="justifyRight" icon={AlignRight} active={activeFormats.justifyRight} title="Align Right" /> 
            <Btn cmd="justifyFull" icon={AlignJustify} active={activeFormats.justifyFull} title="Justify" /> 
            <Divider /> 
            <Btn cmd="insertUnorderedList" icon={List} active={activeFormats.insertUnorderedList} title="Bullet List" /> 
            <Btn cmd="insertOrderedList" icon={ListOrdered} active={activeFormats.insertOrderedList} title="Numbered List" /> 
            <Btn cmd="formatBlock" val="blockquote" icon={Quote} active={activeFormats.blockquote} title="Blockquote" /> 
            <Divider /> 
            <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); insertTable(); }} className="p-1.5 md:p-2" title="Insert Table">
                <Table size={16} />
            </Button>
            <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); insertCallout(); }} className="p-1.5 md:p-2" title="Insert Callout Box">
                <Info size={16} />
            </Button>
            <Divider /> 
            <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); insertPageBreak(); }} className="p-1.5 md:p-2 gap-1" title="Insert Page Break">
                <MoveVertical size={16} /> Break
            </Button>
        </div> 
    );
};

const FormattingSidebar: React.FC<{ onClose: () => void, settings: DesignSettings, onUpdateSettings: (s: DesignSettings) => void }> = ({ onClose, settings, onUpdateSettings }) => {
    return (
        <div className="fixed top-0 right-0 h-full w-[85vw] sm:w-80 max-w-80 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"> <h3 className="font-bold text-slate-800 flex items-center gap-2"><Palette size={18}/> Formatting</h3> <Button variant="ghost" size="sm" onClick={onClose} className="p-1" title="Close Panel"><X size={20}/></Button> </div>
            <div className="p-6 flex-grow overflow-y-auto space-y-8"> 
                <section> 
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4"><Type size={12} className="inline mr-1"/> Text Formatting</h4> 
                    <div className="space-y-4"> 
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Font Style</label>
                            <select value={settings.fontFamily} onChange={(e) => onUpdateSettings({...settings, fontFamily: e.target.value})} className="w-full p-2 border rounded-lg text-sm">
                                <option value="'Merriweather', serif">Merriweather (Classic Serif)</option>
                                <option value="'Lora', serif">Lora (Modern Serif)</option>
                                <option value="'Roboto Slab', serif">Roboto Slab (Sturdy Serif)</option>
                                <option value="'Inter', sans-serif">Inter (Clean Sans)</option>
                                <option value="'Source Sans 3', sans-serif">Source Sans (Readable Sans)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Font Size</label>
                            <select value={settings.fontSize} onChange={(e) => onUpdateSettings({...settings, fontSize: e.target.value})} className="w-full p-2 border rounded-lg text-sm">
                                <option value="10pt">10pt (Small)</option>
                                <option value="11pt">11pt (Standard)</option>
                                <option value="12pt">12pt (Large)</option>
                                <option value="14pt">14pt (Extra Large)</option>
                            </select>
                        </div>
                    </div> 
                </section>
                <section> 
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4"><AlignLeft size={12} className="inline mr-1"/> Paragraph Formatting</h4> 
                    <div className="space-y-4"> 
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Line Spacing</label>
                            <select value={settings.lineHeight} onChange={(e) => onUpdateSettings({...settings, lineHeight: e.target.value})} className="w-full p-2 border rounded-lg text-sm">
                                <option value="1.2">1.2 (Tight)</option>
                                <option value="1.4">1.4 (Compact)</option>
                                <option value="1.6">1.6 (Standard)</option>
                                <option value="1.8">1.8 (Relaxed)</option>
                                <option value="2.0">2.0 (Double)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Paragraph Spacing</label>
                            <select value={settings.paragraphSpacing || '0em'} onChange={(e) => onUpdateSettings({...settings, paragraphSpacing: e.target.value})} className="w-full p-2 border rounded-lg text-sm">
                                <option value="0em">None</option>
                                <option value="0.5em">Small (0.5em)</option>
                                <option value="1em">Standard (1em)</option>
                                <option value="1.5em">Large (1.5em)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">First-line Indent</label>
                            <select value={settings.firstLineIndent || '0em'} onChange={(e) => onUpdateSettings({...settings, firstLineIndent: e.target.value})} className="w-full p-2 border rounded-lg text-sm">
                                <option value="0em">None</option>
                                <option value="1em">Small (1em)</option>
                                <option value="1.5em">Standard (1.5em)</option>
                                <option value="2em">Large (2em)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Block Indent</label>
                            <select value={settings.blockIndent || '0em'} onChange={(e) => onUpdateSettings({...settings, blockIndent: e.target.value})} className="w-full p-2 border rounded-lg text-sm">
                                <option value="0em">None</option>
                                <option value="1em">Small (1em)</option>
                                <option value="2em">Standard (2em)</option>
                                <option value="3em">Large (3em)</option>
                            </select>
                        </div>
                    </div> 
                </section>
            </div>
        </div>
    );
};

export const EbookDisplay: React.FC<EbookDisplayProps> = ({ 
    data, onUpdate, onSetCover, onOpenCoverStudio, onOpenCoAuthor, onBackToDashboard, initialWizardState, onResetWizardState, isDemoMode 
}) => {
    const { showToast } = useToast();
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'formatting' | 'context' | 'nav' | 'publish' | null>(initialWizardState ? 'publish' : null);
    
    const { state: manuscript, setState: setManuscript, undo, redo, canUndo, canRedo } = useUndoRedo<ManuscriptState>({
        outline: data.outline || [],
        annotations: data.annotations || [],
        design: data.design || NON_FICTION_DESIGN,
        frontMatter: data.frontMatter || {},
        backMatter: data.backMatter || {}
    });

    const [isWriting, setIsWriting] = useState(false);
    const [isProofreading, setIsProofreading] = useState(false);
    const [proofreadProgress, setProofreadProgress] = useState(0);
    const [streamContent, setStreamContent] = useState("");
    const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
    const [newLoreDetected, setNewLoreDetected] = useState<ProjectMemory | null>(null);

    useEffect(() => {
        if (!activeChapterId && manuscript.outline.length > 0) {
            setActiveChapterId(manuscript.outline[0].id);
        }
    }, [manuscript.outline, activeChapterId]);

    useEffect(() => {
        const checkFormat = () => {
            const formats: Record<string, boolean> = {};
            // Text formatting
            ['bold', 'italic', 'underline'].forEach(cmd => {
                formats[cmd] = document.queryCommandState(cmd);
            });
            // Heading formats
            ['h1', 'h2', 'h3'].forEach(cmd => {
                formats[cmd] = document.queryCommandState('formatBlock') && 
                               document.queryCommandValue('formatBlock') === cmd;
            });
            // Alignment
            ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach(cmd => {
                formats[cmd] = document.queryCommandState(cmd);
            });
            // Lists
            ['insertUnorderedList', 'insertOrderedList'].forEach(cmd => {
                formats[cmd] = document.queryCommandState(cmd);
            });
            // Block formatting
            formats['blockquote'] = document.queryCommandValue('formatBlock') === 'blockquote';
            setActiveFormats(formats);
        };
        document.addEventListener('selectionchange', checkFormat);
        // Also check on mouse/key events for immediate feedback
        document.addEventListener('mouseup', checkFormat);
        document.addEventListener('keyup', checkFormat);
        return () => {
            document.removeEventListener('selectionchange', checkFormat);
            document.removeEventListener('mouseup', checkFormat);
            document.removeEventListener('keyup', checkFormat);
        };
    }, []);



    const handleProofreadBook = async () => {
        if (isProofreading) return;
        setIsProofreading(true);
        setProofreadProgress(0);
        showToast("Starting full book proofread...", "info");

        try {
            const newOutline = [...manuscript.outline];
            const chaptersToProofread = newOutline.filter(c => c.content && c.content.trim().length > 0);
            
            if (chaptersToProofread.length === 0) {
                showToast("No content to proofread.", "info");
                setIsProofreading(false);
                return;
            }

            // Parallelize proofreading with a concurrency limit of 3
            const CONCURRENCY = 3;
            let completed = 0;
            
            for (let i = 0; i < chaptersToProofread.length; i += CONCURRENCY) {
                const chunk = chaptersToProofread.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(async (chapter) => {
                    const idx = newOutline.findIndex(c => c.id === chapter.id);
                    if (idx !== -1 && newOutline[idx].content) {
                        try {
                            const corrected = await proofreadChapter(newOutline[idx].content!);
                            const newPages = paginateContent(corrected);
                            newOutline[idx] = { 
                                ...newOutline[idx], 
                                content: corrected,
                                generatedPages: newPages,
                                status: 'completed'
                            };
                            completed++;
                            setProofreadProgress(Math.round((completed / chaptersToProofread.length) * 100));
                        } catch (err) {
                            const errorMsg = err instanceof Error ? err.message : `Failed to proofread chapter ${chapter.title}.`;
                            console.error(`Proofreading error for chapter ${chapter.title}:`, err);
                        }
                    }
                }));
                
                // Update state after each chunk to show progress
                setManuscript(prev => ({ ...prev, outline: [...newOutline] }));
                onUpdate([], undefined, { outline: [...newOutline] });
            }
            
            showToast("Proofreading complete!", "success");
        } catch (e) {
            console.error("Proofreading failed:", e);
            showToast("Proofreading failed. Please try again.", "error");
        } finally {
            setIsProofreading(false);
            setProofreadProgress(0);
        }
    };

    const handleWrite = async (chapterId: string, beat: string) => {
        const chapterIndex = manuscript.outline.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) return;

        setIsWriting(true);
        setStreamContent("");
        
        let prevContext = "";
        let nextContext = "";
        if (chapterIndex > 0) {
            const prev = manuscript.outline[chapterIndex - 1];
            prevContext = prev.content ? prev.content.slice(-800) : prev.beat;
        }
        if (chapterIndex < manuscript.outline.length - 1) {
            nextContext = manuscript.outline[chapterIndex + 1].beat;
        }

        try {
            const memory = await loadLocal(getProjectMemoryKey(data.id), { research: [], keyFigures: [], glossary: [], concepts: [], characters: [], world: [], plot: [] });
            
            // Use the edited beat from the DraftCard, not the original outline beat
            const chapterWithEditedBeat = { ...manuscript.outline[chapterIndex], beat: beat };
            
            let fullContent = await streamChapterContent(
                data.blueprint!,
                data.blueprint!.profile,
                chapterWithEditedBeat,
                memory,
                (chunk: string) => setStreamContent(prev => prev + chunk),
                prevContext,
                nextContext,
                manuscript.outline,
                data.blueprint!.summary,
                undefined, // additionalContext
                undefined  // signal
            );

            // FIX: Clean potential duplicate H1 from AI and ensure single source of truth
            // 1. Strip any lingering markdown wrapper logic locally just in case
            fullContent = fullContent.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '').trim();
            // 2. Remove any H1 tag (and anything preceding it) to prevent double headers
            fullContent = fullContent.replace(/^[\s\S]*?<h1[^>]*>.*?<\/h1>/i, '').trim();
            
            const chapterNum = manuscript.outline[chapterIndex].chapterNumber;
            const chapterTitle = manuscript.outline[chapterIndex].title;
            const finalContent = `<h1>Chapter ${chapterNum}: ${chapterTitle}</h1>\n${fullContent}`;

            const newPages = paginateContent(finalContent);
            const newOutline = [...manuscript.outline];
            newOutline[chapterIndex] = { 
                ...newOutline[chapterIndex], 
                beat: beat,  // Save the edited beat
                content: finalContent, 
                generatedPages: newPages, 
                status: 'completed' 
            };
            
            setManuscript(prev => ({ ...prev, outline: newOutline }));
            onUpdate(newPages, manuscript.frontMatter, { outline: newOutline });
            
            // End writing state early so user can see the content while indexing happens
            setIsWriting(false);
            setStreamContent("");

            const aftermath = await analyzeChapterAftermath(fullContent, memory);
            if ((aftermath.newLore.keyFigures?.length > 0) || (aftermath.newLore.concepts?.length > 0)) {
                setNewLoreDetected(aftermath.newLore);
            }

        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "Failed to generate chapter. Please try again.";
            console.error("Chapter generation error:", e);
            showToast(errorMsg, 'error');
            setIsWriting(false);
            setStreamContent("");
        }
    };

    const retryAftermath = async (fullContent: string, memory: any) => {
        try {
            const aftermath = await analyzeChapterAftermath(fullContent, memory);
            if ((aftermath.newLore.keyFigures?.length > 0) || (aftermath.newLore.concepts?.length > 0)) {
                setNewLoreDetected(aftermath.newLore);
            }
            showToast("Analysis successful!", 'success');
        } catch (e) {
            console.error(e);
            showToast("Failed to generate chapter analysis again. Please try again.", 'error');
        }
    };

    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleFullContentChange = useCallback((chapterId: string, newHtml: string) => {
        setManuscript(prev => {
            const newOutline = [...prev.outline];
            const idx = newOutline.findIndex(c => c.id === chapterId);
            if (idx === -1) return prev;
            
            // Generate pagination data from the manually edited content
            const newPages = paginateContent(newHtml);
            
            newOutline[idx] = {
                ...newOutline[idx],
                content: newHtml,
                generatedPages: newPages,
                status: 'completed'  // Mark as completed when manually edited
            };
            
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = setTimeout(() => {
                onUpdate([], undefined, { outline: newOutline });
            }, 1000);
            
            return { ...prev, outline: newOutline };
        });
    }, [setManuscript, onUpdate]);

    const DraftCard: React.FC<{ 
        item: OutlineItem, 
        onWrite: (id: string, beat: string) => void, 
        isWriting: boolean, 
        streamContent?: string, 
    }> = ({ item, onWrite, isWriting, streamContent }) => {
        const [beat, setBeat] = useState(item.beat || '');
        const streamRef = useRef<HTMLDivElement>(null);
        
        useEffect(() => { if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight; }, [streamContent]);
        
        return (
            <div className="w-full max-w-[6in] mx-auto bg-white border border-slate-200 shadow-md rounded-xl p-8 my-10">
                <h2 className="text-2xl font-bold mb-4">{item.title}</h2>
                {isWriting && streamContent ? (
                    <div className="bg-slate-50 p-6 rounded-lg h-64 overflow-y-auto font-serif" ref={streamRef} dangerouslySetInnerHTML={{__html: streamContent}} />
                ) : (
                    <>
                        <textarea value={beat || ''} onChange={(e) => setBeat(e.target.value)} className="w-full h-32 p-4 bg-slate-50 rounded-lg text-sm mb-4" />
                        <Button onClick={() => onWrite(item.id, beat)} disabled={isWriting} variant="primary" className="gap-2">
                            {isWriting ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>} Generate
                        </Button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
            {activeTool === 'nav' && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setActiveTool(null)} />
                    <NavigationSidebar 
                        outline={manuscript.outline} 
                        activeChapterId={activeChapterId} 
                        onNavigate={(id) => setActiveChapterId(id)}
                        onClose={() => setActiveTool(null)}
                    />
                </>
            )}

            <div className={`flex-grow flex flex-col relative transition-all duration-300 ${activeTool === 'formatting' ? 'md:mr-80' : ''} ${activeTool === 'nav' ? 'md:ml-80' : ''}`}>
                <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-2 sm:px-4 z-30">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setActiveTool(activeTool === 'nav' ? null : 'nav')} className="p-2" title="Toggle Chapter List"><List size={20}/></Button>
                        {onBackToDashboard && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onBackToDashboard}
                                className="gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                                title="Return to Dashboard"
                            >
                                <ArrowLeft size={16}/>
                                <span className="text-xs font-semibold uppercase tracking-wide">Dashboard</span>
                            </Button>
                        )}
                        <span className="font-bold text-slate-700 ml-2 hidden sm:inline truncate max-w-[200px]">{data.title}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
                        <Button variant="neutral" size="sm" onClick={handleProofreadBook} disabled={isProofreading} className="gap-1 sm:gap-2 flex-shrink-0 hidden sm:flex">
                            {isProofreading ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                            <span className="hidden sm:inline">{isProofreading ? `Proofreading... ${proofreadProgress}%` : 'Proofread'}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (!isDemoMode) onOpenCoAuthor(); }} disabled={isDemoMode} className="gap-1 sm:gap-2 flex-shrink-0 hidden md:flex"><Database size={14}/> <span className="hidden lg:inline">Vault</span></Button>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTool(activeTool === 'formatting' ? null : 'formatting')} className="p-2 flex-shrink-0"><Palette size={20}/></Button>
                        <Button variant="primary" size="sm" onClick={() => setActiveTool('publish')} className="flex-shrink-0">Publish</Button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto bg-slate-200/50 relative flex flex-col">
                    <EditorToolbar activeFormats={activeFormats} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />

                    <div className="p-4 sm:p-8 flex-grow">
                        <div className="max-w-full sm:max-w-[8.5in] mx-auto pb-20 sm:pb-40">
                            {manuscript.outline.map((item, idx) => (
                                <div key={item.id} id={`chapter-${item.id}`} className="mb-20">
                                    {item.status === 'completed' && item.content ? (
                                        <ChapterEditor 
                                            html={item.content} 
                                            onChange={(newHtml) => handleFullContentChange(item.id, newHtml)}
                                            design={manuscript.design}
                                            isDemoMode={isDemoMode}
                                        />
                                    ) : (
                                        <DraftCard item={item} onWrite={handleWrite} isWriting={isWriting && activeChapterId === item.id} streamContent={activeChapterId === item.id ? streamContent : undefined} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {activeTool === 'formatting' && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setActiveTool(null)} />
                    <FormattingSidebar 
                        settings={manuscript.design} 
                        onUpdateSettings={(s) => setManuscript(prev => ({ ...prev, design: s }))} 
                        onClose={() => setActiveTool(null)}
                    />
                </>
            )}

            {activeTool === 'publish' && (
                <PublishWizard 
                    data={{ ...data, ...manuscript }} 
                    onClose={() => {
                        setActiveTool(null);
                        onResetWizardState?.();
                    }}
                    onUpdateData={(updates) => {
                        setManuscript(p => ({ ...p, ...updates }));
                        onUpdate([], undefined, updates);
                    }}
                    onOpenCoverStudio={onOpenCoverStudio}
                    initialStep={initialWizardState ? 3 : 1}
                    isDemoMode={isDemoMode}
                />
            )}

            {newLoreDetected && (
                <ContextReviewDialog 
                    newLore={newLoreDetected}
                    onAdd={async (lore) => {
                        const currentMem = await loadLocal(getProjectMemoryKey(data.id), { research: [], keyFigures: [], glossary: [], concepts: [], characters: [], world: [], plot: [] });
                        const merged: ProjectMemory = {
                            ...currentMem,
                            research: [...(currentMem.research || []), ...(lore.research || [])],
                            keyFigures: [...(currentMem.keyFigures || []), ...(lore.keyFigures || [])],
                            glossary: [...(currentMem.glossary || []), ...(lore.glossary || [])],
                            concepts: [...(currentMem.concepts || []), ...(lore.concepts || [])]
                        };
                        saveLocal(getProjectMemoryKey(data.id), merged);
                        setNewLoreDetected(null);
                        showToast("Authority Vault Updated.", 'success');
                    }}
                    onDiscard={() => setNewLoreDetected(null)}
                />
            )}
        </div>
    );
};
