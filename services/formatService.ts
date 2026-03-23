import { EbookData, OutlineItem, ProjectBlueprint, ProjectMemory } from "../types";
import { paginateContent } from "../utils/pagination";

// FIX: Extend Window interface for global libraries loaded via CDN
declare global {
    interface Window {
        JSZip: any;
    }
}

// --- HELPERS ---

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- EXPORT FUNCTIONS ---

export const parseEPUB = async (file: File): Promise<EbookData> => {
    if (!window.JSZip) throw new Error("JSZip not found");
    const zip = await new window.JSZip().loadAsync(file);

    // 1. Find the OPF file path from META-INF/container.xml
    const containerXml = await zip.file("META-INF/container.xml")?.async("string");
    if (!containerXml) throw new Error("Invalid EPUB: No container.xml");

    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, "text/xml");
    const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
    if (!opfPath) throw new Error("Invalid EPUB: No rootfile in container");

    // 2. Parse OPF to get Metadata and Manifest
    const opfContent = await zip.file(opfPath)?.async("string");
    if (!opfContent) throw new Error("Invalid EPUB: OPF file missing");
    const opfDoc = parser.parseFromString(opfContent, "text/xml");

    // Metadata
    const title = opfDoc.querySelector("metadata title")?.textContent || "Untitled Book";
    const author = opfDoc.querySelector("metadata creator")?.textContent || "Unknown Author";
    
    // Manifest & Spine
    const manifestItems: Record<string, string> = {}; // id -> href
    opfDoc.querySelectorAll("manifest item").forEach(item => {
        manifestItems[item.getAttribute("id")!] = item.getAttribute("href")!;
    });

    const spineRefs: string[] = [];
    opfDoc.querySelectorAll("spine itemref").forEach(ref => {
        spineRefs.push(ref.getAttribute("idref")!);
    });

    // 3. Construct Path Helper (relative to OPF)
    const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

    // 4. Load Chapters
    const outline: OutlineItem[] = [];
    let chapterCount = 0;

    for (const refId of spineRefs) {
        const href = manifestItems[refId];
        if (!href) continue;

        // Load XHTML Content
        const fullPath = opfDir + href;
        const fileContent = await zip.file(fullPath)?.async("string");
        if (!fileContent) continue;

        const doc = parser.parseFromString(fileContent, "application/xhtml+xml") || parser.parseFromString(fileContent, "text/html");
        const body = doc.body;

        // Clean up content: Resolve Images to Base64
        const images = body.querySelectorAll("img");
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const src = img.getAttribute("src");
            if (src) {
                // Resolve relative path
                let imgPath = opfDir + src; 
                // Handle "../" naive resolution
                if (src.startsWith("../")) imgPath = src.replace("../", ""); 
                
                const imgFile = zip.file(imgPath);
                if (imgFile) {
                    const blob = await imgFile.async("blob");
                    const base64 = await blobToBase64(blob);
                    img.setAttribute("src", base64);
                }
            }
        }

        const cleanHTML = body.innerHTML;
        const textContent = body.textContent || "";
        const words = textContent.trim().split(/\s+/).length;

        // Try to extract a title from h1-h3
        let chapterTitle = `Chapter ${chapterCount + 1}`;
        const header = body.querySelector("h1, h2, h3");
        if (header) {
            chapterTitle = header.textContent || chapterTitle;
        }

        const item: OutlineItem = {
            id: crypto.randomUUID(),
            chapterNumber: chapterCount + 1,
            title: chapterTitle,
            beat: "Imported Chapter",
            status: "completed",
            targetWordCount: words,
            content: cleanHTML,
            generatedPages: paginateContent(cleanHTML)
        };

        outline.push(item);
        chapterCount++;
    }

    // 5. Construct Project Data
    const project: EbookData = {
        id: crypto.randomUUID(),
        title,
        author,
        lastModified: Date.now(),
        pages: [], 
        outline: outline,
        wordCount: outline.reduce((sum, i) => sum + i.targetWordCount, 0),
        status: "draft",
        blueprint: {
            title,
            type: "Fiction", // Default
            genre: "Imported",
            summary: "Imported from EPUB",
            visualStyle: "Standard",
            coverPrompt: "",
            profile: {
                voice: "Neutral",
                tense: "Past",
                pov: "Third Person Limited",
                targetAudience: "General",
                complexity: "Intermediate",
                targetWordCount: 0,
                chapterCount: outline.length
            }
        },
        marketing: {
            blurb: "",
            socialPosts: [],
            emailAnnouncement: "",
            keywords: [],
            categories: [],
            priceStrategy: ""
        }
    };

    return project;
};