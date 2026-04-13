import { BookCover } from '@/components/BookCarousel';

/**
 * Sample book covers for the landing page carousel
 * Images should be placed in /public/covers/ directory
 * 
 * To add your own covers:
 * 1. Place image files in /public/covers/
 * 2. Update the imageUrl path below (e.g., '/covers/your-image.jpg')
 * 3. Supported formats: .jpg, .png, .webp
 */
export const sampleBooks: BookCover[] = [
  {
    id: '1',
    title: 'Ecom Launchpad: Shopify Success in 3 Stages',
    author: 'James Adam',
    imageUrl: '/covers/Ecom Launchpad.jpg',
    description: 'Your Practical Blueprint to Starting a Profitable Online Store from Scratch'
  },
  {
    id: '2',
    title: 'The Astronauts Ascent',
    author: 'Milly Fritz',
    imageUrl: '/covers/Astronaut Ascent.jpg',
    description: 'A Definitive 3-Chapter Guide to Becoming a NASA Astronaut'
  },
  {
    id: '3',
    title: 'The Aussie Investors First Flight',
    author: 'Prince Ali',
    imageUrl: '/covers/Aussie Investor.jpg',
    description: 'A 3-Chapter Guide to Purchasing Your First Investment Property in Australia'
  },
  {
    id: '4',
    title: 'Reel Resonance',
    author: 'John Lim',
    imageUrl: '/covers/Reel Resonance.jpg',
    description: 'Mastering Facebook Reels for Explosive Engagement and Audience Growth'
  },
  {
    id: '5',
    title: 'The Lifestyle Architect: Building Your Sustainable Weight Loss Blueprint',
    author: 'Mary Mishra',
    imageUrl: '/covers/The Lifestyle Architect.jpg',
    description: 'Transform Your Relationship with Food, Body, and Mind for Lasting Results'
  },
  {
    id: '6',
    title: 'The Aussie Property Launchpad',
    author: 'Alec Sy',
    imageUrl: '/covers/The_Aussie_Property_Launchpad_Cover.jpg',
    description: 'Your Three-Chapter Guide to Securing Your First Investment Property Down Under'
  }
];
