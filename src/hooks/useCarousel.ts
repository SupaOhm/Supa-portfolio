import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

// Returns the carousel slot [-2, 2] for a given index relative to current, or null if out of range
export function getCarouselPosition(index: number, current: number, total: number): number | null {
  const raw = ((index - current) % total + total) % total;
  const pos = raw > total / 2 ? raw - total : raw;
  return Math.abs(pos) <= 2 ? pos : null;
}

export interface UseCarousel {
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  slotOf: (index: number) => number | null;
  cardHeight: number;
  centerCardRef: RefObject<HTMLDivElement | null>;
}

export default function useCarousel(itemCount: number): UseCarousel {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardHeight, setCardHeight] = useState(600);
  const centerCardRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => setCurrentIndex(0), []);

  const next = useCallback(() => {
    if (itemCount <= 1) return;
    setCurrentIndex((prev) => (prev + 1 + itemCount) % itemCount);
  }, [itemCount]);

  const prev = useCallback(() => {
    if (itemCount <= 1) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + itemCount) % itemCount);
  }, [itemCount]);

  const slotOf = useCallback(
    (index: number) => getCarouselPosition(index, currentIndex, itemCount),
    [currentIndex, itemCount],
  );

  // Track center card height so the carousel wrapper doesn't collapse
  useEffect(() => {
    if (centerCardRef.current) setCardHeight(centerCardRef.current.offsetHeight);
  }, [currentIndex, itemCount]);

  return { currentIndex, setCurrentIndex, next, prev, reset, slotOf, cardHeight, centerCardRef };
}
