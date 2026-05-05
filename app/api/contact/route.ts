import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for contact messages (in production, use a database)
const messages: Array<{
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: Date;
  read: boolean;
}> = [];

// Rate limiting — prevent contact form spam
const contactRateLimit = new Map<string, { count: number; resetAt: number }>();
const CONTACT_MAX_PER_HOUR = 5;
const CONTACT_RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_RATE_ENTRIES = 10000;

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function checkContactRateLimit(ip: string): boolean {
  const now = Date.now();
  if (contactRateLimit.size > MAX_RATE_ENTRIES) {
    for (const [key, val] of contactRateLimit) {
      if (now > val.resetAt) contactRateLimit.delete(key);
    }
  }
  const entry = contactRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    contactRateLimit.set(ip, { count: 1, resetAt: now + CONTACT_RATE_WINDOW });
    return true;
  }
  if (entry.count >= CONTACT_MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize input to prevent injection attacks
function sanitizeInput(input: string): string {
  return input.trim().slice(0, 5000); // Limit length and trim whitespace
}

// Send email using Resend (if configured) or fallback to console logging
async function sendEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      // Fallback: Log to console and save to in-memory storage
      console.log('📧 Contact Form Submission:', {
        timestamp: new Date().toISOString(),
        ...data,
      });

      // In production, you should save this to a database
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      messages.push({
        id: messageId,
        ...data,
        timestamp: new Date(),
        read: false,
      });

      return {
        success: true,
      };
    }

    // Use Resend to send email
    // Use Resend's default domain (onboarding@resend.dev) or configure your own
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: process.env.CONTACT_EMAIL_TO || 'admin@typoscale.com',
        replyTo: data.email,
        subject: `New Contact Form: ${data.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Contact Form Submission</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
              <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
              <hr style="margin: 20px 0;" />
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(data.message)}</p>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This is an automated message from your contact form. Please reply directly to the sender's email address.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API Error:', JSON.stringify(error, null, 2));
      console.error('Request body:', {
        from: fromEmail,
        to: process.env.CONTACT_EMAIL_TO || 'admin@typoscale.com',
        replyTo: data.email,
      });
      return {
        success: false,
        error: error.message || 'Failed to send email. Please try again later.',
      };
    }

    // Also save to in-memory storage for reference
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    messages.push({
      id: messageId,
      ...data,
      timestamp: new Date(),
      read: false,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: 'An error occurred while sending your message.',
    };
  }
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export async function POST(request: NextRequest) {
  // Rate limit: max 5 submissions per IP per hour
  const ip = getClientIp(request);
  if (!checkContactRateLimit(ip)) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      subject: sanitizeInput(subject),
      message: sanitizeInput(message),
    };

    // Validate sanitized inputs
    if (
      sanitizedData.name.length < 2 ||
      sanitizedData.subject.length < 3 ||
      sanitizedData.message.length < 10
    ) {
      return NextResponse.json(
        { message: 'Please provide valid input in all fields' },
        { status: 400 }
      );
    }

    // Send email
    const emailResult = await sendEmail(sanitizedData);

    if (!emailResult.success) {
      return NextResponse.json(
        { message: emailResult.error || 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Your message has been sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve messages (for admin dashboard)
export async function GET(request: NextRequest) {
  // In production, add authentication here
  const authHeader = request.headers.get('authorization');
  const adminToken = process.env.ADMIN_API_TOKEN;

  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    messages,
    total: messages.length,
    unread: messages.filter((m) => !m.read).length,
  });
}
