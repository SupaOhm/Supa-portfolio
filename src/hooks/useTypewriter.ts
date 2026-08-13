import { useEffect, useRef, useState } from 'react';

export type TypewriterPhase = 'typing' | 'deleting';

export type TypewriterState = {
  wordIndex: number;
  text: string;
  phase: TypewriterPhase;
};

export type TypewriterSpeeds = {
  typingMs: number;
  deletingMs: number;
  pauseMs: number;
};

export const DEFAULT_TYPEWRITER_SPEEDS: TypewriterSpeeds = {
  typingMs: 80,
  deletingMs: 50,
  pauseMs: 2000,
};

export const INITIAL_TYPEWRITER_STATE: TypewriterState = {
  wordIndex: 0,
  text: '',
  phase: 'typing',
};

/**
 * Pure transition for the hero typewriter. Returns the next state and how long
 * to wait before applying it.
 *
 * There is deliberately no 'pausing' phase: the pause between finishing a word
 * and starting to delete it is expressed as a longer delay on the
 * typing -> deleting transition, which keeps this at two phases.
 */
export function nextTypewriterState(
  state: TypewriterState,
  words: readonly string[],
  speeds: TypewriterSpeeds = DEFAULT_TYPEWRITER_SPEEDS,
): { state: TypewriterState; delayMs: number } {
  if (words.length === 0) {
    return { state, delayMs: 0 };
  }

  const word = words[state.wordIndex] ?? '';

  if (state.phase === 'typing') {
    if (state.text === word) {
      return { state: { ...state, phase: 'deleting' }, delayMs: speeds.pauseMs };
    }
    return {
      state: { ...state, text: word.slice(0, state.text.length + 1) },
      delayMs: speeds.typingMs,
    };
  }

  if (state.text === '') {
    return {
      state: {
        wordIndex: (state.wordIndex + 1) % words.length,
        text: '',
        phase: 'typing',
      },
      delayMs: 0,
    };
  }

  return {
    state: { ...state, text: word.slice(0, state.text.length - 1) },
    delayMs: speeds.deletingMs,
  };
}

/**
 * Drives `nextTypewriterState` on a timer and returns the text to display.
 *
 * Every state update happens inside a setTimeout callback, never synchronously
 * in the effect body, which is what keeps react-hooks/set-state-in-effect
 * satisfied by construction.
 *
 * `speeds` is destructured to primitives before the dependency array so a
 * caller passing an object literal does not re-subscribe the effect on every
 * render. `words` is held in a ref and kept in sync via its own effect, so it
 * does not need to be a stable reference - a caller may pass an inline array
 * literal without clearing and rescheduling the timeout on every render.
 */
export function useTypewriter(
  words: readonly string[],
  speeds: TypewriterSpeeds = DEFAULT_TYPEWRITER_SPEEDS,
): string {
  const [state, setState] = useState<TypewriterState>(INITIAL_TYPEWRITER_STATE);
  const { typingMs, deletingMs, pauseMs } = speeds;

  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    if (wordsRef.current.length === 0) {
      return;
    }

    const { state: next, delayMs } = nextTypewriterState(state, wordsRef.current, {
      typingMs,
      deletingMs,
      pauseMs,
    });

    const timeout = setTimeout(() => setState(next), delayMs);
    return () => clearTimeout(timeout);
  }, [state, typingMs, deletingMs, pauseMs]);

  return state.text;
}
