
import { EbookData, DesignSettings } from "../types";
import { generateSpeech } from "./aiClient";

// Helper to convert dataURI to Blob
const dataURItoUint8Array = (dataURI: string) => {
  const byteString = atob(dataURI.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return ia;
};

// HELPER: Escape special characters for XML text nodes (Metadata, Titles)
const escapeXML = (str: string | undefined) => {
  if (!str) return "";
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// HELPER: Sanitize HTML to valid XHTML for EPUB
const fixXHTML = (html: string): string => {
  if (!html) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const serializer = new XMLSerializer();
    let xml = "";
    for (let i = 0; i < doc.body.childNodes.length; i++) {
        xml += serializer.serializeToString(doc.body.childNodes[i]);
    }
    return xml;
  } catch (e) {
    console.warn("DOM-based XHTML repair failed, falling back to regex", e);
    let fixed = html;
    fixed = fixed.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
    fixed = fixed.replace(/&nbsp;/g, '&#160;');
    fixed = fixed.replace(/<br\s*\/?>/gi, '<br />');
    fixed = fixed.replace(/<hr\s*\/?>/gi, '<hr />');
    fixed = fixed.replace(/<img([^>]*?)>/gi, (match, attrs) => {
        if (match.trim().endsWith('/>')) return match;
        return `<img${attrs} />`;
    });
    return fixed;
  }
};

// Helper: Strip HTML for Text-to-Speech and clean whitespace
const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};

// Helper: Chunk text intelligently by sentence boundaries
const chunkText = (text: string, maxLength: number = 3000): string[] => {
    if (!text) return [];
    if (text.length <= maxLength) return [text];
    
    const chunks: string[] = [];
    let currentChunk = "";
    
    // Split by sentence-ending punctuation lookahead to keep punctuation
    const sentences = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = sentence;
            
            // Safety valve: If a single sentence is massive, hard split it
            while (currentChunk.length > maxLength) {
                 chunks.push(currentChunk.slice(0, maxLength));
                 currentChunk = currentChunk.slice(maxLength);
            }
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    
    return chunks;
};

// Unified CSS generation from DesignSettings — shared by EPUB and DOCX
const getExportCSS = (design?: DesignSettings): string => {
    const fontFamily = design?.fontFamily || "'Merriweather', serif";
    const fontSize = design?.fontSize || "11pt";
    const lineHeight = design?.lineHeight || "1.6";
    const paragraphSpacing = design?.paragraphSpacing || "1em";
    const firstLineIndent = design?.firstLineIndent || "0em";
    const blockIndent = design?.blockIndent || "0em";
    const justification = design?.justification === 'justify' ? 'justify' : 'left';
    const isIndent = design?.paragraphStyle === 'indent';

    return `
    body { font-family: ${fontFamily}; line-height: ${lineHeight}; font-size: ${fontSize}; margin: 0; padding: 1em; color: #1e293b; }
    h1 { text-align: center; page-break-before: always; margin-top: 2em; margin-bottom: 1em; font-size: 2em; font-weight: bold; }
    h2 { font-size: 1.5em; margin-top: 1.5em; margin-bottom: 0.75em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25em; }
    h3 { font-size: 1.25em; font-weight: 700; margin-top: 1.25em; margin-bottom: 0.5em; }
    h4 { font-size: 1em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1em; margin-bottom: 0.5em; color: #64748b; }
    p { text-align: ${justification}; margin-bottom: ${isIndent ? '0' : paragraphSpacing}; text-indent: ${isIndent ? (firstLineIndent === '0em' ? '1.5em' : firstLineIndent) : firstLineIndent}; margin-left: ${blockIndent}; margin-right: ${blockIndent}; }
    ${isIndent ? `h1 + p, h2 + p, h3 + p, h4 + p, p:first-of-type { text-indent: 0; }` : ''}
    img { max-width: 100%; height: auto; }
    blockquote { margin: 1.5em 2em; font-style: italic; color: #64748b; border-left: 2px solid #cbd5e1; padding-left: 1em; }
    table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.9em; }
    th { background-color: #f1f5f9; text-align: left; padding: 0.75rem; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
    td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; }

    /* Editorial Components */
    .callout-box { background-color: #f8fafc; border-left: 4px solid #64748b; padding: 1.5rem; margin: 2rem 0; border-radius: 0 8px 8px 0; }
    .callout-box h4 { margin-top: 0; color: #334155; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.05em; border: none; padding: 0; }
    .callout-box p { margin-bottom: 0; font-size: 0.95em; color: #475569; }

    .data-table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.9em; }
    .data-table th { background-color: #f1f5f9; text-align: left; padding: 0.75rem; border-bottom: 2px solid #cbd5e1; font-weight: 700; color: #334155; }
    .data-table td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }

    .pull-quote { font-size: 1.3em; font-style: italic; text-align: center; margin: 2.5rem 1.5rem; color: #475569; border: none; padding: 0; line-height: 1.4; }

    .action-plan { background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }
    .action-plan h4 { color: #047857; border-bottom: 1px solid #6ee7b7; padding-bottom: 0.5rem; margin-top: 0; }
    .action-plan ul { list-style: none; padding-left: 0; }
    .action-plan li { padding-left: 1.5rem; position: relative; margin-bottom: 0.5rem; }

    .case-study { background-color: #fff7ed; border: 1px solid #fed7aa; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }
    .self-assessment { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }

    /* Front/Back Matter */
    .bibliography-page ul { list-style: none; padding: 0; margin-left: 0; }
    .bibliography-page li { margin-bottom: 1em; text-indent: 0; }
    .bibliography-page a { color: #0000EE; text-decoration: none; }
    .copyright-page { font-size: 0.8em; text-align: center; margin-top: 50%; }
    .dedication-page { font-style: italic; text-align: center; margin-top: 30%; }
    `;
};

