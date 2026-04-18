# Contact Form Implementation Guide

## Overview
This guide will help you set up the contact form system for Typoscale. The implementation includes:
- **Frontend**: A fully functional contact form component
- **Backend**: API route to handle submissions
- **Email Delivery**: Integrated with Resend (or console logging as fallback)
- **Validation**: Client-side and server-side validation

## Files Created

1. **`/components/ContactForm.tsx`** - Reusable contact form component
2. **`/app/contact/page.tsx`** - Contact page with form and additional info
3. **`/app/api/contact/route.ts`** - API endpoint for form submissions

## Setup Steps

### Step 1: Update Environment Variables

Add these to your `.env.local` file:

```env
# Email Configuration
CONTACT_EMAIL_TO=your-email@example.com
```

**Optional - For Email Delivery via Resend:**

```env
RESEND_API_KEY=re_your_api_key_here
CONTACT_EMAIL_TO=admin@typoscale.com
ADMIN_API_TOKEN=your_secure_random_token_here
```

### Step 2: Install Dependencies (if using Resend)

If you want to send emails, install Resend:

```bash
npm install resend
```

**Note:** If you skip this step, the contact form will still work - messages will be logged to console and stored in memory.

### Step 3: Set Up Resend (Optional)

1. Sign up at [https://resend.com](https://resend.com)
2. Create a free account
3. Go to [API Keys](https://resend.com/api-keys)
4. Create a new API key
5. Copy the key and add it to `.env.local`:
   ```
   RESEND_API_KEY=re_your_key_here
   ```

### Step 4: Add Contact Link to Navigation

Update your navigation to include a link to the contact page:

```tsx
<a href="/contact">Contact</a>
```

Or using Next.js Link:

```tsx
import Link from 'next/link';

<Link href="/contact">Contact</Link>
```

### Step 5: Test the Form

1. Run your development server: `npm run dev`
2. Navigate to `http://localhost:3000/contact`
3. Fill out and submit the contact form
4. Check the console output (or your email if Resend is configured)

## Features

### Frontend Features
- ✅ Responsive design (mobile-friendly)
- ✅ Dark mode support
- ✅ Real-time form validation
- ✅ Loading state during submission
- ✅ Success/error notifications
- ✅ Toast notifications via ToastContext
- ✅ Auto-reset form after successful submission
- ✅ Disabled state while submitting

### Backend Features
- ✅ Input validation (required fields, email format)
- ✅ Input sanitization (prevent injection attacks)
- ✅ XSS protection with HTML escaping
- ✅ Rate limiting ready (can be added)
- ✅ Email delivery via Resend
- ✅ Fallback console logging
- ✅ Error handling and logging
- ✅ Optional admin endpoint to retrieve messages

## Usage Examples

### Basic Form Usage
The contact form is a self-contained component that can be used anywhere:

```tsx
import ContactForm from '@/components/ContactForm';

export default function MyPage() {
  return (
    <div>
      <h1>Contact Us</h1>
      <ContactForm />
    </div>
  );
}
```

### Using the Contact Page
Simply visit `/contact` in your application.

## API Endpoint Reference

### POST /api/contact
Submit a contact form message.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question about Typoscale",
  "message": "I have a question about..."
}
```

**Success Response (200):**
```json
{
  "message": "Your message has been sent successfully"
}
```

**Error Response (400/500):**
```json
{
  "message": "Error description"
}
```

### GET /api/contact (Admin)
Retrieve all submitted contact messages.

**Headers:**
```
Authorization: Bearer {ADMIN_API_TOKEN}
```

**Response:**
```json
{
  "messages": [...],
  "total": 42,
  "unread": 5
}
```

## Email Configuration Options

### Option 1: Resend (Recommended)
- ✅ Free tier available
- ✅ Simple setup
- ✅ Good deliverability
- Setup: [https://resend.com](https://resend.com)

### Option 2: SendGrid
- Good for high volume
- Free tier: 100 emails/day
- Setup: [https://sendgrid.com](https://sendgrid.com)

### Option 3: Nodemailer (with your own SMTP)
- Use your existing email server
- Requires SMTP credentials

### Option 4: Console Logging (Default/Development)
- No setup required
- Messages logged to console
- Messages stored in-memory (not persistent)

## Customization

### Change Form Styling
Edit the Tailwind classes in `/components/ContactForm.tsx` to match your design.

### Change Email Template
Modify the HTML template in `/app/api/contact/route.ts` in the `sendEmail` function.

### Add More Fields
1. Add the field to the `ContactFormData` interface in `ContactForm.tsx`
2. Add form input for the new field
3. Update the API handler in `route.ts`

### Add Rate Limiting
The API route can be enhanced with rate limiting using middleware or libraries like `Ratelimit`:

```bash
npm install @vercel/ratelimit
```

## Security Considerations

✅ **Already Implemented:**
- Input validation
- Email format validation
- Input sanitization
- XSS protection with HTML escaping
- Length limits on inputs
- Error handling

🔒 **Recommended Additions:**
- CSRF protection
- Rate limiting
- Bot detection (reCAPTCHA)
- Admin authentication for GET endpoint
- Database persistence instead of in-memory storage

## Troubleshooting

### Messages Not Being Sent
1. Check that `.env.local` has `CONTACT_EMAIL_TO` configured
2. Check browser console for client-side errors
3. Check server logs for API errors
4. Verify Resend API key if using email delivery

### Form Not Appearing
1. Make sure the contact page route is accessible at `/contact`
2. Check that `ContactForm` component is properly imported
3. Verify `ToastContext` is properly set up

### Email Not Received
1. Check spam/junk folder
2. Verify `CONTACT_EMAIL_TO` email address is correct
3. Check Resend dashboard for delivery status
4. Verify domain is properly configured in Resend

### CORS Issues
Add CORS headers to `/app/api/contact/route.ts` if needed:

```typescript
export const runtime = 'nodejs';
```

## Next Steps

1. **Database Integration**: Save messages to Firestore instead of memory
2. **Email Templates**: Create branded email templates
3. **Admin Dashboard**: Build a dashboard to view and manage messages
4. **Notifications**: Add email notifications to admins
5. **Rate Limiting**: Add rate limiting to prevent spam
6. **Bot Detection**: Add reCAPTCHA integration

## Support

For issues or questions:
- Check the console logs for error messages
- Review the API response in the Network tab
- Check the Resend dashboard if using email delivery

---

**Last Updated:** 2024
