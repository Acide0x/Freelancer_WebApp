// src/hooks/use-in-view.jsx
import { useState, useEffect, useCallback } from 'react';

export function useInView(elementRef, options = {}) {
  const [isInView, setIsInView] = useState(false);

  const defaultOptions = {
    threshold: 0,
    rootMargin: '0px',
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const updateIsInView = useCallback(([entry]) => {
    setIsInView(entry.isIntersecting);
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(updateIsInView, mergedOptions);
    observer.observe(elementRef.current);

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [elementRef, mergedOptions, updateIsInView]);

  return isInView;
}