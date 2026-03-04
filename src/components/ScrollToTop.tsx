"use client";

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the top coordinate to 0
  // make scrolling smooth
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={clsx(
        "fixed bottom-24 right-6 z-40 p-3 rounded-full bg-primary text-black shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
      aria-label="Scroll to top"
    >
      <ChevronUp size={24} strokeWidth={3} />
    </button>
  );
}
