# Book Covers Directory

Store your book cover images here for the carousel on the landing page.

## Setup Instructions

1. **Add your cover images** to this directory with names like:
   - `cover-1.jpg`
   - `cover-2.jpg`
   - `cover-3.jpg`
   - etc.

2. **Supported formats:**
   - `.jpg` / `.jpeg`
   - `.png`
   - `.webp` (recommended for best performance)

3. **Image specifications:**
   - **Recommended dimensions:** 800x600px or maintaining 4:3 aspect ratio
   - **File size:** Keep under 500KB for optimal loading speed
   - **Optimization:** Use WebP format for ~30% smaller file sizes

4. **Update the carousel data:**
   - Edit `data/sampleBooks.ts` to reference your images
   - The paths should match: `/covers/cover-name.jpg`

## Example

```typescript
// In data/sampleBooks.ts
{
  id: '1',
  title: 'Your Book Title',
  author: 'Author Name',
  imageUrl: '/covers/cover-1.jpg',  // Points to public/covers/cover-1.jpg
  description: 'Book description'
}
```

## Performance Tips

- **Lazy loading:** Images are automatically lazy-loaded by Next.js Image component
- **Responsive optimization:** Next.js automatically serves optimized sizes for different devices
- **WebP conversion:** Next.js automatically converts to WebP for modern browsers
- **Cache:** Images are cached in the browser for faster subsequent loads

## Next Steps

1. Add your cover images to this directory
2. Run `npm run dev` to test the carousel
3. Images will be served at `https://yourdomain.com/covers/cover-name.jpg`
