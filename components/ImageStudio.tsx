"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Wand2, RefreshCw, Loader2, Image as ImageIcon, Download, ChevronDown, FileImage, FileType, Sliders, RotateCw, Undo2, Sparkles, BookOpen, Type, Palette, AlignCenter, AlignLeft, AlignRight, MoveVertical, Move, ZoomIn, Box, Plus, Check, Zap, Award, ArrowLeft, History, Eye, Settings2, Lightbulb } from 'lucide-react';
import { useToast } from './ToastContext';
import { generateImageFromPrompt } from '../services/aiClient';
import { EbookData } from '../types';

interface ImageStudioProps {
  onSetCover?: (image: string | null) => void;
  onCreateProject?: (image: string, prompt: string) => void;
  onUpdateMetadata?: (data: Partial<EbookData>) => void;
  initialImage?: string | null;
  projectTitle?: string;
  subtitle?: string;
  author?: string;
  autoPrompt?: string;
  genre?: string;
  visualStyle?: string;
  onClose?: () => void;
}

interface StylePreset {
  id: string;
  name: string;
  modifiers: string;
  gradient: string; // Visual representation
  emoji: string;
  keywords: string[];
}

const STYLE_PRESETS: StylePreset[] = [
  { id: 'none', name: 'No Style', modifiers: '', gradient: 'bg-slate-700', emoji: '🚫', keywords: [] },
  { id: 'cinematic', name: 'Cinematic', modifiers: 'cinematic lighting, highly detailed, photorealistic, 8k, dramatic atmosphere, teal and orange color grading', gradient: 'bg-gradient-to-br from-slate-900 via-blue-900 to-amber-700', emoji: '🎬', keywords: ['cinematic', 'movie', 'film', 'dramatic'] },
  { id: 'fantasy', name: 'High Fantasy', modifiers: 'digital fantasy painting, concept art, magical atmosphere, ethereal lighting, intricate details, oil painting style', gradient: 'bg-gradient-to-br from-emerald-900 via-purple-800 to-amber-600', emoji: '🐉', keywords: ['fantasy', 'magic', 'dragon', 'medieval', 'ethereal'] },
  { id: 'cyberpunk', name: 'Cyberpunk', modifiers: 'cyberpunk, neon lights, futuristic, high tech, dystopian, vibrant colors, synthwave aesthetic, night city', gradient: 'bg-gradient-to-br from-fuchsia-600 via-purple-900 to-cyan-500', emoji: '🤖', keywords: ['cyberpunk', 'neon', 'sci-fi', 'futuristic', 'tech'] },
  { id: 'watercolor', name: 'Watercolor', modifiers: 'watercolor painting, soft edges, artistic, paper texture, dreamy, pastel colors, ink bleed', gradient: 'bg-gradient-to-br from-rose-200 via-sky-200 to-indigo-200', emoji: '🎨', keywords: ['watercolor', 'paint', 'artistic', 'pastel', 'soft'] },
  { id: 'minimalist', name: 'Minimalist', modifiers: 'minimalist design, swiss style, clean lines, negative space, flat colors, vector art style, bauhaus', gradient: 'bg-gradient-to-br from-slate-200 via-slate-100 to-white', emoji: '⬛', keywords: ['minimalist', 'clean', 'simple', 'flat', 'vector'] },
  { id: 'noir', name: 'Film Noir', modifiers: 'film noir style, black and white, high contrast, dramatic shadows, detective mystery atmosphere, grain', gradient: 'bg-gradient-to-br from-black via-slate-800 to-slate-500', emoji: '🕵️', keywords: ['noir', 'dark', 'mystery', 'shadow', 'black and white'] },
  { id: 'vintage', name: 'Vintage', modifiers: 'vintage book cover style, retro texture, aged paper, classic illustration, 1950s aesthetic, pulp fiction', gradient: 'bg-gradient-to-br from-orange-100 via-amber-200 to-yellow-600', emoji: '📜', keywords: ['vintage', 'retro', 'old', 'classic', 'antique'] },
  { id: 'scifi', name: 'Sci-Fi', modifiers: 'sci-fi concept art, spaceship, stars, futuristic, sleek, metallic, lens flare', gradient: 'bg-gradient-to-br from-blue-900 via-slate-900 to-cyan-900', emoji: '🚀', keywords: ['space', 'star', 'planet', 'alien'] },
  { id: 'horror', name: 'Horror', modifiers: 'dark horror style, eerie atmosphere, blood red, shadowy, gothic, unsettling, nightmare', gradient: 'bg-gradient-to-br from-red-900 via-black to-slate-900', emoji: '👻', keywords: ['horror', 'scary', 'spooky', 'ghost', 'dark'] },
];

