#!/usr/bin/env bash
# Regenerates public/fonts/bricolage-grotesque-wdth.woff2 from the Fontsource
# original in assets-src/fonts/.
#
# Manual/local only, never in CI — same as `npm run images` and `npm run og`.
# Requires pyftsubset:  pip install fonttools brotli
#
# The source is the `wdth` axis variant of
# @fontsource-variable/bricolage-grotesque@5.3.0, chosen because it carries the
# wght + wdth axes the design needs. The `opsz` axis is deliberately not
# shipped: the only file carrying all three axes is 128.5 KB against this one's
# 76.3 KB, and opsz only refines contrast across 12-96.
#
# The unicode range covers printable ASCII plus the punctuation the page uses:
# non-breaking space, middle dot, en/em dash, curly quotes, and the -> and
# down-arrow glyphs in the band and footer. Subsetting takes 76.3 KB to 43.6 KB.
set -euo pipefail

SRC="assets-src/fonts/bricolage-grotesque-latin-wdth-normal.woff2"
OUT="public/fonts/bricolage-grotesque-wdth.woff2"

pyftsubset "$SRC" \
  --unicodes="U+0020-007E,U+00A0,U+00B7,U+2013-2014,U+2018-2019,U+201C-201D,U+2192,U+2193" \
  --layout-features=kern,liga,calt \
  --flavor=woff2 \
  --output-file="$OUT"

ls -l "$OUT"
