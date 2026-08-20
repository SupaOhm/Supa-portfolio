// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { act } from 'react';
import { useReveal } from './useReveal';
import { createIntersectionObserver } from '../test/doubles';

let restore: (() => void) | undefined;

afterEach(() => {
  cleanup();
  restore?.();
  restore = undefined;
});

/** Renders the hook with its ref attached to a real element in the document. */
function renderReveal(threshold?: number) {
  const element = document.createElement('div');
  document.body.appendChild(element);

  const rendered = renderHook(() => {
    const reveal = threshold === undefined ? useReveal<HTMLDivElement>() : useReveal<HTMLDivElement>(threshold);
    // Attach synchronously during render so the effect sees a live ref.
    reveal.ref.current = element as HTMLDivElement;
    return reveal;
  });

  return { ...rendered, element };
}

describe('useReveal', () => {
  it('starts hidden', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { result } = renderReveal();

    expect(result.current.isVisible).toBe(false);
  });

  it('becomes visible when the element intersects', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { result, element } = renderReveal();

    act(() => {
      observer.trigger([{ isIntersecting: true, target: element }]);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('reveals once and stays revealed', () => {
    // The hook disconnects after the first intersection on purpose. If it kept
    // observing, scrolling a revealed section back out of view would hide it
    // again — content flickering on scroll-back. That is invisible in code
    // review and obvious to a visitor.
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { result, element } = renderReveal();

    act(() => {
      observer.trigger([{ isIntersecting: true, target: element }]);
    });
    expect(observer.disconnectCount()).toBe(1);

    act(() => {
      observer.trigger([{ isIntersecting: false, target: element }]);
    });
    expect(result.current.isVisible).toBe(true);
  });

  it('passes its threshold through to the observer', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    renderReveal(0.75);

    expect(observer.lastOptions()?.threshold).toBe(0.75);
  });

  it('disconnects on unmount even if it never intersected', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { unmount } = renderReveal();
    expect(observer.disconnectCount()).toBe(0);

    unmount();

    expect(observer.disconnectCount()).toBe(1);
  });
});
