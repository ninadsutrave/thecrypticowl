#!/usr/bin/env bash
# Build the deployment zip for one game's Lambda.
#
#   lambda/scripts/package.sh <game> [out.zip]
#
# The zip holds only what that Lambda runs: shared/, games/<game>/, and
# production dependencies — no tests, fixtures or other games. Before
# zipping, the handler is imported from the staged copy, so a missing file
# or dependency fails the build here rather than at 03:00 in production.
set -euo pipefail

GAME="${1:?usage: package.sh <game> [out.zip]}"
LAMBDA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${2:-function-${GAME}.zip}"
OUT_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"

if [ ! -f "$LAMBDA_DIR/games/$GAME/index.js" ]; then
  echo "::error::No Lambda for game '$GAME' (expected lambda/games/$GAME/index.js)" >&2
  exit 2
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/games"
cp -R "$LAMBDA_DIR/shared" "$STAGE/shared"
cp -R "$LAMBDA_DIR/games/$GAME" "$STAGE/games/$GAME"
cp "$LAMBDA_DIR/package.json" "$LAMBDA_DIR/package-lock.json" "$STAGE/"

find "$STAGE" -name '*.test.js' -delete
rm -rf "$STAGE/games/$GAME/fixtures"

(cd "$STAGE" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error)

# The import is the proof the package is complete.
(cd "$STAGE" && node --input-type=module -e "
  const m = await import('./games/${GAME}/index.js');
  if (typeof m.handler !== 'function') throw new Error('games/${GAME}/index.js exports no handler');
")

rm -f "$OUT_ABS"
(cd "$STAGE" && zip -qr "$OUT_ABS" . -x '*.md' -x 'node_modules/.cache/*')
echo "Packaged $GAME → $OUT_ABS ($(du -h "$OUT_ABS" | cut -f1))"
