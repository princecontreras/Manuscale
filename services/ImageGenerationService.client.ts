// DEPRECATED: This file is no longer used. Marketing image generation
// is handled via aiClient.ts -> /api/ai server route.
// Kept for reference only.

import type { GenerateContentResponse } from "@google/genai";

const imageCache = new Map<string, string>();
const coverImageCache = new Map<string, string>(); // Cache compressed cover images

// Browser-native image compression using Canvas
const compressImage = async (base64Data: string, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Data;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressedBase64.split(',')[1]);
        };
        img.onerror = reject;
    });
};

// Browser-native hashing
const hashString = async (text: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Pre-computed cover hash cache to avoid re-hashing MB of base64 per image call
let cachedCoverHashKey: string | null = null;
let cachedCoverHashValue: string | null = null;

const getCoverHash = async (coverImageBase64: string): Promise<string> => {
    // Only re-hash if the cover image actually changed (same cover across all marketing images)
    if (cachedCoverHashKey === coverImageBase64 && cachedCoverHashValue) {
        return cachedCoverHashValue;
    }
    const hash = await hashString(coverImageBase64);
    cachedCoverHashKey = coverImageBase64;
    cachedCoverHashValue = hash;
    return hash;
};

export const generateMarketingImage = async (
    prompt: string,
    coverImageBase64: string,
    onProgress: (imageUrl: string) => void
): Promise<string | undefined> => {
    // 1. Fast cache lookup: hash only the short prompt + a pre-computed cover hash
    const coverHash = await getCoverHash(coverImageBase64);
    const promptHash = await hashString(prompt);
    const hash = `${coverHash}_${promptHash}`;
    if (imageCache.has(hash)) {
        const cached = imageCache.get(hash)!;
        onProgress(cached);
        return cached;
    }

    // 2. Cache compressed cover image (avoid recompressing same image)
    let compressedBase64: string;
    if (coverImageCache.has(coverHash)) {
        compressedBase64 = coverImageCache.get(coverHash)!;
    } else {
        compressedBase64 = await compressImage(coverImageBase64);
        coverImageCache.set(coverHash, compressedBase64);
    }
    const mimeType = 'image/jpeg';

    // DEPRECATED: This function is no longer called. Use generateMarketingImage from aiClient.ts instead.
    return undefined;
};
