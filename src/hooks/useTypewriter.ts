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
