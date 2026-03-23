
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { EbookData, FrontMatter, MarketingAssets, BackMatter, OutlineItem } from '../types';
import { generateMarketingPack, generateBookMockup, generateAboutAuthor, generateCopyright, generateSpeech, generateBibliography, generateDedication, generateMarketingImage } from '../services/aiClient';
import { generateEPUB, generateDOCX, generateAudiobookZip, generateMarketingAssetsZip } from '../services/publisher';

import { paginateContent } from '../utils/pagination';
import { trackEvent } from '../services/analytics';
import { logActivity } from '../services/storage';
import { CheckCircle2, AlertTriangle, Book, Share2, ArrowRight, Loader2, Sparkles, X, FileText, Image as ImageIcon, Tag, ShoppingCart, Copy, Check, Palette, List, Printer, Mic, Headphones, Play, Square, Volume2, ChevronDown } from 'lucide-react';
import { useToast } from './ToastContext';
import { MobileReader } from './MobileReader';

interface PublishWizardProps {
  data: EbookData;
  onUpdateData: (newData: Partial<EbookData>) => void;
  onClose: () => void;
  onOpenCoverStudio: (returnToWizard: boolean) => void;
  initialStep?: number;
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

const PublishWizard: React.FC<PublishWizardProps> = ({ data, onUpdateData, onClose, onOpenCoverStudio, initialStep }) => {
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

  const [assets, setAssets] = useState<MarketingAssets | null>(data.marketing || null);
  const [mockup, setMockup] = useState<string | null>(data.marketing?.mockupImage || null);
  
  const [finalDownloadableData, setFinalDownloadableData] = useState<EbookData | null>(null);
  
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
                          item.generatedPages = paginateContent(newContent);
                      }
                  }
              });

              // De-duplicate by URI
              const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());

              if (uniqueSources.length > 0) {
                  // Use Agentic Bibliography Generation
                  bibliographyHtml = await generateBibliography(uniqueSources);
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
          logActivity('publish_book', metadata.title || 'Untitled');

          setStep(5); 
      } catch (e) {
          console.error(e);
          showToast("Publishing failed. Please try again.", 'error');
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
                  if (updatedAssets && data.coverImage) {
                      // Generate ALL images in parallel (not sequential)
                      const [fbImages, socialImages, quoteImages] = await Promise.all([
                          Promise.all((updatedAssets.facebookAdCreatives || []).map(c => 
                              generateMarketingImage(c.prompt, data.coverImage!, () => {})
                          )),
                          Promise.all((updatedAssets.socialMediaGraphics || []).map(c => 
                              generateMarketingImage(c.prompt, data.coverImage!, () => {})
                          )),
                          Promise.all((updatedAssets.quoteGraphics || []).map(c => 
                              generateMarketingImage(c.quote, data.coverImage!, () => {})
                          ))
                      ]);

                      updatedAssets.facebookAdCreatives = (updatedAssets.facebookAdCreatives || []).map((c, i) => ({...c, image: fbImages[i]}));
                      updatedAssets.socialMediaGraphics = (updatedAssets.socialMediaGraphics || []).map((c, i) => ({...c, image: socialImages[i]}));
                      updatedAssets.quoteGraphics = (updatedAssets.quoteGraphics || []).map((c, i) => ({...c, image: quoteImages[i]}));
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
                  showToast("Background generation failed. Please try again.", 'error');
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

  // Construct Preview Data for Step 4
  const previewOutline: OutlineItem[] = [
        {
            id: 'title-page',
            chapterNumber: 0,
            title: 'Title Page',
            beat: '',
            targetWordCount: 0,
            status: 'completed',
            content: `<div style="text-align: center; margin-top: 30%;">
                <h1 style="font-family: 'Playfair Display', serif; font-size: 2.2em; font-weight: 700; line-height: 1.1;">${metadata.title}</h1>
                <p style="font-size:1.5em; font-style:italic; color: #64748b; margin-top: 1em;">${metadata.subtitle}</p>
                <p style="margin-top:2em; font-size: 1.2em;">by ${metadata.author}</p>
            </div>`
        },
        ...(frontMatter.copyright ? [{
            id: 'copyright',
            chapterNumber: 0,
            title: 'Copyright',
            beat: '',
            targetWordCount: 0,
            status: 'completed',
            content: `<div style="font-size: 0.8em; text-align: center; margin-top: 50%;"><p>${frontMatter.copyright.replace(/\n/g, '<br />')}</p></div>`
        } as OutlineItem] : []),
        ...(frontMatter.dedication ? [{
            id: 'dedication',
            chapterNumber: 0,
            title: 'Dedication',
            beat: '',
            targetWordCount: 0,
            status: 'completed',
            content: `<div style="font-style: italic; text-align: center; margin-top: 30%;"><p>${frontMatter.dedication}</p></div>`
        } as OutlineItem] : []),
        ...(data.outline || []).filter(c => c.status === 'completed'),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
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
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                        {totalSources} Citations Found
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
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

            {/* STEP 4: REVIEW */}
            {step === 4 && (
                <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-4">
                    {/* LEFT COLUMN: Metadata & Checklist */}
                    <div className="overflow-y-auto pr-4">
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Final Proofing</h3>
                            <p className="text-slate-500 text-sm">
                                Review the generated pages on the simulator. This is how your book will appear on mobile devices.
                            </p>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-4 mb-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Manifest Checklist</h4>
                            <div className="flex justify-between text-sm items-center"><span className="text-slate-500">Title Metadata</span> <CheckCircle2 size={16} className="text-emerald-500"/></div>
                            <div className="flex justify-between text-sm items-center"><span className="text-slate-500">Author Bio</span> <span className={frontMatter.aboutAuthor ? "text-emerald-500" : "text-amber-500"}>{frontMatter.aboutAuthor ? "Ready" : "Missing"}</span></div>
                            <div className="flex justify-between text-sm items-center"><span className="text-slate-500">Copyright Page</span> <span className={frontMatter.copyright ? "text-emerald-500" : "text-amber-500"}>{frontMatter.copyright ? "Ready" : "Auto-Generated"}</span></div>
                            <div className="flex justify-between text-sm items-center"><span className="text-slate-500">Completed Chapters</span> <span className="font-bold text-slate-900">{data.outline?.filter(c => c.status === 'completed').length || 0}</span></div>
                            <div className="flex justify-between text-sm items-center"><span className="text-slate-500">Est. Word Count</span> <span className="font-bold text-slate-900">{data.wordCount?.toLocaleString() || 0}</span></div>
                        </div>

                        <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl flex gap-3 items-start">
                            <AlertTriangle size={20} className="text-primary-600 shrink-0 mt-0.5"/>
                            <div className="text-xs text-primary-800 leading-relaxed">
                                <strong>Tip:</strong> Use the simulator to verify that your dedication and chapter breaks look correct. If something is off, go back to the Editor to fix formatting.
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Mobile Simulator */}
                    <div className="bg-slate-100 rounded-3xl border border-slate-200 flex items-center justify-center p-4 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        <div className="scale-[0.85] origin-center">
                            <MobileReader 
                                title={metadata.title} 
                                outline={previewOutline} 
                                design={data.design}
                                containerHeight={700} // Force consistent scaling in wizard
                            />
                        </div>
                    </div>
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

                    <div className="flex justify-center gap-2 mb-6 border-b border-slate-100 pb-1">
                        <button onClick={() => setSuccessTab('downloads')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${successTab === 'downloads' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Downloads</button>
                        <button onClick={() => setSuccessTab('store')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${successTab === 'store' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Marketing Kit</button>
                        <button onClick={() => setSuccessTab('audio')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-1 ${successTab === 'audio' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><Headphones size={14}/> Audiobook</button>
                    </div>

                    <div className="flex-grow overflow-y-auto px-4">
                        {successTab === 'downloads' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                <button onClick={() => finalDownloadableData && generateEPUB(finalDownloadableData)} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-primary-300 hover:bg-primary-50 transition-all group text-left">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-slate-400 group-hover:text-primary-600"><Book size={24}/></div>
                                    <div className="font-bold text-slate-900 mb-1">Download EPUB</div>
                                    <div className="text-xs text-slate-500">Standard ebook format for Kindle, Apple Books, Kobo.</div>
                                </button>

                                <button onClick={() => finalDownloadableData && generateDOCX(finalDownloadableData)} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all group text-left">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600"><FileText size={24}/></div>
                                    <div className="font-bold text-slate-900 mb-1">Download DOCX</div>
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
                                                    <button onClick={() => finalDownloadableData && generateMarketingAssetsZip(finalDownloadableData)} className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">Download All Assets</button>
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
                                                        {assets?.keywords && assets.keywords.slice(0,5).map(k => <span key={k} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">{k}</span>)}
                                                        {assets?.keywords && assets.keywords.length > 5 && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">+{assets.keywords.length - 5} more</span>}
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
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase text-center">Facebook Ad</div>
                                                        </div>
                                                    )}
                                                    {assets.socialMediaGraphics?.[0]?.image && (
                                                        <div className="space-y-2">
                                                            <img src={assets.socialMediaGraphics[0].image} className="w-full aspect-square object-cover rounded-lg border border-slate-100" alt="Social Media Graphic" />
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase text-center">Social Graphic</div>
                                                        </div>
                                                    )}
                                                    {assets.quoteGraphics?.[0]?.image && (
                                                        <div className="space-y-2">
                                                            <img src={assets.quoteGraphics[0].image} className="w-full aspect-square object-cover rounded-lg border border-slate-100" alt="Quote Graphic" />
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase text-center">Quote Graphic</div>
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
                        <button 
                            onClick={performPublish} 
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                            {loading ? 'Publishing...' : 'Publish Now'}
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PublishWizard;
