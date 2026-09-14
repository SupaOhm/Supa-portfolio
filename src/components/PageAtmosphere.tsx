import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { usePageHue } from '../hooks/usePageHue';

/**
 * One continuous mesh behind the entire page.
 *
 * ## Why this is page-level and not per-section
 *
 * The first version of this put an atmosphere inside each section. Every
 * section clipped its own layer at its own edges, so the page read as four
 * separate backdrops butted together -- pages, not a page. There is no amount
 * of tuning that fixes that: it is a consequence of where the layer lives, not
 * of what is in it.
 *
 * So the layer lives once, here, `position: fixed`. It does not scroll at all.
 * What moves is its HUE, driven continuously by scroll position through
 * `--page-hue`, so the colour is always somewhere between two stops and never
 * sits on one and then switches. Nothing clips, because there are no section
 * boundaries for it to clip against.
 *
 * Fixed also means the blur is rasterized once instead of on every scroll
 * frame. Three 80vh blurred radials that scroll with the document are three
 * layers the compositor has to keep re-rastering; pinned to the viewport they
 * are painted once and only re-composited when the hue changes.
 *
 * ## The hue is one number
 *
 * Every colour below is `oklch(L C var(--page-hue))` -- same lightness, same
 * chroma, one rotating hue. That is what keeps the sweep even: a background
 * that cross-fades between two arbitrary colours passes through whatever lies
 * between them, which on most paths is a grey. Rotating hue in a perceptual
 * space cannot do that, so the mesh stays exactly as bright at every scroll
 * position as it was at the top.
 *
 * The `+ 40` and `- 55` offsets give the second and third blob a neighbouring
 * hue rather than the same one, so the overlaps blend across a small span of
 * the wheel instead of all being one flat colour. They rotate WITH the page
 * hue, so the relationship holds the whole way down.
 */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/** Fallback hue for the first paint, before the scroll listener has run. */
const H = 'var(--page-hue, 250)';

const BLOBS = [
  {
    key: 'a',
    className: 'left-[-15%] top-[-20%] h-[85vh] w-[85vh]',
    color: `oklch(68% 0.17 calc(${H} * 1deg))`,
    animation: 'drift-a 29s ease-in-out infinite',
  },
  {
    key: 'b',
    className: 'right-[-20%] top-[5%] h-[95vh] w-[95vh]',
    color: `oklch(72% 0.15 calc((${H} + 40) * 1deg))`,
    animation: 'drift-b 37s ease-in-out infinite',
  },
  {
    key: 'c',
    className: 'bottom-[-30%] left-[20%] h-[80vh] w-[80vh]',
    color: `oklch(66% 0.16 calc((${H} - 55) * 1deg))`,
    animation: 'drift-c 43s ease-in-out infinite',
  },
];

export default function PageAtmosphere() {
  const reducedMotion = usePrefersReducedMotion();
  usePageHue();

  return (
    <div
      aria-hidden="true"
      /* fixed, not absolute: pinned to the viewport so there is nothing to
         clip and nothing to re-rasterize while scrolling.

         -z-10 against the page shell, which must therefore NOT create a
         stacking context of its own -- if it did, this would paint behind its
         background and vanish. That failure is silent and survives any amount
         of opacity tuning, so it is worth naming here rather than rediscovering.

         pointer-events-none so a full-viewport decorative layer can never
         intercept a click. */
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {BLOBS.map((blob) => (
        <div
          key={blob.key}
          className={`absolute rounded-full ${blob.className}`}
          style={{
            background: `radial-gradient(circle at center, ${blob.color} 0%, transparent 68%)`,
            opacity: 0.45,
            filter: 'blur(90px)',
            /* Reduced motion keeps the mesh and the scroll-driven colour and
               drops only the idle drift. The composition and the sense of
               place are the point; the drifting is the flourish, and the
               flourish is the part that causes trouble. */
            animation: reducedMotion ? 'none' : blob.animation,
            willChange: reducedMotion ? undefined : 'transform',
          }}
        />
      ))}

      {/* Pointer-reactive highlight. Inherits --glow-x / --glow-y from the page
          shell, so it costs no React state and no re-render. */}
      <span
        className="cursor-glow h-[460px] w-[460px] rounded-full opacity-[0.14] blur-[80px]"
        style={{
          background: `radial-gradient(circle at center, oklch(75% 0.16 calc(${H} * 1deg)) 0%, transparent 70%)`,
        }}
      />

      {/* Grain last, so it dithers the blend rather than sitting under it.
          soft-light rather than overlay: overlay preserves the backdrop's
          darkness and so does almost nothing over a near-black page, while
          soft-light lifts and lowers around mid-grey and actually bites. It
          also breaks up the 8-bit banding a large, low-contrast blend shows on
          an ordinary display. */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