// Helper: Extract images from HTML and embed in ZIP (for DOCX word/media/)
const extractAndEmbedImages = async (html: string, zip: any): Promise<string> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');
    const mediaFolder = zip.folder("word/media");
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const src = img.getAttribute('src');
        if (src && src.startsWith('data:image/')) {
            const ext = src.split(';')[0].split('/')[1];
            const filename = `image_${i}.${ext}`;
            const uint8Array = dataURItoUint8Array(src);
            mediaFolder.file(filename, uint8Array);
            img.setAttribute('src', `media/${filename}`);
        }
    }
    return doc.body.innerHTML;
};

// Helper: Extract images from HTML and embed in EPUB OEBPS/images/
const extractAndEmbedImagesForEPUB = (html: string, oebps: any, chapterIndex: number): { html: string, manifestEntries: string[] } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');
    const manifestEntries: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const src = img.getAttribute('src');
        if (src && src.startsWith('data:image/')) {
            const mimeType = src.split(';')[0].split(':')[1];
            const ext = src.split(';')[0].split('/')[1];
            const filename = `img_ch${chapterIndex}_${i}.${ext}`;
            const uint8Array = dataURItoUint8Array(src);
            oebps.file(`images/${filename}`, uint8Array);
            img.setAttribute('src', `images/${filename}`);
            manifestEntries.push(`<item id="img_ch${chapterIndex}_${i}" href="images/${filename}" media-type="${mimeType}"/>`);
        }
    }
    
    return { html: doc.body.innerHTML, manifestEntries };
};

