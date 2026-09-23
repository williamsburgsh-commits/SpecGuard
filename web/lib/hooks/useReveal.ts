"use client";

import { useEffect, useRef, useState } from "react";

interface UseRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export function useReveal(options: UseRevealOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
    triggerOnce = true,
    delay = 0,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setIsVisible(true), delay);
          } else {
            setIsVisible(true);
          }
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, delay]);

  return { ref, isVisible };
}

export function useStaggerReveal(count: number, baseDelay = 100, options: UseRevealOptions = {}) {
  const refs = useRef<(HTMLElement | null)[]>(new Array(count).fill(null));
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const elements = refs.current.filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = refs.current.indexOf(entry.target as HTMLElement);
            if (index >= 0) {
              setTimeout(() => {
                setVisibleIndices((prev) => new Set([...prev, index]));
              }, index * baseDelay + (options.delay ?? 0));
            }
            if (options.triggerOnce !== false) {
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: options.threshold ?? 0.1, rootMargin: options.rootMargin ?? "0px 0px -50px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [baseDelay, options.delay, options.threshold, options.rootMargin, options.triggerOnce]);

  const setRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  };

  return { setRef, visibleIndices };
}