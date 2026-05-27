import { MarketingAssets } from '../types';

/**
 * Pre-generated marketing assets for demo mode.
 * These are displayed in the PublishWizard without any AI cost.
 */

const MOCK_MARKETING_BY_GENRE: Record<string, MarketingAssets> = {
  'Self-Help': {
    blurb:
      'Unlock the mindset shifts that separate high achievers from everyone else. This practical guide distills decades of behavioral science into actionable frameworks you can apply today. Whether you\'re building a career, launching a business, or simply seeking clarity—this book is your roadmap to unstoppable momentum.',
    socialPosts: [
      { platform: 'Twitter/X', content: '🚀 What if your biggest obstacle wasn\'t skill—but mindset? This book changed how I approach every challenge. A must-read for anyone serious about growth. #PersonalDevelopment #SelfHelp' },
      { platform: 'LinkedIn', content: 'Just finished reading a book that reframes productivity entirely. It\'s not about working harder—it\'s about thinking differently. If you\'re in a leadership role, this belongs on your desk.' },
      { platform: 'Instagram', content: '📖 New read alert! This one hit different. Practical, no-fluff strategies for building the life you actually want. Swipe for my top 3 takeaways →' },
    ],
    emailAnnouncement: 'Subject: The book that changes everything\n\nHi [Name],\n\nI\'m thrilled to announce my new book is now available! Inside you\'ll find practical frameworks for building unstoppable momentum in your career, relationships, and personal growth.\n\nGrab your copy today and start transforming your approach to life\'s biggest challenges.',
    keywords: ['self-help', 'personal development', 'mindset', 'productivity', 'growth'],
    categories: ['Self-Help', 'Personal Development', 'Motivation'],
    priceStrategy: 'Launch at $4.99 for the first week, then raise to $9.99. Bundle with audiobook at $14.99.',
  },
  'Business': {
    blurb:
      'The playbook for building a business that thrives in uncertainty. Drawing from real case studies and battle-tested strategies, this guide shows entrepreneurs and executives how to make smarter decisions, build resilient teams, and scale with confidence.',
    socialPosts: [
      { platform: 'Twitter/X', content: '📊 Most business books give you theory. This one gives you a playbook. Real case studies. Actionable frameworks. No fluff. #Entrepreneurship #BusinessStrategy' },
      { platform: 'LinkedIn', content: 'After interviewing 50+ founders, one pattern emerged: the best operators don\'t just react—they anticipate. My new book breaks down exactly how they do it.' },
    ],
    emailAnnouncement: 'Subject: Your competitive edge starts here\n\nThe strategies inside this book have helped companies 10x their growth. Now it\'s your turn.',
    keywords: ['business', 'entrepreneurship', 'strategy', 'leadership', 'scaling'],
    categories: ['Business', 'Entrepreneurship', 'Management'],
    priceStrategy: 'Launch at $9.99. Hardcover at $24.99. Corporate bulk pricing available.',
  },
};

// Default fallback
const DEFAULT_MOCK_MARKETING: MarketingAssets = {
  blurb:
    'A compelling and insightful book that offers readers a fresh perspective on a topic that matters. Packed with research, real-world examples, and practical takeaways, this is the definitive guide for anyone ready to go deeper.',
  socialPosts: [
    { platform: 'Twitter/X', content: '📖 Excited to share my new book with the world! Months of research distilled into actionable insights. Check it out! #NewBook #MustRead' },
    { platform: 'LinkedIn', content: 'Proud to announce the release of my latest book. If you\'re passionate about growth and learning, I think you\'ll find real value here.' },
    { platform: 'Instagram', content: '🎉 It\'s here! My new book just dropped. Swipe to see what it\'s about and why I wrote it. Link in bio! 📚' },
  ],
  emailAnnouncement: 'Subject: My new book is live!\n\nI\'m thrilled to announce that my book is now available. Inside, you\'ll find insights and strategies that I\'ve spent months researching and refining.\n\nI hope it brings you as much value as it brought me to write it.',
  keywords: ['book', 'guide', 'insights', 'learning'],
  categories: ['General Non-Fiction'],
  priceStrategy: 'Launch at $4.99 ebook, $14.99 paperback. Consider running a free promotion the first 3 days on KDP Select.',
};

export function getMockMarketingAssets(genre?: string): MarketingAssets {
  if (genre && MOCK_MARKETING_BY_GENRE[genre]) {
    return MOCK_MARKETING_BY_GENRE[genre];
  }
  // Try partial match
  if (genre) {
    const lowerGenre = genre.toLowerCase();
    for (const [key, value] of Object.entries(MOCK_MARKETING_BY_GENRE)) {
      if (lowerGenre.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerGenre)) {
        return value;
      }
    }
  }
  return DEFAULT_MOCK_MARKETING;
}
