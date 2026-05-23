# AI Model Usage Audit Report

**Date:** May 23, 2026  
**Status:** ⚠️ CRITICAL ISSUES FOUND

## Executive Summary

The app was upgraded to use **Gemini 3.5 Flash** across all text tasks, but **the upgrade is incomplete**. Many features are not using the proper model selection logic, and there are **critical inconsistencies** that could impact performance, cost, and quality.

---

## 1. MODEL CONFIGURATION ISSUES

### Issue 1.1: All Models Mapped to Same Variant ❌
**File:** [geminiService.ts](geminiService.ts#L10-L16)

```typescript
export const MODEL_PRO = 'gemini-3.5-flash';          // ← Should be different!
export const MODEL_PRO_STABLE = 'gemini-3.5-flash';  // ← Should be different!
export const MODEL_FLASH = 'gemini-3.5-flash';       // ✓ Correct
export const MODEL_FLASH_STABLE = 'gemini-3.5-flash'; // ✓ Correct
```

**Problem:** `MODEL_PRO` and `MODEL_PRO_STABLE` are identical to `MODEL_FLASH`. The upgrade unified everything to 3.5-Flash, but the constants still pretend there are premium variants.

**Impact:** 
- No fallback differentiation when a model fails
- `callWithModelFallback()` logic becomes ineffective
- Cost optimization is compromised

**Status:** Needs clarification on intended model strategy

---

## 2. INCONSISTENT selectModelForTask USAGE

### Issue 2.1: Function Only Used in 7 Places ⚠️

**Properly Using selectModelForTask:** ✓
- `generateMarketingMetadata()` - line 1911
- `generateBackCoverCopy()` - line 1938
- `generateSocialAndEmail()` - line 1978
- `generateImagePrompts()` - line 2028
- `generateAPlusContent()` - line 2065
- `generateAboutAuthor()` - line 2091
- `generateDedication()` - line 2120

**NOT Using selectModelForTask:** ❌ (Major functions)
- `analyzeTopicAndConfigure()` - hardcoded `MODEL_FLASH` (line 842)
- `generateProjectOutline()` - hardcoded `MODEL_FLASH` (line 1006, 1015)
- `generateAuthorityBible()` - needs audit
- `generateBibliography()` - needs audit
- `generateImageFromPrompt()` - hardcoded `MODEL_IMAGE` (line 1803)
- `generateChapterContentStream()` - hardcoded `MODEL_PRO` (line 1530+)
- `proofreadChapter()` - hardcoded `MODEL_FLASH` (line 2490)
- `analyzeChapterAftermath()` - hardcoded `MODEL_FLASH` (line 2310)
- `compressGlobalSummary()` - hardcoded `MODEL_FLASH` (line 2330)
- `expandChapterBeat()` - hardcoded `MODEL_FLASH` (line 2355)
- `breakDownChapter()` - hardcoded `MODEL_FLASH` (line 2380)
- `expandNonFictionOutline()` - hardcoded `MODEL_FLASH` (line 2415)
- `performMagicRefinement()` - hardcoded `MODEL_PRO` (line 2440)
- `analyzeRemixContent()` - hardcoded `MODEL_FLASH` (line 2625)
- `performResearch()` - hardcoded `MODEL_FLASH` (line 2690)
- `synthesizeBlueprintFromMemory()` - hardcoded `MODEL_FLASH` (line 2785)
- `consultDirector()` - hardcoded `MODEL_FLASH` (line 2890)
- `runSpecialistAgent()` - complex logic (line 2940+)

**Impact:** High-value operations not benefiting from adaptive model selection

---

## 3. CRITICAL BUG: Model Variable Ignored

### Issue 3.1: Selected Model Not Used in generateAPlusContent ❌
**File:** [geminiService.ts](geminiService.ts#L2085-L2110)

```typescript
const model = selectModelForTask('marketing', apiStressLevel > 40);  // ← Selected dynamically

const response = await callWithModelFallback(
    (model) => retryWithBackoff<GenerateContentResponse>(...),
    MODEL_FLASH,  // ← ❌ IGNORING THE SELECTED MODEL!
    signal
);
```

**Problem:** The variable `model` is computed but then `MODEL_FLASH` is hardcoded as the fallback.

**Status:** MUST FIX

---

## 4. MISSING TASK TYPES IN selectModelForTask

The function doesn't have entries for:
- ✗ `'proofread'` - Used but not defined
- ✗ `'remixAnalysis'` - Missing
- ✗ `'research'` - Hardcoded instead
- ✗ `'aftermath'` - Chapter analysis not optimized
- ✗ `'compression'` - Global summary not optimized

**Impact:** These features fall back to `default: MODEL_FLASH`, missing potential optimizations

---

## 5. CHAPTER GENERATION NOT USING selectModelForTask

### Issue 5.1: generateChapterContentStream Hardcoded ❌
**File:** [geminiService.ts](geminiService.ts#L1530+)

The most expensive operation (chapter generation) uses hardcoded `MODEL_PRO` without adaptive selection.

**Should be:** `selectModelForTask('chapterContent', underHighLoad)`

**Current flow:**
1. Tries `MODEL_PRO` 
2. On failure, tries `MODEL_FLASH_STABLE`
3. Falls back through multiple hardcoded attempts

**Correct flow:**
1. Select model based on task and API stress
2. Use retry logic with that model
3. Fall back intelligently

---

## 6. MODEL SELECTION LOGIC MISMATCH

### Issue 6.1: selectModelForTask Has Inconsistent Behavior

**Normal Load:**
```typescript
case 'outline': return MODEL_PRO;  // Complex (correct)
case 'chapterContent': return MODEL_PRO;  // Quality critical (correct)
```

**High Load:**
```typescript
case 'outline': return MODEL_FLASH;  // Downgrades to Flash
case 'chapterContent': return MODEL_PRO;  // Stays Premium
```

**Problem:** Since all constants point to `gemini-3.5-flash`, this logic is ineffective. Need clarification on intended behavior.

---

## 7. IMAGE GENERATION BYPASS

### Issue 7.2: MODEL_IMAGE Variables Point to Different Models
**File:** [geminiService.ts](geminiService.ts#L14-L15)

```typescript
export const MODEL_IMAGE = 'gemini-3-pro-image-preview';  // Premium image model
export const MODEL_IMAGE_STABLE = 'gemini-2.5-flash-image';  // Fallback
```

**Status:** ✓ These are CORRECT and different

---

## 8. RUNTIME INEFFICIENCIES

### Issue 8.1: No Load-Aware Selection in Core Functions

Functions that should check `apiStressLevel`:
- `generateChapterContentStream()` - ❌ Always uses `MODEL_PRO`
- `generateAuthorityBible()` - ❌ Hardcoded
- `performMagicRefinement()` - ❌ Hardcoded `MODEL_PRO` even for simple edits
- `analyzeChapterAftermath()` - ❌ Hardcoded `MODEL_FLASH` even when overloaded

---

## RECOMMENDATIONS

### Priority 1: CRITICAL (Fix Today) 🔴
1. **Fix generateAPlusContent bug** - Use selected model instead of hardcoded MODEL_FLASH
2. **Add missing task types** to selectModelForTask: `'proofread'`, `'aftermath'`, `'compression'`, `'research'`, `'remixAnalysis'`
3. **Clarify MODEL_PRO constants** - Are they intentionally same as FLASH? If not, update them.

### Priority 2: HIGH (Fix This Week) 🟠
4. Refactor chapter generation to use selectModelForTask
5. Add load-aware selection to high-cost functions:
   - `performMagicRefinement()` 
   - `generateAuthorityBible()`
   - `analyzeChapterAftermath()`
6. Update `generateChapterContentStream()` to respect API stress level

### Priority 3: MEDIUM (Optimize Later) 🟡
7. Review `runSpecialistAgent()` - model selection logic is confusing
8. Add more granular task types for better cost control
9. Document which models handle which task types in production

---

## FEATURE QUALITY CHECK

| Feature | Model Used | Adaptive? | Issue |
|---------|-----------|-----------|-------|
| Blueprint Analysis | FLASH | ❌ | Hardcoded |
| Outline Generation | FLASH | ❌ | Hardcoded, should be PRO |
| Authority Bible | (needs audit) | ? | Missing review |
| Chapter Generation | PRO | ❌ | Hardcoded, no stress handling |
| Metadata | `selectModelForTask()` ✓ | ✓ | Correct |
| Marketing Copy | `selectModelForTask()` ✓ | ✓ | Correct |
| Dedication | `selectModelForTask()` ✓ | ✓ | Correct |
| Image Prompts | `selectModelForTask()` ✓ | ✓ | Correct |
| A+ Content | **Bug** ❌ | Selected but ignored | CRITICAL BUG |
| Proofreading | FLASH | ❌ | Hardcoded, no task type |
| Magic Refinement | PRO | ❌ | Hardcoded, could be FLASH for simple edits |
| Research | FLASH | ❌ | Hardcoded |

---

## Next Steps

1. ✅ Review findings with dev team
2. ⏳ Decide on MODEL_PRO vs FLASH strategy
3. ⏳ Apply fixes systematically
4. ⏳ Test adaptive loading under high API stress
5. ⏳ Monitor token usage and costs post-fix

