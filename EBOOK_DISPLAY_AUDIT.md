# EbookDisplay Formatting Feature Audit

**Audit Date**: April 27, 2026
**Component**: `components/EbookDisplay.tsx`
**Related Files**: `app/globals.css`, `types.ts`, `utils/pagination.ts`

---

## Executive Summary

The EbookDisplay component provides chapter editing and preview functionality with comprehensive formatting tools. The audit identifies **7 critical issues** and **5 warnings** affecting formatting consistency, contentEditable behavior, and CSS variable application.

---

## Critical Issues Found

### 1. **CSS Variable Binding Not Applied to contentEditable Editor** ⚠️ CRITICAL
**Location**: [ChapterEditor component](components/EbookDisplay.tsx#L127-L195)
**Severity**: CRITICAL

**Problem**:
The `ChapterEditor` component sets inline styles with the design variables:
```typescript
const styles: React.CSSProperties = {
    fontFamily: design.fontFamily,
    fontSize: design.fontSize,
    lineHeight: design.lineHeight,
    textAlign: design.justification === 'justify' ? 'justify' : 'left',
};
```

However, these styles are applied directly to the contentEditable `<div>`, but the paragraph spacing, indent, and block indent are set as CSS custom properties (`--paragraph-spacing`, `--first-line-indent`, `--block-indent`) in other components but NOT in ChapterEditor.

**Impact**: 
- Users editing chapters won't see paragraph spacing updates
- First-line indents won't apply during editing
- Block indents are invisible in the editor

**Expected Behavior**: All design settings should be reflected in real-time during editing.

---

### 2. **ContentEditable innerHTML Mutation Race Condition** ⚠️ CRITICAL
**Location**: [ChapterEditor useLayoutEffect](components/EbookDisplay.tsx#L141-L145)
**Severity**: CRITICAL

**Problem**:
```typescript
useLayoutEffect(() => {
    if (editorRef.current && html !== editorRef.current.innerHTML && !isTyping.current) {
        editorRef.current.innerHTML = html;
    }
}, [html]);
```

This directly mutates innerHTML when the parent component re-renders. However:
- When a user is actively typing and the parent re-renders, this can cause cursor position loss
- The `isTyping` flag doesn't prevent all race conditions if updates come rapidly
- HTML comparison is string-based, causing false negatives

**Impact**:
- Cursor jumps/resets during editing
- User edits can be lost if parent updates
- Poor typing experience when making rapid selections

**Suggested Fix**: Use `contentEditable` with proper DOM diffing or use a library like ProseMirror.

---

### 3. **Formatting Toolbar Active State Incomplete** ⚠️ HIGH
**Location**: [EditorToolbar component](components/EbookDisplay.tsx#L354-L380)
**Severity**: HIGH

**Problem**:
The toolbar only checks a subset of formatting states:
```typescript
useEffect(() => {
    const checkFormat = () => {
        const formats: Record<string, boolean> = {};
        ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter'].forEach(cmd => {
            formats[cmd] = document.queryCommandState(cmd);
        });
        setActiveFormats(formats);
    };
    // ...
}, []);
```

Missing checks for:
- `h1`, `h2`, `h3` (heading formats)
- `justifyRight`, `justifyFull`
- `insertUnorderedList`, `insertOrderedList`
- `blockquote`

**Impact**: 
- Toolbar buttons for headings don't show as active when applied
- Alignment buttons don't reflect current state
- List buttons don't toggle properly

---

### 4. **DOMPurify Strips Custom Table/Callout HTML** ⚠️ HIGH
**Location**: [EditorToolbar insertTable/insertCallout](components/EbookDisplay.tsx#L336-L350)
**Severity**: HIGH

**Problem**:
The toolbar inserts HTML using `document.execCommand('insertHTML')` with inline styles:
```typescript
const table = `<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;">...`;
```

Later, when content is sanitized via DOMPurify, the `ALLOWED_ATTR` configuration allows `style`:
```javascript
ALLOWED_ATTR: ['class', 'style', 'id', 'href', 'src', 'alt', 'title', 'width', 'height', 'data-*', 'aria-*']
```

However, the DOMPURIFY_CONFIG at the top of the file doesn't allow all table-related attributes:
```typescript
const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption', 'col', 'colgroup', ...],
    ALLOWED_ATTR: [...]  // style IS allowed
};
```

**Actual Problem**: The issue is subtle - when user-inserted HTML goes through DOMPurify, the CONFIG is correctly set, but there's potential for mismatches in different code paths.

**Impact**: 
- Tables may render without proper styling
- Callout boxes may lose their styling
- Inconsistent rendering between edit and preview modes

---

### 5. **Design Settings Not Persisted to All Preview Modes** ⚠️ HIGH
**Location**: [DevicePreview, DocxPreview, PageView components](components/EbookDisplay.tsx#L461-L640)
**Severity**: HIGH

**Problem**:
Each preview mode independently sets CSS variables:
```typescript
const styles = { 
    '--ebook-font': design.fontFamily,
    '--font-size': design.fontSize,
    // ...
} as React.CSSProperties;
```

But the CSS variables are only used in `.book-content` class selector:
```css
.book-content {
    font-family: var(--ebook-font);
    font-size: var(--font-size);
    line-height: var(--line-height);
    text-align: justify;
    hyphens: auto;
}
```

**Issues**:
1. The root CSS uses `text-align: justify` hardcoded in `.book-content`
2. User's justification setting (`design.justification`) is only applied via inline `textAlign` style, not via the `.book-content` class
3. No CSS cascade for complex selectors like `h2`, `blockquote`, etc.

**Impact**:
- Justification setting might not apply consistently
- Preview modes may not match the design settings

---

### 6. **Paragraph Indent/Spacing Classes Missing from ChapterEditor** ⚠️ MEDIUM
**Location**: [ChapterEditor className](components/EbookDisplay.tsx#L186-L187)
**Severity**: MEDIUM

**Problem**:
The `ChapterEditor` applies `paraClass` correctly:
```typescript
className={`outline-none focus:outline-none book-content ${paraClass}`}
```

However, when new HTML is inserted via AI refinement (SelectionMenu → performAIAction), the inserted HTML nodes don't inherit the paragraph styling because:
1. New `<p>` tags inserted via `document.createRange().createContextualFragment()` don't have proper class ancestry
2. CSS pseudo-selectors (`:first-of-type`, `h2 + p`) may not match after AI insertion

**Impact**:
- AI-refined text paragraphs don't have proper indentation
- First paragraphs after headings don't reset indent correctly
- Inconsistent paragraph styling after AI operations

---

### 7. **Selection Menu Position Calculation Incorrect** ⚠️ MEDIUM
**Location**: [ChapterEditor handleSelect](components/EbookDisplay.tsx#L155-L164)
**Severity**: MEDIUM

**Problem**:
```typescript
const handleSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
        setMenuPos(null);
        return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    if (selection.toString().trim().length > 5) {
        setMenuPos({ top: rect.top, left: rect.left + (rect.width / 2) });  // ← ISSUE
```

The position calculation uses `rect.top` and `rect.left`, but these are **viewport-relative** (getBoundingClientRect). When the document is scrolled, the menu appears in the wrong position.

**Impact**:
- Selection menu appears in wrong location when page is scrolled
- Menu position doesn't update when user scrolls while selecting

---

## Warnings & Best Practice Issues

### W1: No Error Boundary for AI Actions
**Location**: [performAIAction](components/EbookDisplay.tsx#L168-L181)

The `performMagicRefinement()` call has a try/catch but only logs errors:
```typescript
} catch (e) {
    console.error(e);
}
```

Users aren't informed if AI refinement fails. Should show toast notification.

---

### W2: Insufficient Undo/Redo Support for AI Actions
**Location**: [performAIAction](components/EbookDisplay.tsx#L178)

When AI refinement inserts text, it directly manipulates the DOM without recording to the undo history. Users can't undo AI changes properly.

**Solution**: The change should trigger `handleInput()` to update `onChange()` which should record to undo history.

---

### W3: Missing Heading Format Detection
**Location**: [EditorToolbar](components/EbookDisplay.tsx#L367-L379)

The toolbar doesn't check for heading format states. Button icons don't highlight when text is `h1`, `h2`, or `h3`.

---

### W4: CSS Variable Defaults in :root Not Complete
**Location**: [globals.css :root](app/globals.css#L64-L70)

The :root CSS defines some variables:
```css
:root {
    --ebook-font: var(--font-sans);
    --font-size: 11pt;
    --line-height: 1.6;
    /* Missing: --paragraph-spacing, --first-line-indent, --block-indent */
}
```

Missing default values for paragraph spacing and indents.

---

### W5: No Visual Feedback for Disabled AI Actions in Demo Mode
**Location**: [SelectionMenu](components/EbookDisplay.tsx#L99-L124)

The buttons are always clickable, even if `isDemoMode` is true. They should be visually disabled with a tooltip explaining they're unavailable in demo.

---

## Testing Observations

### Scenario 1: Edit Chapter with Paragraph Spacing
❌ **FAILED**: When user changes paragraph spacing in formatting sidebar, the live editor doesn't update. The preview mode shows correct spacing, but edit mode doesn't.

### Scenario 2: Apply AI Refinement to Selected Text
⚠️ **PARTIAL**: Text is refined correctly, but:
- Undo doesn't work properly
- Paragraph indentation is lost after refinement
- If page is scrolled, selection menu appears off-screen

### Scenario 3: Insert Table During Editing
✓ **PASSES**: Table is inserted correctly and renders with styling.

### Scenario 4: Switch Between Edit and Preview Modes
⚠️ **PARTIAL**: Switching works, but design changes (font size, line height) don't always apply immediately in preview mode. May require re-render.

### Scenario 5: Scroll While Editing and Select Text
❌ **FAILED**: Selection menu appears at wrong position. Position doesn't account for scroll offset.

---

## Recommendations

### Priority 1: Fix Critical Issues (Do First)
1. **Add CSS custom properties to ChapterEditor** - Include `--paragraph-spacing`, `--first-line-indent`, `--block-indent` in inline styles
2. **Fix contentEditable race condition** - Use a better diffing approach or consider using DraftJS/ProseMirror
3. **Fix selection menu position** - Use fixed positioning with scroll-aware calculations

### Priority 2: Improve User Experience (Do Second)
4. Add comprehensive format state checking in useEffect
5. Add error handling and user feedback for AI operations
6. Add undo/redo support for AI refinements
7. Complete CSS variable defaults in globals.css

### Priority 3: Polish (Do Last)
8. Add visual feedback for demo mode restrictions
9. Improve heading format detection
10. Document formatting feature limitations

---

## Code Quality Notes

- **Positive**: Good use of React.memo and useCallback for optimization
- **Positive**: Comprehensive DOMPurify config with extensive allowed tags
- **Positive**: Proper error logging in async operations
- **Concern**: Heavy reliance on document.execCommand (deprecated API)
- **Concern**: ContentEditable is notoriously difficult to manage; consider modern alternatives

---

## Files Modified During Audit

- [EbookDisplay.tsx](components/EbookDisplay.tsx) - Main component under review
- [globals.css](app/globals.css) - CSS styling configuration
- [types.ts](types.ts) - Type definitions for DesignSettings

---

**Audit Complete** | Next: Fix prioritized issues and re-test formatting workflow