export const getDOCXUint8Array = async (data: EbookData): Promise<Uint8Array | null> => {
  // @ts-ignore
  if (!window.JSZip) {
      throw new Error("DOCX generator (JSZip) not loaded. Please refresh the page.");
  }

  // @ts-ignore
  const zip = new window.JSZip();

  const exportCSS = getExportCSS(data.design);

  let content = `
    <html>
    <head>
        <meta charset='utf-8'>
        <title>${escapeXML(data.title)}</title>
        <style>${exportCSS}</style>
    </head>
    <body>
        <div style="text-align: center; margin-top: 50px; margin-bottom: 50px;">
            <h1 style="font-size: 24pt; font-weight: bold; page-break-before: avoid;">${escapeXML(data.title)}</h1>
            <p style="font-size: 16pt; font-style: italic;">${escapeXML(data.blueprint?.subtitle)}</p>
            <p style="margin-top: 50px; font-size: 12pt;">by ${escapeXML(data.author || 'Unknown')}</p>
        </div>
        <br style="page-break-before:always" />
  `;

  if (data.frontMatter?.copyright) {
      content += `<div class="copyright-page"><p>${data.frontMatter.copyright.replace(/\n/g, '<br />')}</p></div><br style="page-break-before:always" />`;
  }

  if (data.frontMatter?.dedication) {
      content += `<div class="dedication-page"><p>${escapeXML(data.frontMatter.dedication)}</p></div><br style="page-break-before:always" />`;
  }

  if (data.outline) {
      for (const chapter of data.outline) {
          if (chapter.content) {
              content += `<div style="page-break-before: always;"></div>`;
              content += await extractAndEmbedImages(chapter.content, zip);
              content += `<br style="page-break-before:always" />`;
          }
      }
  } else {
      for (const page of data.pages.slice(1)) {
          content += await extractAndEmbedImages(page, zip);
          content += `<br style="page-break-before:always" />`;
      }
  }

  if (data.backMatter?.bibliography) {
      content += `<div class="bibliography-page">${data.backMatter.bibliography}</div>`;
      content += `<br style="page-break-before:always" />`;
  }

  if (data.frontMatter?.aboutAuthor) {
      content += `<h1>About the Author</h1><p>${data.frontMatter.aboutAuthor.replace(/\n/g, '<br />')}</p>`;
  }

  content += `</body></html>`;

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="html" ContentType="text/html"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Default Extension="webp" ContentType="image/webp"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const wordFolder = zip.folder("word");

  wordFolder.folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="htmlChunk.html"/>
</Relationships>`);

  wordFolder.file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:altChunk r:id="rId1"/>
  </w:body>
</w:document>`);

  wordFolder.file("htmlChunk.html", content);

  return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
};

