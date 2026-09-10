import { describe, expect, it } from 'vitest';
import { AWARD, VENUE } from './profile';

describe('award identity', () => {
  it('composes into the string About already rendered', () => {
    // About.tsx had 'IEEE IMC 2026 Best Paper Award' typed out as one literal.
    // This is a second, independently-authored copy of that string, so it is
    // the one assertion here that can actually fail: it bites if either
    // constant is edited without the other half of the pair being updated to
    // match, and it proves adopting the constants is not a copy change.
    //
    // Asserting each constant against its own defining literal was considered
    // and deliberately cut — that shape cannot fail.
    expect(`${VENUE} ${AWARD}`).toBe('IEEE IMC 2026 Best Paper Award');
  });
});
