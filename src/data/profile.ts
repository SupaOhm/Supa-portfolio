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

/**
 * Contact identity rendered in more than one place.
 *
 * Before this block, `GITHUB_USERNAME` was declared separately in About.tsx
 * and Connect.tsx, the email appeared verbatim in About, Connect and Footer,
 * and the GitHub profile URL was hardcoded a fourth time in Navbar. That is
 * the same shape as the year/GPA drift above — five copies of one fact, with
 * nothing forcing them to agree. `scripts/profile-drift.test.ts` fails the
 * build if a component hardcodes any of these again.
 *
 * `index.html`'s JSON-LD `sameAs` array cannot import this module, so
 * `scripts/discoverability.test.ts` compares it against these constants.
 */
export const FULL_NAME = 'Supakorn Prayongyam';
export const EMAIL = 'ohm.supakornth@gmail.com';
export const EMAIL_HREF = `mailto:${EMAIL}`;
/** Non-breaking spaces so the number never wraps mid-digit-group. */
export const PHONE_DISPLAY = '(+66)\u00A089\u00A0577\u00A02122';
export const PHONE_HREF = 'tel:+66895772122';
export const GITHUB_USERNAME = 'SupaOhm';
export const GITHUB_PROFILE_URL = `https://github.com/${GITHUB_USERNAME}`;
export const GITHUB_AVATAR_URL = `${GITHUB_PROFILE_URL}.png`;
export const LINKEDIN_HANDLE = '/in/supakornpra';
export const LINKEDIN_URL = `https://linkedin.com${LINKEDIN_HANDLE}`;
