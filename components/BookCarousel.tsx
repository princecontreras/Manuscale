'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface BookCover {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  description?: string;
}

interface BookCarouselProps {
  books: BookCover[];
  autoRotate?: boolean;
  autoRotateInterval?: number;
  className?: string;
}

export const BookCarousel: React.FC<BookCarouselProps> = ({
  books,
  autoRotate = true,
  autoRotateInterval = 5000,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);

  // Auto-rotate functionality
  useEffect(() => {
    if (!isAutoRotating || books.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === books.length - 1 ? 0 : prev + 1));
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [isAutoRotating, books.length, autoRotateInterval]);

  const handlePrevious = () => {
    setIsAutoRotating(false);
    setCurrentIndex((prev) => (prev === 0 ? books.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsAutoRotating(false);
    setCurrentIndex((prev) => (prev === books.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number) => {
    setIsAutoRotating(false);
    setCurrentIndex(index);
  };

  if (books.length === 0) {
    return <div className="text-center text-slate-500">No books available</div>;
  }

  const currentBook = books[currentIndex];

  return (
    <div className={`w-full ${className}`}>
      {/* Main Carousel Display */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-slate-100 shadow-lg">
          {/* Carousel Container */}
          <div className="relative w-full flex justify-center items-center bg-gradient-to-b from-slate-100 to-slate-50" style={{ aspectRatio: '3 / 4' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="relative w-full h-full flex justify-center items-center"
              >
                <Image
                  src={currentBook.imageUrl}
                  alt={`${currentBook.title} book cover by ${currentBook.author}`}
                fill
                className="object-contain"
                priority={currentIndex === 0}
                quality={85}
              />
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrevious}
            aria-label="Previous book"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/80 hover:bg-white transition-all duration-200 hover:shadow-lg active:scale-95"
          >
            <ChevronLeft size={24} className="text-slate-900" />
          </button>

          <button
            onClick={handleNext}
            aria-label="Next book"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/80 hover:bg-white transition-all duration-200 hover:shadow-lg active:scale-95"
          >
            <ChevronRight size={24} className="text-slate-900" />
          </button>

          {/* Book Info Overlay */}
          <motion.div
            key={`${currentIndex}-info`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white"
          >
            <h3 className="font-heading text-xl sm:text-2xl font-bold mb-1 line-clamp-2">
              {currentBook.title}
            </h3>
            <p className="text-sm sm:text-base font-medium text-white/90 mb-2">
              by {currentBook.author}
            </p>
            {currentBook.description && (
              <p className="text-xs sm:text-sm text-white/75 line-clamp-2">
                {currentBook.description}
              </p>
            )}
          </motion.div>
        </div>
      </div>
      </div>

      {/* Carousel Info and Navigation */}
      <div className="mt-6 space-y-4 max-w-lg mx-auto">
        {/* Counter and Resume Auto-rotate Button */}
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-medium text-slate-600">
            {currentIndex + 1} / {books.length}
          </span>
          {!isAutoRotating && (
            <button
              onClick={() => setIsAutoRotating(true)}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Resume Auto-play
            </button>
          )}
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-2">
          {books.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to book ${index + 1}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: index === currentIndex ? 1 : 0.8 }}
              whileHover={{ scale: 1 }}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-primary-600 w-8 h-2'
                  : 'bg-slate-300 w-2 h-2 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Schema Markup for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ImageGallery',
          'name': 'Sample Book Covers',
          'associatedMedia': books.map((book) => ({
            '@type': 'ImageObject',
            'url': book.imageUrl,
            'name': book.title,
            'author': {
              '@type': 'Person',
              'name': book.author
            }
          }))
        })}
      </script>
    </div>
  );
};
