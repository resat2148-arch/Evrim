#!/usr/bin/env bash
# Tag'in önemli anlarından still kareler: out/stills/tag-XX-*.png
# Kullanım: scripts/render-stills.sh [Tag01]
set -euo pipefail
COMP="${1:-Tag01}"
cd "$(dirname "$0")/.."
mkdir -p out/stills
npx remotion bundle video/index.ts --out-dir out/bundle --log=error >/dev/null
# kare:isim — zamanlama video/timeline.ts'e göre (intro 90, G1 270, diğer nesiller 150, seçilim 48)
for spec in 40:01-tag-titel 300:02-rekord-3-frisst-5x 385:03-selektion-gen1 640:04-gerhard 1250:05-ergebnis; do
  f="${spec%%:*}"; name="${spec#*:}"
  npx remotion still out/bundle "$COMP" "out/stills/${COMP,,}-${name}.png" --frame="$f" --log=error &
done
wait
ls out/stills
