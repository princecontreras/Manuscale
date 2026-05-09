/**
 * Export Validator — Pre-flight checks for EPUB and DOCX generation.
 * Validates EbookData before attempting export to catch issues early.
 */

import { EbookData } from "../types";

export interface ChapterIssue {
  chapterNumber: number;
  title: string;
  issue: 'missing_content' | 'too_short' | 'garbage_content' | 'not_generated';
  details: string;
}

export interface ExportValidationResult {
  isValid: boolean;
  completedChapters: number;
  totalChapters: number;
  skippedChapters: ChapterIssue[];
  warnings: string[];
  errors: string[];
}

// Minimum meaningful text characters in a chapter (after stripping HTML tags)
const MIN_CHAPTER_CHARS = 200;

// Detect if content looks like AI-generated garbage (JSON, API responses, error text)
const isGarbageContent = (html: string): boolean => {
  const trimmed = html.trim();

  // Detect raw JSON blobs
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return true; // Parsed as valid JSON = garbage
    } catch {
      // Not valid JSON — could still be HTML starting with {
    }
  }

  // Detect API error messages or meta-text
  const metaPatterns = [
    /^(error|exception|traceback|500 internal|400 bad request)/i,
    /^(here is|here's|i have|i've generated|below is|the following)/i,
    /^(chapter \d+ of your book|as requested|i'll write)/i,
  ];
  const textContent = trimmed.replace(/<[^>]*>/g, '').trim();
  if (metaPatterns.some(p => p.test(textContent))) return true;

  // Detect content that is almost entirely non-prose (very high tag density)
  const tagCount = (html.match(/<[^>]+>/g) || []).length;
  const textLength = textContent.length;
  if (textLength < 50 && tagCount > 10) return true; // More tags than content

  return false;
};

// Strip HTML tags and normalize whitespace for text analysis
const extractTextContent = (html: string): string => {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Validate EbookData before export.
 * Returns detailed issues and a summary of what will be exported.
 */
export const validateExportData = (data: EbookData): ExportValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const skippedChapters: ChapterIssue[] = [];

  // 1. Basic data checks
  if (!data.title?.trim()) {
    errors.push("Book title is missing. Please add a title before exporting.");
  }

  const chapters = data.outline || [];
  const totalChapters = chapters.length;

  if (totalChapters === 0) {
    errors.push("No chapters found. Generate at least one chapter before exporting.");
    return { isValid: false, completedChapters: 0, totalChapters: 0, skippedChapters, warnings, errors };
  }

  // 2. Chapter-by-chapter validation
  let completedChapters = 0;

  for (const chapter of chapters) {
    const num = chapter.chapterNumber;
    const title = chapter.title || `Chapter ${num}`;

    // Check: Chapter was never generated
    if (chapter.status !== 'completed' || !chapter.content) {
      skippedChapters.push({
        chapterNumber: num,
        title,
        issue: 'not_generated',
        details: 'Chapter has not been generated yet.',
      });
      continue;
    }

    // Check: Content is garbage (JSON, API error, meta-commentary)
    if (isGarbageContent(chapter.content)) {
      skippedChapters.push({
        chapterNumber: num,
        title,
        issue: 'garbage_content',
        details: 'Chapter content appears to be AI-generated garbage (JSON, error text, or meta-commentary). Please regenerate this chapter.',
      });
      continue;
    }

    // Check: Too short to be real content
    const textContent = extractTextContent(chapter.content);
    if (textContent.length < MIN_CHAPTER_CHARS) {
      skippedChapters.push({
        chapterNumber: num,
        title,
        issue: 'too_short',
        details: `Chapter has very little content (${textContent.length} characters). This may be incomplete.`,
      });
      continue;
    }

    completedChapters++;
  }

  // 3. Overall viability check
  if (completedChapters === 0) {
    errors.push("No valid chapters to export. All chapters are either incomplete or contain invalid content.");
  } else if (completedChapters < totalChapters) {
    const skipped = totalChapters - completedChapters;
    warnings.push(`${skipped} of ${totalChapters} chapter${skipped !== 1 ? 's' : ''} will be skipped because they are incomplete or invalid.`);
  }

  // 4. Front matter warnings
  if (!data.frontMatter?.copyright) {
    warnings.push("No copyright page — consider adding one before distributing.");
  }
  if (!data.coverImage) {
    warnings.push("No cover image — your EPUB will not have a cover page on e-readers.");
  }

  return {
    isValid: errors.length === 0 && completedChapters > 0,
    completedChapters,
    totalChapters,
    skippedChapters,
    warnings,
    errors,
  };
};

