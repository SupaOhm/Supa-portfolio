/**
 * Academic facts rendered in more than one place.
 *
 * Hero and About both state the year and GPA, in different formats. They were
 * hardcoded separately and drifted: About was corrected to 4th Year / 3.24
 * while Hero kept showing 3rd Year / 3.23 on the landing screen, which is the
 * first thing a visitor reads. Anything stated in both components belongs
 * here, and `scripts/profile-drift.test.ts` fails the build if a component
 * hardcodes one of these values again.
 */
export const ACADEMIC_YEAR = '4th Year';
export const GPA = '3.24';
export const EXPECTED_GRADUATION = 'June 2027';
export const PROGRAM = 'Computer Engineering';
export const INSTITUTION = 'SIIT, Thammasat';
export const LOCATION = 'Pathum Thani, Thailand';
