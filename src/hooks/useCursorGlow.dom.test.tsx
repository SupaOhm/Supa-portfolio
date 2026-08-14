// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useCursorGlow } from './useCursorGlow';

// @testing-library/react only auto-registers cleanup when vitest's
// `test.globals` is on, which this project does not enable. Clean up explicitly.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function GlowHost() {
  const handleMouseMove = useCursorGlow();
  return <div data-testid="host" onMouseMove={handleMouseMove} />;
}

function TwoGlowHosts() {
  const handleMouseMove = useCursorGlow();
  return (
    <>
      <div data-testid="host-a" onMouseMove={handleMouseMove} />
      <div data-testid="host-b" onMouseMove={handleMouseMove} />
    </>
  );
}

/** Replaces window.matchMedia so usePrefersReducedMotion sees `reduce`. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/** Captures rAF callbacks so frames can be advanced deterministically. */
function captureFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return frames;
}

describe('useCursorGlow', () => {
  // jsdom's getBoundingClientRect returns all zeros, so clientX/clientY pass
  // through the `clientX - rect.left` arithmetic unchanged.

  it('snaps to the pointer on the first move onto an element', () => {
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 100, clientY: 50 });

    expect(host.style.getPropertyValue('--glow-x')).toBe('100px');
    expect(host.style.getPropertyValue('--glow-y')).toBe('50px');
    expect(frames).toHaveLength(0);
  });

  it('eases toward the target on subsequent moves', () => {
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(host, { clientX: 100, clientY: 40 });
    expect(frames).toHaveLength(1);

    frames[0](0);

    expect(host.style.getPropertyValue('--glow-x')).toBe('15px');
    expect(host.style.getPropertyValue('--glow-y')).toBe('6px');
  });

  it('stops scheduling frames once the glow converges', () => {
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(host, { clientX: 1, clientY: 0 });

    // 0 -> 0.15 leaves a gap of 0.85; the frame after that leaves 0.7225, and so
    // on. Run frames until the loop declines to schedule another.
    let guard = 0;
    while (guard < 100 && frames.length > guard) {
      frames[guard](0);
      guard += 1;
    }

    // Gap 1 -> 0.85 -> 0.7225 -> 0.6141 -> 0.5221 -> 0.4438, which is the first
    // value under CONVERGENCE_EPSILON, so the 5th frame snaps and stops.
    expect(frames).toHaveLength(5);
    expect(host.style.getPropertyValue('--glow-x')).toBe('1px');
  });

  it('snaps and never schedules a frame under reduced motion', () => {
    stubReducedMotion(true);
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(host, { clientX: 100, clientY: 40 });

    expect(host.style.getPropertyValue('--glow-x')).toBe('100px');
    expect(host.style.getPropertyValue('--glow-y')).toBe('40px');
    expect(frames).toHaveLength(0);
  });

  it('snaps on switching elements and never leaks the new element position onto the old one', () => {
    const frames = captureFrames();
    render(<TwoGlowHosts />);
    const hostA = screen.getByTestId('host-a');
    const hostB = screen.getByTestId('host-b');

    // First move onto A: snaps.
    fireEvent.mouseMove(hostA, { clientX: 10, clientY: 10 });
    expect(hostA.style.getPropertyValue('--glow-x')).toBe('10px');
    expect(hostA.style.getPropertyValue('--glow-y')).toBe('10px');

    // Second move, still on A: schedules a frame (does not snap).
    fireEvent.mouseMove(hostA, { clientX: 100, clientY: 40 });
    expect(frames).toHaveLength(1);

    // Move onto B: element switch, must snap immediately to B's coordinates.
    fireEvent.mouseMove(hostB, { clientX: 30, clientY: 20 });
    expect(hostB.style.getPropertyValue('--glow-x')).toBe('30px');
    expect(hostB.style.getPropertyValue('--glow-y')).toBe('20px');

    // Run any pending/newly-scheduled frames. The loop must never write B's
    // target position onto A.
    let guard = 0;
    while (guard < 20 && frames.length > guard) {
      frames[guard](0);
      guard += 1;
    }

    expect(hostA.style.getPropertyValue('--glow-x')).not.toBe('30px');
    expect(hostA.style.getPropertyValue('--glow-y')).not.toBe('20px');
  });

  it('cancels a pending frame on unmount', () => {
    const frames = captureFrames();
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(host, { clientX: 100, clientY: 40 });
    expect(frames).toHaveLength(1);

    cleanup();

    expect(cancel).toHaveBeenCalledWith(1);
  });
});