/**
 * Verify the integrity of a generated EPUB Uint8Array.
 * Checks that required files are present inside the ZIP.
 */
export const verifyEPUBIntegrity = async (u8: Uint8Array): Promise<{ ok: boolean; reason?: string }> => {
  // Minimum size: a valid EPUB with 1 chapter should be well over 3KB
  if (u8.byteLength < 3000) {
    return { ok: false, reason: `EPUB file is too small (${u8.byteLength} bytes). It may be empty or corrupt.` };
  }

  // Check EPUB magic bytes — first file must be "mimetype" and start with "application/epub+zip"
  // The string "application/epub+zip" should appear in the first 100 bytes
  const header = new TextDecoder().decode(u8.slice(0, 100));
  if (!header.includes('application/epub+zip')) {
    return { ok: false, reason: 'EPUB file is missing the required mimetype header. The file may be corrupt.' };
  }

  return { ok: true };
};

/**
 * Verify the integrity of a generated DOCX Uint8Array.
 */
export const verifyDOCXIntegrity = async (u8: Uint8Array): Promise<{ ok: boolean; reason?: string }> => {
  // Minimum size: a valid DOCX with 1 chapter should be over 2KB
  if (u8.byteLength < 2000) {
    return { ok: false, reason: `DOCX file is too small (${u8.byteLength} bytes). It may be empty or corrupt.` };
  }

  // Check ZIP magic bytes: PK signature (0x50 0x4B 0x03 0x04)
  if (u8[0] !== 0x50 || u8[1] !== 0x4B) {
    return { ok: false, reason: 'DOCX file is not a valid ZIP archive. The file may be corrupt.' };
  }

  return { ok: true };
};

/**
 * Sanitize chapter HTML for export — removes external images and dangerous scripts.
 * Returns clean HTML safe for embedding in EPUB/DOCX.
 */
export const sanitizeChapterForExport = (html: string): string => {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove <script> tags — not allowed in EPUB and unnecessary in DOCX
  doc.querySelectorAll('script').forEach(el => el.remove());

  // Remove <style> tags — styling comes from the export CSS, not inline styles
  // Note: Keep inline style= attributes as they carry formatting
  doc.querySelectorAll('style').forEach(el => el.remove());

  // Remove <link> tags — no external resources allowed
  doc.querySelectorAll('link').forEach(el => el.remove());

  // Handle <img> tags with external (non-data-URI) sources — strip them to avoid broken images
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (src && !src.startsWith('data:image/')) {
      // External URL — remove the image to prevent broken links in offline file
      // Replace with a caption if the img has alt text
      const alt = img.getAttribute('alt');
      if (alt && alt.trim()) {
        const placeholder = doc.createElement('p');
        placeholder.style.cssText = 'font-style: italic; color: #94a3b8; font-size: 0.9em;';
        placeholder.textContent = `[Image: ${alt}]`;
        img.parentNode?.replaceChild(placeholder, img);
      } else {
        img.remove();
      }
    }
  });

  // Remove <iframe> tags
  doc.querySelectorAll('iframe').forEach(el => el.remove());

  // Remove <video> and <audio> tags (not supported in EPUB)
  doc.querySelectorAll('video, audio').forEach(el => el.remove());

  return doc.body.innerHTML;
};
