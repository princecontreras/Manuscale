
export interface EbookData {
  id: string; 
  title: string;
  pages: string[]; 
  coverImage?: string | null;
  lastModified: number;
  wordCount?: number;
  author?: string;
  frontMatter?: FrontMatter;
  backMatter?: BackMatter;
  blueprint?: ProjectBlueprint;
  narrativeProfile?: NarrativeProfile;
  outline?: OutlineItem[];
  design?: DesignSettings; 
  annotations?: Annotation[]; 
  
  // Publishing & Marketing
  status?: 'draft' | 'ready' | 'published';
  marketing?: MarketingAssets;
  isbn?: string;
  categories?: string[];
  keywords?: string[];
  priceTiers?: { ebook: string; print: string };
  publishDate?: number;
  audiobookGenerated?: boolean;
}

export interface Annotation {
  id: string;
  chapterId: string;
  pageIndex: number;
  top: number;
  content: string;
  type: 'note' | 'ai';
  timestamp: number;
}

export interface MarketingAssets {
  blurb: string;
  socialPosts: { platform: string; content: string }[];
  emailAnnouncement: string;
  mockupImage?: string;
  keywords: string[];
  categories: string[];
  priceStrategy: string;
  amazonDescription?: string;
  aPlusContent?: { headline: string; body: string; imagePrompt: string }[];
  seriesTitles?: string[];
  facebookAdCreatives?: { prompt: string; image?: string }[];
  socialMediaGraphics?: { prompt: string; image?: string }[];
  adCopyExamples?: { platform: string; copy: string }[];
  quoteGraphics?: { quote: string; image?: string }[];
  emailPromotionTemplate?: string;
  mediaKit?: { bio: string; interviewQuestions: string[] };
}

export interface DesignSettings {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  paragraphSpacing?: string;
  firstLineIndent?: string;
  blockIndent?: string;
  dropCaps: boolean;
  justification: 'justify' | 'left';
  paragraphStyle: 'indent' | 'block';
  chapterDecoration: boolean;
  theme?: 'classic' | 'modern' | 'noir' | 'academic';
}

export interface OutlineItem {
  id: string;
  chapterNumber: number;
  title: string;
  beat: string;
  logicFlow?: string[]; // Micro-beats/Logic flow breakdown
  archetype?: string; // AI-generated structural archetype
  targetWordCount: number;
  status?: 'draft' | 'writing' | 'completed';
  generatedPages?: string[]; 
  content?: string; 
  sourceContent?: string; // Raw text from context injection
  sources?: { title: string; uri: string; }[]; // Verified Grounding Sources
  mode?: string; // ID of the ChapterMode assigned to this chapter
}

export interface FrontMatter {
  isbn?: string;
  publisher?: string;
  year?: string;
  edition?: string;
  dedication?: string;
  country?: string;
  abstract?: string;
  includePreface?: boolean;
  includeCopyright?: boolean;
  copyright?: string; 
  acknowledgments?: string; 
  aboutAuthor?: string; 
  includeTOC?: boolean; 
}

export interface BackMatter {
  bibliography?: string;
  includeBibliography?: boolean;
}

export interface NarrativeProfile {
  voice: string; 
  tense: 'Past' | 'Present';
  pov: 'First Person' | 'Second Person' | 'Third Person Limited' | 'Third Person Omniscient';
  targetAudience: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  archetype?: string; // Changed from enum to string for dynamic AI generation
  targetWordCount: number;
  chapterCount: number;
  pacing?: string;
}

export interface BookPhase {
    title: string;       // e.g., "Part 1: The Foundation"
    intent: string;      // e.g., "Establish core concepts and terminology"
    chapterCount: number; // e.g., 3 chapters in this part
}

export interface ChapterMode {
    id: string;
    name: string;       // e.g., "The Deep Dive"
    purpose: string;    // e.g., "Best for explaining heavy technical concepts."
    signature: string[]; // e.g., ["Hook", "Theory", "History", "Application"]
}

export interface ProjectBlueprint {
  title: string;
  subtitle?: string;
  type: 'Non-Fiction' | 'Memoir' | 'Textbook' | 'Guide' | 'Fiction'; 
  mode?: 'Instructional' | 'Narrative'; // DUAL-MODE ARCHITECTURE
  genre: string;
  visualStyle: string; 
  coverPrompt: string; 
  summary: string; 
  profile: NarrativeProfile;
  sourceMaterial?: string;
  
  // DYNAMIC MACRO-STRUCTURE
  structure?: {
      archetype: string; // e.g., "The Zero to Hero Arc"
      description: string; // Explanation of why this structure fits
      phases: BookPhase[]; // The high-level parts of the book
  };
  
  // STRATEGIC DNA - INSTRUCTIONAL
  centralThesis?: string;
  
  // STRATEGIC DNA - NARRATIVE
  controllingIdea?: string;

  structuralSignature?: string[]; // The default "Chapter Formula"
  chapterModes?: ChapterMode[]; // The bespoke toolbox for this specific book (Non-Fiction)
  
  readerPersona?: {
      // Instructional Fields
      primaryPainPoint?: string;
      desiredOutcome?: string;
      knowledgeGap?: string;
      
      // Narrative Fields
      intellectualCuriosity?: string;
      emotionalPayoff?: string;
      historicalContext?: string;
  };
  editorialRules?: string[]; 
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface MemoryBankItem {
  id: string;
  name: string;
  description: string;
  category?: string; 
  sourceUrl?: string; 
  tags?: string[];
  motivations?: string;
  conflict?: string;
}

export interface StoryDNA {
    theme: string;
    tone: string;
    conflictEngine: string;
    stakes: string;
    endingIntent: string;
}

export interface ProjectMemory {
  research: MemoryBankItem[]; // Facts, Citations
  keyFigures: MemoryBankItem[]; // People, Companies, Interviewees
  glossary: MemoryBankItem[]; // Terms, Definitions
  concepts: MemoryBankItem[]; // Core arguments, Theories
  argumentMap?: { chapterId: string, argument: string }[];
  characters: MemoryBankItem[];
  world: MemoryBankItem[];
  plot: MemoryBankItem[];
  dna?: StoryDNA;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  coverImage?: string | null;
  lastModified: number;
  wordCount: number;
  author?: string;
  status?: 'draft' | 'ready' | 'published';
}

export interface AnalysisIssue {
  id: string;
  type: 'Style' | 'Consistency' | 'Continuity' | 'Grammar' | 'Spelling' | 'Punctuation';
  description: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high';
  context?: string; 
}

export interface AnalysisReport {
  timestamp: number;
  score: number; 
  summary: string;
  issues: AnalysisIssue[];
}

// --- AGENT TYPES ---
export type AgentRole = 'director' | 'strategist' | 'scholar' | 'scribe' | 'editor' | 'designer' | 'publisher' | 'user';

export interface AgentLog {
    id: string;
    timestamp: number;
    type: 'thought' | 'action' | 'result' | 'error' | 'success' | 'chat_user' | 'chat_agent'; 
    agentRole?: AgentRole; 
    content: string;
    metadata?: any;
}

export interface AgentAction {
    thought: string;
    tool: 'analyze_topic' | 'research' | 'create_outline' | 'write_chapter' | 'generate_cover' | 'finalize' | 'ask_user' | 'interview_user';
    args: any;
}

export interface DirectorDirective {
    targetAgent: AgentRole;
    instruction: string;
    reasoning: string;
}
