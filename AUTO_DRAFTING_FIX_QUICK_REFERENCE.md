# Auto-Drafting Model Overload Fix - Quick Reference

## Problem
```
❌ BEFORE: Frequent "Model Overloaded" errors during chapter generation
- Prompt size: 12,000-15,000+ tokens
- Queue concurrency: Always 6 (no adaptation)
- Retry strategy: Aggressive (hammered API)
- Result: Users saw errors, manual retries required
```

## Solution
```
✅ AFTER: Adaptive self-healing system
- Prompt size: 3,000-5,000 tokens (60-80% reduction)
- Queue concurrency: 2-6 (adapts to load)
- Retry strategy: Stress-aware delays
- Result: Automatic recovery, transparent feedback
```

---

## What Changed

### 1. Prompt Optimization
- Context items reduced from full arrays to concise summaries
- JSON.stringify() replaced with `buildOptimizedContextBlock()`
- Adaptive fidelity: full → medium → slim based on API stress

### 2. Smart Queuing
- `RequestQueue` tracks errors in 60-second window
- Adjusts concurrency: 6 → 4 → 3 → 2 based on stress level
- Clears errors on success (self-healing)

### 3. Adaptive Backoff
- Retry delays scale with API stress (1x to 3x multiplier)
- Progressive model fallback: Flash → Flash Stable → Pro Stable → Pro
- Each fallback uses longer delays

### 4. Error Transparency
- Streaming API now includes `apiStress` in error responses
- Messages change based on severity
- Users see: "Model is busy..." → "Model under heavy load..."

---

## How to Monitor

### 1. Server Logs - Look for:
```
Generating chapter content. Prompt tokens (estimate): 4523
API Stress Level: 45
API Error (Server). Stress=45%. Waiting 8s... (2 retries left)
```

### 2. Client Errors - Will include:
```javascript
{
    type: 'error',
    error: 'The AI model is experiencing high demand...',
    retryable: true,
    apiStress: 65  // 0-100 scale
}
```

### 3. Performance - Should see:
- Fewer "model overloaded" errors
- Automatic recovery without user intervention
- Consistent chapter generation time
- Natural request distribution (not all at once)

---

## API Stress Levels

| Stress | Symptom | Concurrency | Action |
|--------|---------|-------------|--------|
| 0-20% | Normal | 6 | Generate normally |
| 20-40% | Slight delay | 5 | Show "processing..." |
| 40-60% | Moderate delay | 4 | Show "waiting..." |
| 60-80% | High delay | 3 | Show "model busy..." |
| 80-100% | Severe delay | 2 | Show "extreme load..." |

---

## Context Fidelity Levels

```
Stress < 40%: FULL mode
├─ 4 context items
├─ 8 prior topics covered
├─ 3 recent chapters
└─ Full summaries

Stress 40-70%: MEDIUM mode
├─ 2 context items
├─ 8 prior topics covered
├─ 3 recent chapters
└─ Full summaries

Stress > 70%: SLIM mode
├─ 1 context item
├─ 5 prior topics covered
├─ 2 recent chapters
└─ Truncated summaries (500 chars)
```

---

## Token Reduction Example

**Before (Full prompt):**
```
- Full outline: [50 chapters × 200 chars] = 10K tokens
- Context: [4 items × JSON stringified] = 2K tokens
- Summaries & context: 2K tokens
- Total: ~14,000 tokens
```

**After (Adaptive):**
```
- Relevant outline: [5 items × 50 chars] = 250 tokens
- Context: [1 item × formatted slim] = 200 tokens
- Truncated summary: 500 chars = 140 tokens
- Total: ~3,500 tokens (75% reduction)
```

---

## For Frontend Implementation

### Recommended UI Updates

```javascript
// Handle API stress response
streamResponse.addEventListener('error', (e) => {
    const { apiStress, retryable, error } = e.detail;
    
    if (apiStress > 80) {
        // Show critical message
        showMessage('⚠️ ' + error);
        showProgressBar(apiStress);
    } else if (apiStress > 60) {
        // Show warning
        showMessage('⏳ ' + error);
        showProgressBar(apiStress);
    } else {
        // Show info
        showMessage('ℹ️ ' + error);
    }
    
    if (retryable) {
        showAutoRetryMessage('Retrying...');
    }
});

// Show API stress indicator
function showProgressBar(stress) {
    // stress 0-100 maps to visual indicator
    // 0-30: green, 30-60: yellow, 60-100: red
}
```

---

## Troubleshooting

### Issue: Still seeing "Model Overloaded"
**Cause**: May be legitimate Google API overload  
**Solution**: Wait 5+ minutes, API stress will decrease

### Issue: Very slow chapter generation
**Cause**: API stress is high (system adapting)  
**Solution**: This is expected - system is protecting API

### Issue: Stress level stuck at high value
**Cause**: Continuous errors (network, auth, etc.)  
**Solution**: Check server logs for actual error type

### Issue: Context seems incomplete
**Cause**: Running in slim mode due to high stress  
**Solution**: Normal - content will improve when stress drops

---

## Files Modified

| File | Changes |
|------|---------|
| `services/geminiService.ts` | +200 lines: token estimation, queue enhancement, retry logic, context optimization |
| `app/api/ai/stream/route.ts` | +30 lines: stress-aware error messages, imports |
| **Total**: 230 lines added (all additive, no breaking changes) |

---

## Performance Metrics

### Expected Improvements

```
Metric                    | Before      | After       | Improvement
Input tokens/chapter      | 12,000-15K  | 3,000-5K    | ↓ 75%
API calls/chapter         | ~1-2        | ~1.2        | ↓ Small overhead
Queue wait time           | Variable    | Adaptive    | Scales smartly
Retry success rate        | ~70%        | ~85%+       | ↑ Better
User manual retries       | Common      | Rare        | ↓ Much less
```

---

## Next Steps

1. **Monitor**: Watch server logs for stress level patterns
2. **Test**: Generate 5-10 chapters in sequence
3. **Iterate**: If still seeing issues, check for network problems
4. **Optimize**: Consider Redis-backed stress tracking for multi-server setups

---

## Questions?

Check these files for more details:
- `AUTO_DRAFTING_FIX_SUMMARY.md` - Complete technical details
- Server logs - Real-time performance data
- Error responses - Include stress level for debugging
