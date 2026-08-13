import { describe, it, expect } from 'vitest';
import {
  nextTypewriterState,
  DEFAULT_TYPEWRITER_SPEEDS,
  type TypewriterState,
} from './useTypewriter';

const WORDS = ['ab', 'cd'] as const;

const state = (
  wordIndex: number,
  text: string,
  phase: TypewriterState['phase'],
): TypewriterState => ({ wordIndex, text, phase });

describe('nextTypewriterState', () => {
  it('types one character at a time toward the target word', () => {
    const first = nextTypewriterState(state(0, '', 'typing'), WORDS);
    expect(first.state).toEqual(state(0, 'a', 'typing'));
    expect(first.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.typingMs);

    const second = nextTypewriterState(first.state, WORDS);
    expect(second.state).toEqual(state(0, 'ab', 'typing'));
    expect(second.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.typingMs);
  });

  it('switches to deleting after a pause once the word is complete', () => {
    const result = nextTypewriterState(state(0, 'ab', 'typing'), WORDS);
    expect(result.state).toEqual(state(0, 'ab', 'deleting'));
    expect(result.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.pauseMs);
  });

  it('deletes one character at a time', () => {
    const result = nextTypewriterState(state(0, 'ab', 'deleting'), WORDS);
    expect(result.state).toEqual(state(0, 'a', 'deleting'));
    expect(result.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.deletingMs);
  });

  it('advances to the next word with no delay once the text is empty', () => {
    const result = nextTypewriterState(state(0, '', 'deleting'), WORDS);
    expect(result.state).toEqual(state(1, '', 'typing'));
    expect(result.delayMs).toBe(0);
  });

  it('wraps from the last word back to the first', () => {
    const result = nextTypewriterState(state(1, '', 'deleting'), WORDS);
    expect(result.state.wordIndex).toBe(0);
  });

  it('loops on itself for a single-word list', () => {
    const result = nextTypewriterState(state(0, '', 'deleting'), ['solo']);
    expect(result.state.wordIndex).toBe(0);
  });

  it('honours custom speeds', () => {
    const speeds = { typingMs: 5, deletingMs: 6, pauseMs: 7 };
    expect(nextTypewriterState(state(0, '', 'typing'), WORDS, speeds).delayMs).toBe(5);
    expect(nextTypewriterState(state(0, 'ab', 'deleting'), WORDS, speeds).delayMs).toBe(6);
    expect(nextTypewriterState(state(0, 'ab', 'typing'), WORDS, speeds).delayMs).toBe(7);
  });

  it('returns the state unchanged for an empty word list', () => {
    const start = state(0, '', 'typing');
    const result = nextTypewriterState(start, []);
    expect(result.state).toEqual(start);
    expect(result.delayMs).toBe(0);
  });

  it('reproduces the full two-word cycle and returns to the start', () => {
    let current = state(0, '', 'typing');
    const seen: string[] = [];

    for (let step = 0; step < 12; step += 1) {
      current = nextTypewriterState(current, WORDS).state;
      seen.push(`${current.phase}:${current.wordIndex}:${current.text}`);
    }

    expect(seen).toEqual([
      'typing:0:a',
      'typing:0:ab',
      'deleting:0:ab',
      'deleting:0:a',
      'deleting:0:',
      'typing:1:',
      'typing:1:c',
      'typing:1:cd',
      'deleting:1:cd',
      'deleting:1:c',
      'deleting:1:',
      'typing:0:',
    ]);
  });
});
