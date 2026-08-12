import { useEffect, useRef, useState, type RefObject } from 'react';

export function useReveal<T extends Element = HTMLElement>(
  threshold = 0.1
): { ref: RefObject<T | null>; isVisible: boolean } {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          // Reveal-once: stop observing after the first intersection.
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
