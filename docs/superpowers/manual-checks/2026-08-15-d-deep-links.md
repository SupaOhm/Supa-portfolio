# Slice D manual checks — deep links & link previews

Every box here is unticked on purpose. Nothing in this list is covered by the
test suite, and most of it **cannot** be: the rewrite only takes effect on a
real deploy.

## Deep links (deployed)

- [ ] `https://supakornohm.vercel.app/about` returns 200, not 404
- [ ] `https://supakornohm.vercel.app/projects` returns 200, not 404
- [ ] `https://supakornohm.vercel.app/connect` returns 200, not 404
- [ ] Each lands on `/` in the URL bar (the redirect used `replace`)
- [ ] Each scrolls to the right section, not the top of the page
- [ ] Pressing Back after landing returns to the previous site, NOT to /about
- [ ] Nav highlight shows the correct section after landing

Command: `for p in /about /projects /connect; do curl -s -o /dev/null -w "$p %{http_code}\n" https://supakornohm.vercel.app$p; done`

## Static assets survived the catch-all

The rewrite is the highest-risk change in this slice. Vercel's docs say the
filesystem takes precedence, but confirm it rather than trusting it.

- [ ] `https://supakornohm.vercel.app/og.png` returns a PNG, not HTML
- [ ] Project images still load on the deployed page (open DevTools → Network, filter Img, confirm 200s and `image/webp`)
- [ ] `https://supakornohm.vercel.app/icon.png` still returns the favicon

## 404 behaviour (deployed)

- [ ] `/nonexistent-xyz` shows the "Page not found" page, not a blank shell
- [ ] Its "Back to portfolio" link returns to the homepage
- [ ] Known-and-accepted: the response status is **200**, not 404. A rewrite
      cannot set a status code. Confirm it is 200 and that this is understood,
      rather than discovering it later and treating it as a regression.

## Link previews

Each of these renders the card independently — passing one does not imply the others.

- [ ] Facebook / Open Graph: https://developers.facebook.com/tools/debug/
- [ ] X / Twitter card validator
- [ ] LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- [ ] Paste the URL into Slack or Discord and confirm a large image card appears
- [ ] The card's text is legible at the small size used in a feed

## The card itself

- [ ] Open `public/og.png` and look at it — no clipped text, no missing gradient
- [ ] `sips -g pixelWidth -g pixelHeight public/og.png` reports 1200 x 630
- [ ] `stat -f%z public/og.png` is under 300000
- [ ] `npm run og` regenerates it reproducibly (run twice, compare sizes)

## Scroll landing accuracy

- [ ] On a COLD load of `/connect` (hard refresh, empty cache), the page lands
      on the Connect section and not slightly off it

`scrollToSection` (`useActiveSection.ts:90`) defers by `setTimeout(…, 0)`. On a
cold load, below-the-fold images have not laid out yet, so the offset may be
wrong. Deliberately not engineered around in advance — observe first, and only
fix it if it actually misbehaves.

- [ ] Repeat with reduced motion enabled (System Settings → Accessibility →
      Display → Reduce motion) and confirm it jumps instead of animating

## What no test in this branch proves

- That Vercel honours `vercel.json` at all. Probed: with no `vercel.json` in the
  repo, `vite preview` already returns 200 and the SPA shell for all three
  routes and for `/nonexistent-xyz`. No local check can tell a correct config
  from a missing one.
- That `/og.png` is reachable over HTTP. The same probe returned 200 for
  `/og.png` while no such file existed. The test asserts the file's bytes on
  disk instead.
- That the card looks right. The tests prove dimensions and byte size, never
  appearance.
- That crawlers actually fetch and render the card.
- That the redirect's `replace: true` produces correct Back behaviour in a real
  browser. `MemoryRouter` is not a history stack.