const MOODS = ['Dark', 'Ethereal', 'Vibrant', 'Melancholic', 'Gritty', 'Whimsical', 'Romantic', 'Tense', 'Peaceful', 'Chaotic'];
const LIGHTING = ['Golden Hour', 'Cinematic', 'Neon', 'Soft Studio', 'Hard Shadows', 'Natural', 'Moonlight', 'Bioluminescent', 'Volumetric', 'Rembrandt'];
const COMPOSITIONS = ['Close-up', 'Wide Angle', 'Minimalist', 'Detailed Scene', 'Character Portrait', 'Symbolic Object', 'Abstract Pattern'];

const LOADING_MSGS = [
    "Analyzing prompt structure...",
    "Mixing digital palette...",
    "Drafting composition...",
    "Applying lighting physics...",
    "Refining textures...",
    "Polishing details...",
    "Finalizing artwork..."
];

const ImageStudio: React.FC<ImageStudioProps> = ({ 
    onSetCover, onCreateProject, onUpdateMetadata, initialImage, projectTitle, subtitle, author, autoPrompt, genre = 'General', visualStyle, onClose 
}) => {
  // Main State
  const [image, setImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [is3DMode, setIs3DMode] = useState(false);
  
  // Recipe State
  const [subject, setSubject] = useState(autoPrompt || '');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedLighting, setSelectedLighting] = useState<string>('');
  const [selectedComposition, setSelectedComposition] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('cinematic');
  const [includeText, setIncludeText] = useState(true);

  // Status State
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Initialize
  useEffect(() => {
    if (initialImage && !image) {
        setImage(initialImage);
        setHistory([initialImage]);
    }
  }, [initialImage]);

  // Pre-fill from Visual Style
  useEffect(() => {
      if (visualStyle) {
          const lowerStyle = visualStyle.toLowerCase();
          
          // Match Preset
          const matchedPreset = STYLE_PRESETS.find(p => p.keywords.some(k => lowerStyle.includes(k)));
          if (matchedPreset) setSelectedStyle(matchedPreset.id);

          // Match Mood
          const matchedMood = MOODS.find(m => lowerStyle.includes(m.toLowerCase()));
          if (matchedMood) setSelectedMood(matchedMood);

          // Match Lighting
          const matchedLighting = LIGHTING.find(l => lowerStyle.includes(l.toLowerCase()));
          if (matchedLighting) setSelectedLighting(matchedLighting);
      }
  }, [visualStyle]);

  // Loading Cycle
  useEffect(() => {
      let interval: any;
      if (loading) {
          setLoadingMsgIndex(0);
          interval = setInterval(() => {
              setLoadingMsgIndex(prev => (prev + 1) % LOADING_MSGS.length);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [loading]);

  const constructPrompt = () => {
     const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
     const styleMod = stylePreset ? stylePreset.modifiers : '';
     
     // Add some randomization to avoid repetitive colors/fonts
     const colorPalettes = ['warm and inviting', 'cool and professional', 'bold and high-contrast', 'muted and elegant', 'vibrant and energetic', 'monochromatic with a pop of color', 'rich jewel tones', 'earthy and natural'];
     const randomPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
     
     const typographyStyles = ['modern sans-serif', 'classic serif', 'bold display', 'elegant script', 'minimalist geometric', 'authoritative slab serif'];
     const randomTypography = typographyStyles[Math.floor(Math.random() * typographyStyles.length)];

     const parts = [
         subject,
         selectedMood ? `${selectedMood} mood` : '',
         selectedLighting ? `${selectedLighting} lighting` : '',
         selectedComposition ? `${selectedComposition} composition` : '',
         genre ? `${genre} genre style` : '',
         styleMod,
         `Color Palette: ${randomPalette}`
     ];
     
     const mainPrompt = parts.filter(Boolean).join(', ');
     
     // TEXT RULE
     const hasAuthor = author && author !== 'The Author' && author.trim() !== '';
     
     // IMPORTANT: Strict Negative Prompting for Author Name if missing
     let textRule = "";
     if (includeText) {
         if (hasAuthor) {
             textRule = `TYPOGRAPHY: Include Book Title: "${projectTitle || 'Title'}", a short descriptive subtitle: "${subtitle || ''}", and Author Name: "${author}". Use ${randomTypography} fonts. Focus on communicating clarity, authority, and value in just a few seconds. Ensure text is highly legible.`;
         } else {
             textRule = `TYPOGRAPHY: Include Book Title: "${projectTitle || 'Title'}" and a short descriptive subtitle: "${subtitle || ''}". Use ${randomTypography} fonts. Focus on communicating clarity, authority, and value in just a few seconds. Ensure text is highly legible. DO NOT INCLUDE ANY AUTHOR NAME.`;
         }
         // STRICTLY FORBID DUPLICATE TITLE/SUBTITLE
         if (projectTitle && subtitle && projectTitle.toLowerCase() === subtitle.toLowerCase()) {
             textRule += " CRITICAL: The Title and Subtitle are identical. You MUST make the Subtitle distinct and descriptive, do not repeat the Title.";
         }
     } else {
         textRule = `IMPORTANT: Do NOT include any text, letters, or words. Artwork only.`;
     }
        
     return `STRICT 2D FLAT BOOK COVER ART. Aspect Ratio 3:4. FULL BLEED, NO BORDERS, EDGE-TO-EDGE COMPOSITION. ${mainPrompt}. ${textRule} 
     DESIGN PRINCIPLES: Ensure instant genre recognition, high visual hierarchy, typography as voice, and emotional promise. 
     High resolution, detailed, professional publishing quality. Avoid repetitive cyan color schemes; use a unique and striking color palette related to the book's theme. 
     STRICTLY GENERATE ONLY THE COVER ARTWORK ITSELF. DO NOT GENERATE A BOOK MOCKUP, DO NOT SHOW A PHYSICAL BOOK. JUST THE COVER ART DESIGN.`;
  };

  const handleGenerate = async () => {
      if (!subject) return;
      setLoading(true);
      try {
          const finalPrompt = constructPrompt();
          const newImage = await generateImageFromPrompt(finalPrompt, 'fast'); // Default to fast for fluidity, can toggle quality
          if (newImage) {
              setImage(newImage);
              setHistory(prev => [...prev, newImage]);
              setIs3DMode(false); // Reset to 2D to see result clearly first
          }
      } catch (e) {
          console.error(e);
          alert("Generation failed");
      } finally {
          setLoading(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        setHistory(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
      if (onSetCover && image) {
          onSetCover(image);
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
      }
  };
  
  const handleCreateProject = () => {
      if (onCreateProject && image && subject) {
          onCreateProject(image, subject);
      }
  };
  
  const handleDownload = (format: 'png' | 'jpeg') => {
      if (!image) return;
      const link = document.createElement('a');
      link.href = image;
      link.download = `cover-${Date.now()}.${format}`;
      link.click();
      setShowDownloadMenu(false);
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col overflow-hidden relative font-sans">
      
      {/* 3D BOOK STYLES (Injected Scoped) */}
      <style>{`
        .perspective-container {
            perspective: 2000px;
        }
        .book-3d {
            width: min(300px, 70vw);
            height: min(400px, 90vw); /* 3:4 Aspect Ratio */
            position: relative;
            transform-style: preserve-3d;
            transform: rotateY(-30deg) rotateX(10deg);
            transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
            box-shadow: 20px 30px 50px rgba(0,0,0,0.4);
        }
        .book-3d:hover {
            transform: rotateY(-10deg) rotateX(5deg) translateZ(20px);
            box-shadow: 30px 40px 60px rgba(0,0,0,0.3);
        }
        .face {
            position: absolute;
            backface-visibility: hidden; 
        }
        
        /* Front Cover */
        .front {
            width: 300px;
            height: 400px;
            background-size: cover;
            background-position: center;
            transform: translateZ(25px);
            border-radius: 2px 6px 6px 2px;
            /* Hinge and Shine */
            box-shadow: inset 4px 0 10px rgba(0,0,0,0.1); 
        }
        .front::before { /* Spine Hinge/Groove */
            content: '';
            position: absolute;
            left: 12px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: rgba(0,0,0,0.2);
            box-shadow: 1px 0 1px rgba(255,255,255,0.1);
        }
        .front::after { /* Glossy Sheen */
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 60%);
            border-radius: 2px 6px 6px 2px;
        }

        /* Back Cover */
        .back {
            width: 300px;
            height: 400px;
            background: #1a1a1a;
            transform: rotateY(180deg) translateZ(25px);
            border-radius: 6px 2px 2px 6px;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        }

        /* Spine */
        .spine {
            width: 50px;
            height: 400px;
            background-size: auto 100%; 
            background-position: center;
            transform: rotateY(-90deg) translateZ(25px);
            left: 0; 
            box-shadow: inset 10px 0 20px rgba(0,0,0,0.4), inset -10px 0 20px rgba(0,0,0,0.2);
        }
        .spine::after {
            content: '';
            position: absolute;
            top:0; left:0; right:0; bottom:0;
            background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.6) 100%);
        }

        /* Pages (Paper block) */
        .pages {
            width: 290px;
            height: 390px;
            background: #fff;
            transform: rotateY(-90deg) translateZ(-24px);
            left: 28px;
            top: 5px;
            background-image: 
                linear-gradient(90deg, #fdfbf7 0%, #f1f5f9 5%, #fdfbf7 10%),
                repeating-linear-gradient(90deg, #f1f5f9 0px, #f1f5f9 1px, #fdfbf7 1px, #fdfbf7 3px);
            box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* HEADER */}
      <div className="h-14 sm:h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 z-20 flex-shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={20}/>
            </button>
            <h1 className="font-bold text-lg text-white flex items-center gap-2">
                <ImageIcon size={20} className="text-amber-500"/> {onCreateProject ? 'Concept Visualizer' : 'Cover Studio'}
            </h1>
            {loading && <div className="text-xs font-mono text-amber-400 animate-pulse flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> PROCESSING</div>}
        </div>
        
        <div className="flex items-center gap-3">
             {onSetCover && (
                 <button 
                    onClick={handleSave}
                    disabled={!image}
                    className={`px-3 sm:px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${isSaved ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white text-slate-900 hover:bg-slate-200'}`}
                 >
                    {isSaved ? <Check size={16}/> : <BookOpen size={16}/>}
                    <span className="hidden sm:inline">{isSaved ? "Cover Updated" : "Set as Cover"}</span>
                 </button>
             )}
             
             {onCreateProject && (
                 <button 
                    onClick={handleCreateProject}
                    disabled={!image || !subject.trim()}
                    className="hidden sm:flex px-6 py-2 rounded-full font-bold text-sm bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-all items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!image ? "Generate an image first" : !subject.trim() ? "Enter a subject description" : ""}
                 >
                    <Lightbulb size={16}/>
                    Draft Blueprint from Art
                 </button>
             )}
             
             <div className="relative">
                 <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} disabled={!image} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white disabled:opacity-50">
                     <Download size={20}/>
                 </button>
                 {showDownloadMenu && (
                     <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                         <button onClick={() => handleDownload('png')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-700 text-slate-300 hover:text-white">PNG Format</button>
                         <button onClick={() => handleDownload('jpeg')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-700 text-slate-300 hover:text-white">JPG Format</button>
                     </div>
                 )}
             </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT PANEL: RECIPE BUILDER */}
          <div className="w-full lg:w-[360px] bg-slate-900/80 backdrop-blur border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col z-10 overflow-y-auto scrollbar-hide max-h-[40vh] lg:max-h-none">
             <div className="p-6 space-y-8">
                 
                 {/* Subject */}
                 <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Type size={12}/> Subject</label>
                        {autoPrompt && <span className="text-[10px] text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded border border-amber-500/30">Auto-Filled from Blueprint</span>}
                     </div>
                     <textarea 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. A cybernetic detective walking in rain..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none resize-none h-32"
                     />
                 </div>

                 {/* Visual Style Cards */}
                 <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Palette size={12}/> Art Style</label>
                     <div className="grid grid-cols-2 gap-2">
                         {STYLE_PRESETS.map(style => (
                             <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style.id)}
                                className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all group text-left p-3 flex flex-col justify-end ${selectedStyle === style.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'border-transparent opacity-60 hover:opacity-100 hover:border-slate-600'}`}
                             >
                                 <div className={`absolute inset-0 ${style.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                                 <div className="relative z-10">
                                     <span className="text-xl mb-1 block">{style.emoji}</span>
                                     <span className="text-[10px] font-bold text-white uppercase tracking-wider">{style.name}</span>
                                 </div>
                             </button>
                         ))}
                     </div>
                 </div>

                 {/* Mood & Lighting Pills */}
                 <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Mood</label>
                        <div className="flex flex-wrap gap-1.5">
                            {MOODS.map(m => (
                                <button 
                                    key={m} 
                                    onClick={() => setSelectedMood(selectedMood === m ? '' : m)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedMood === m ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Lighting</label>
                        <div className="flex flex-wrap gap-1.5">
                            {LIGHTING.map(l => (
                                <button 
                                    key={l} 
                                    onClick={() => setSelectedLighting(selectedLighting === l ? '' : l)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedLighting === l ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                     </div>
                 </div>

                 {/* Toggle Options */}
                 <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                     <span className="text-xs font-bold text-slate-300">Include Title & Author Text</span>
                     <button 
                        onClick={() => setIncludeText(!includeText)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${includeText ? 'bg-amber-600' : 'bg-slate-600'}`}
                     >
                         <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${includeText ? 'left-6' : 'left-1'}`}></div>
                     </button>
                 </div>
                 
                 {/* Generate Button */}
                 <button
                    onClick={handleGenerate}
                    disabled={loading || !subject}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-amber-500 border border-amber-500/30 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-900/10 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                     {loading ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                     {loading ? 'Creating...' : 'Generate Artwork'}
                 </button>

                 <div className="text-center">
                     <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto">
                        <Upload size={12}/> Upload Reference Image
                     </button>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                 </div>

             </div>
          </div>

          {/* CENTER: PREVIEW CANVAS */}
          <div className="flex-grow bg-slate-950 relative flex items-center justify-center overflow-hidden perspective-container">
             {/* Background Grid */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }}>
             </div>
             
             {/* 3D Toggle Control - Floating */}
             <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 flex gap-1 shadow-2xl">
                 <button onClick={() => setIs3DMode(false)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!is3DMode ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white'}`}>2D Flat</button>
                 <button onClick={() => setIs3DMode(true)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${is3DMode ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white'}`}>3D Preview</button>
             </div>

             {/* MAIN VIEWPORT */}
             {image ? (
                 is3DMode ? (
                    <div className="book-3d">
                        <div className="face front" style={{ backgroundImage: `url(${image})` }}></div>
                        <div className="face back"></div>
                        <div className="face spine" style={{ backgroundImage: `url(${image})` }}></div>
                        <div className="face pages"></div>
                    </div>
                 ) : (
                    <div className="relative shadow-2xl group animate-in zoom-in-95 duration-300 aspect-[3/4] h-[75vh]">
                        <img src={image} className="w-full h-full object-cover rounded-sm border border-slate-800" alt="Cover Preview" />
                        <div className="absolute inset-0 ring-1 ring-white/10 pointer-events-none"></div>
                    </div>
                 )
             ) : (
                 <div className="text-center opacity-30 select-none">
                     <ImageIcon size={64} className="mx-auto mb-4"/>
                     <p className="text-xl font-bold">Your masterpiece awaits</p>
                 </div>
             )}

             {/* Loading Overlay */}
             {loading && (
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                     <div className="relative w-64 h-2 mb-4 bg-slate-800 rounded-full overflow-hidden">
                         <div className="absolute inset-0 bg-amber-500 animate-pulse rounded-full" style={{ width: '60%' }}></div>
                     </div>
                     <div className="text-amber-400 font-mono text-sm tracking-widest uppercase animate-pulse">
                         {LOADING_MSGS[loadingMsgIndex]}
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* BOTTOM PANEL: FILMSTRIP */}
      {history.length > 0 && (
          <div className="h-32 bg-slate-900 border-t border-slate-800 flex flex-shrink-0 z-20">
              <div className="flex items-center px-4 border-r border-slate-800 text-slate-500 font-bold text-xs uppercase tracking-widest flex-shrink-0 gap-2 w-24 justify-center flex-col">
                  <History size={20}/> History
              </div>
              <div className="flex-grow overflow-x-auto flex items-center gap-4 p-4 scrollbar-hide">
                  {history.map((histImg, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setImage(histImg)}
                        className={`relative h-full aspect-[3/4] rounded overflow-hidden flex-shrink-0 border-2 transition-all hover:scale-105 ${image === histImg ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'}`}
                      >
                          <img src={histImg} className="h-full w-full object-cover" />
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default ImageStudio;