export const generateDOCX = async (data: EbookData) => {
  const u8 = await getDOCXUint8Array(data);
  if (!u8) return;
  const blob = new Blob([u8 as any], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.title.replace(/\s+/g, '_')}_Manuscript.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getEPUBUint8Array = async (data: EbookData): Promise<Uint8Array | null> => {
  // @ts-ignore
  if (!window.JSZip) {
      throw new Error("EPUB generator (JSZip) not loaded. Please refresh the page.");
  }
  
  // @ts-ignore
  const zip = new window.JSZip();
  
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.folder("META-INF").file("container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  
  const oebps = zip.folder("OEBPS");
  const uuid = data.frontMatter?.isbn || `urn:uuid:${data.id}`;
  
  const css = getExportCSS(data.design);
  oebps.file("styles.css", css);

  let spineRefs = "";
  let manifestItems = `<item id="css" href="styles.css" media-type="text/css"/>`;
  let tocNav = `<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc" id="toc"><ol>`;

  const safeTitle = escapeXML(data.title);
  const safeAuthor = escapeXML(data.author || 'Unknown');
  const safeSubtitle = escapeXML(data.blueprint?.subtitle);

  if (data.coverImage) {
      const coverU8 = dataURItoUint8Array(data.coverImage);
      oebps.file("cover.jpg", coverU8);
      manifestItems += `<item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>`;
      manifestItems += `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
      spineRefs += `<itemref idref="cover"/>`;
      const coverPage = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><div style="text-align:center;"><img src="cover.jpg" alt="Cover" style="max-width:100%;"/></div></body></html>`;
      oebps.file("cover.xhtml", coverPage);
  }

  const titlePage = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Title Page</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><div style="text-align:center; margin-top: 30%;"><h1>${safeTitle}</h1><p style="font-size:1.5em; font-style:italic;">${safeSubtitle}</p><p style="margin-top:2em;">by ${safeAuthor}</p></div></body></html>`;
  oebps.file("title.xhtml", titlePage);
  manifestItems += `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`;
  spineRefs += `<itemref idref="title"/>`;

  if (data.frontMatter?.copyright) {
      const copyrightContent = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Copyright</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><div class="copyright-page"><p>${data.frontMatter.copyright.replace(/\n/g, '<br />')}</p></div></body></html>`;
      oebps.file("copyright.xhtml", copyrightContent);
      manifestItems += `<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>`;
      spineRefs += `<itemref idref="copyright"/>`;
  }

  if (data.frontMatter?.dedication) {
      const dedicationContent = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Dedication</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><div class="dedication-page"><p>${escapeXML(data.frontMatter.dedication)}</p></div></body></html>`;
      oebps.file("dedication.xhtml", dedicationContent);
      manifestItems += `<item id="dedication" href="dedication.xhtml" media-type="application/xhtml+xml"/>`;
      spineRefs += `<itemref idref="dedication"/>`;
  }

  if (data.outline) {
      data.outline.forEach((chapter, index) => {
          if (chapter.content) {
              const filename = `chapter_${index + 1}.xhtml`;
              // Extract base64 images into separate files
              const { html: processedHtml, manifestEntries } = extractAndEmbedImagesForEPUB(chapter.content, oebps, index);
              manifestEntries.forEach(entry => { manifestItems += entry; });
              const sanitizedContent = fixXHTML(processedHtml);
              const safeChapterTitle = escapeXML(chapter.title);
              const chapterContent = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${safeChapterTitle}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body>${sanitizedContent}</body></html>`;
              oebps.file(filename, chapterContent);
              manifestItems += `<item id="ch${index + 1}" href="${filename}" media-type="application/xhtml+xml"/>`;
              spineRefs += `<itemref idref="ch${index + 1}"/>`;
              tocNav += `<li><a href="${filename}">${safeChapterTitle}</a></li>`;
          }
      });
  }

  if (data.backMatter?.bibliography) {
      const sanitizedBib = fixXHTML(data.backMatter.bibliography);
      const bibContent = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>References</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body>${sanitizedBib}</body></html>`;
      oebps.file("references.xhtml", bibContent);
      manifestItems += `<item id="references" href="references.xhtml" media-type="application/xhtml+xml"/>`;
      spineRefs += `<itemref idref="references"/>`;
      tocNav += `<li><a href="references.xhtml">References</a></li>`;
  }

  if (data.frontMatter?.aboutAuthor) {
      const authorContent = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>About the Author</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><h1>About the Author</h1><p>${data.frontMatter.aboutAuthor.replace(/\n/g, '<br />')}</p></body></html>`;
      oebps.file("about_author.xhtml", authorContent);
      manifestItems += `<item id="about_author" href="about_author.xhtml" media-type="application/xhtml+xml"/>`;
      spineRefs += `<itemref idref="about_author"/>`;
      tocNav += `<li><a href="about_author.xhtml">About the Author</a></li>`;
  }

  tocNav += `</ol></nav>`;
  oebps.file("toc.xhtml", `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Table of Contents</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><h1>Table of Contents</h1>${tocNav}</body></html>`);
  manifestItems += `<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>`;
  
  let finalSpine = "";
  if (data.coverImage) finalSpine += `<itemref idref="cover"/>`;
  finalSpine += `<itemref idref="title"/>`;
  if (data.frontMatter?.copyright) finalSpine += `<itemref idref="copyright"/>`;
  if (data.frontMatter?.dedication) finalSpine += `<itemref idref="dedication"/>`;
  finalSpine += `<itemref idref="toc"/>`;
  if (data.outline) {
      data.outline.forEach((c, i) => { if(c.content) finalSpine += `<itemref idref="ch${i+1}"/>`; });
  }
  if (data.backMatter?.bibliography) finalSpine += `<itemref idref="references"/>`;
  if (data.frontMatter?.aboutAuthor) finalSpine += `<itemref idref="about_author"/>`;

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
  <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${safeTitle}</dc:title>
        <dc:creator>${safeAuthor}</dc:creator>
        <dc:language>en</dc:language>
        <dc:identifier id="BookId">${uuid}</dc:identifier>
        <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
    </metadata>
    <manifest>${manifestItems}</manifest>
    <spine>${finalSpine}</spine>
  </package>`;
  
  oebps.file("content.opf", opf);

  return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
};

export const generateEPUB = async (data: EbookData) => {
  const u8 = await getEPUBUint8Array(data);
  if (!u8) return;
  const blob = new Blob([u8 as any], { type: "application/epub+zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.title.replace(/\s+/g, '_')}.epub`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateMarketingAssetsZip = async (data: EbookData) => {
  // @ts-ignore
  if (!window.JSZip) {
      throw new Error("ZIP generator (JSZip) not loaded. Please refresh the page.");
  }

  // @ts-ignore
  const zip = new window.JSZip();

  // 1. Cover Image
  if (data.coverImage) {
      const coverU8 = dataURItoUint8Array(data.coverImage);
      zip.file(`${data.title.replace(/\s+/g, '_')}_Cover.jpg`, coverU8);
  }

  // 2. 3D Mockup
  if (data.marketing?.mockupImage) {
      const mockupU8 = dataURItoUint8Array(data.marketing.mockupImage);
      zip.file(`${data.title.replace(/\s+/g, '_')}_3D_Mockup.png`, mockupU8);
  }

  // 3. Metadata and Marketing Assets
  if (data.marketing) {
      const assets = data.marketing;
      const plainTextBlurb = assets.blurb ? assets.blurb.replace(/<[^>]+>/g, '').trim() : '';
      const kPrice = assets.priceStrategy ? (assets.priceStrategy.match(/\$([0-9.]+)/)?.[1] || '9.99') : '9.99';
      const pPrice = (parseFloat(kPrice) + 8.00).toFixed(2);
      const socialContent = assets.socialPosts ? assets.socialPosts.map(p => `[${p.platform}]\n${p.content}`).join('\n\n') : '';
      
      const aPlusContent = (assets.aPlusContent && Array.isArray(assets.aPlusContent)) ? assets.aPlusContent.map((m, i) => 
`MODULE ${i + 1}: Standard Image Header with Text
Headline: ${m.headline}
Body: ${m.body}
Image Prompt: ${m.imagePrompt}`
      ).join('\n\n') : "No A+ Content generated.";

      const textContent = `BOOK METADATA
--------------------------------------------------
TITLE: ${data.title || 'Untitled'}
SUBTITLE: ${data.blueprint?.subtitle || 'N/A'}
AUTHOR: ${data.author || 'Unknown'}
ISBN: ${data.isbn || 'N/A'}

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
${assets.priceStrategy || 'N/A'}

--------------------------------------------------
BOOK BLURB (Plain Text / Back Cover)
--------------------------------------------------
${plainTextBlurb}

--------------------------------------------------
AMAZON DESCRIPTION (HTML for KDP)
--------------------------------------------------
${assets.amazonDescription || assets.blurb || 'N/A'}

--------------------------------------------------
KEYWORDS (${assets.keywords?.length || 0})
--------------------------------------------------
${assets.keywords?.join('\n') || 'N/A'}

--------------------------------------------------
CATEGORIES
--------------------------------------------------
${assets.categories?.join('\n') || 'N/A'}

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
      zip.file(`${data.title.replace(/\s+/g, '_')}_Metadata.txt`, textContent);
      
      // Marketing Images
      if (assets.facebookAdCreatives?.[0]?.image) {
          const fbU8 = dataURItoUint8Array(assets.facebookAdCreatives[0].image);
          zip.file(`${data.title.replace(/\s+/g, '_')}_FB_Ad.png`, fbU8);
      }
      if (assets.socialMediaGraphics?.[0]?.image) {
          const socialU8 = dataURItoUint8Array(assets.socialMediaGraphics[0].image);
          zip.file(`${data.title.replace(/\s+/g, '_')}_Social_Graphic.png`, socialU8);
      }
      if (assets.quoteGraphics?.[0]?.image) {
          const quoteU8 = dataURItoUint8Array(assets.quoteGraphics[0].image);
          zip.file(`${data.title.replace(/\s+/g, '_')}_Quote_Graphic.png`, quoteU8);
      }
  }

  // Download the ZIP
  const u8 = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const blob = new Blob([u8 as any], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.title.replace(/\s+/g, '_')}_Marketing_Assets.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateAudiobookZip = async (
    data: EbookData, 
    voiceName: string, 
    onProgress: (percent: number) => void, 
    shouldDownload: boolean = true,
    quality: 'standard' | 'premium' = 'standard'
): Promise<Blob | null> => {
    // @ts-ignore
    if (!window.JSZip) {
        throw new Error("Audiobook generator (JSZip) not loaded. Please refresh the page.");
    }

    // @ts-ignore
    const zip = new window.JSZip();
    const audioFolder = zip.folder("audiobook");
    
    // Create a playlist/manifest file
    let m3u8Content = "#EXTM3U\n";
    
    const chapters = (data.outline || []).filter(c => c.status === 'completed' && c.content);
    if (chapters.length === 0) {
        throw new Error("No completed chapters to generate audiobook from.");
    }

    // --- NEW: CONCURRENCY QUEUE ARCHITECTURE ---
    
    // 1. Flatten all work into a queue
    interface AudioTask {
        chapterIndex: number;
        chunkIndex: number;
        text: string;
    }
    
    const queue: AudioTask[] = [];
    
    chapters.forEach((chapter, cIdx) => {
        const plainText = stripHtml(chapter.content || "");
        const chunks = chunkText(plainText, 3000); 
        chunks.forEach((chunk, kIdx) => {
            queue.push({
                chapterIndex: cIdx,
                chunkIndex: kIdx,
                text: chunk
            });
        });
    });

    const totalTasks = queue.length;
    let completedCount = 0;
    const audioResults: Record<number, Record<number, Uint8Array>> = {};
    const CONCURRENCY_LIMIT = 15; // Increased for faster audiobook generation

    // 2. Worker Definition
    const processItem = async (task: AudioTask) => {
        try {
            const base64Audio = await generateSpeech(task.text, voiceName, quality);
            if (base64Audio) {
                const binaryString = atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let k = 0; k < len; k++) {
                    bytes[k] = binaryString.charCodeAt(k);
                }
                
                if (!audioResults[task.chapterIndex]) {
                    audioResults[task.chapterIndex] = {};
                }
                audioResults[task.chapterIndex][task.chunkIndex] = bytes;
            }
        } catch (e) {
            console.error(`Failed to generate audio for Ch ${task.chapterIndex + 1} Chunk ${task.chunkIndex}`, e);
        } finally {
            completedCount++;
            // Update progress (0-90%)
            onProgress(Math.round((completedCount / totalTasks) * 90));
        }
    };

    // 3. Execution Engine (Promise Pool)
    const activeWorkers = [];
    // Clone queue to avoid mutation issues if we used shift directly in loop condition with index
    const workQueue = [...queue]; 
    
    const worker = async () => {
        while (workQueue.length > 0) {
            const task = workQueue.shift();
            if (task) {
                await processItem(task);
            }
        }
    };

    // Spawn workers
    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
        activeWorkers.push(worker());
    }

    await Promise.all(activeWorkers);

    // 4. Reassembly & Stitching
    onProgress(95); // Stitching phase

    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const chapterChunks = audioResults[i];
        
        if (!chapterChunks) continue; // Chapter failed completely?

        // Sort chunks to ensure correct order 0, 1, 2...
        const sortedKeys = Object.keys(chapterChunks).map(Number).sort((a, b) => a - b);
        const audioParts = sortedKeys.map(k => chapterChunks[k]);
        
        // Calculate total size
        let totalLength = 0;
        audioParts.forEach(part => totalLength += part.length);

        if (totalLength > 0) {
            const combinedBuffer = new Uint8Array(totalLength);
            let offset = 0;
            for (const part of audioParts) {
                combinedBuffer.set(part, offset);
                offset += part.length;
            }

            // WAV Header Construction (24kHz, 16bit, Mono)
            const sampleRate = 24000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const header = new ArrayBuffer(44);
            const view = new DataView(header);
            
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + totalLength, true);
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
            view.setUint32(40, totalLength, true);
            
            const finalArray = new Uint8Array(44 + totalLength);
            finalArray.set(new Uint8Array(header), 0);
            finalArray.set(new Uint8Array(combinedBuffer), 44);
            
            // Clean filename
            const safeTitle = chapter.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const filename = `Chapter_${i + 1}_${safeTitle}.wav`;
            
            audioFolder.file(filename, finalArray);
            m3u8Content += `#EXTINF:-1,${chapter.title}\n${filename}\n`;
        }
    }
    
    // Add Playlist
    audioFolder.file("playlist.m3u8", m3u8Content);
    
    onProgress(100);
    
    // Generate Blob
    const u8 = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const blob = new Blob([u8 as any], { type: "application/zip" });

    // Download
    if (shouldDownload) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.title.replace(/\s+/g, '_')}_Audiobook.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    return blob;
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
