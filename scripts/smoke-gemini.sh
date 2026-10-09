#!/usr/bin/env bash
#
# Smoke-test the three Gemini calls the lambda pipeline makes:
#   1. Lexical planner  — gemini-2.5-pro
#   2. Clue generator   — gemini-2.5-pro
#   3. Judge            — gemini-2.5-flash
#
# Prompts, schemas, and generation configs are imported directly from the
# lambda package (see scripts/build-gemini-payloads.mjs) so this script
# always mirrors what the lambda sends.
#
# Usage:
#   GEMINI_API_KEY=... scripts/smoke-gemini.sh [lexical|clue|judge|all]
#
# Examples:
#   scripts/smoke-gemini.sh          # runs all three
#   scripts/smoke-gemini.sh lexical  # just the lexical planner
#
# Requires: node (>=20), curl, jq.

set -euo pipefail

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "ERROR: GEMINI_API_KEY env var is required." >&2
  exit 1
fi

for bin in node curl jq; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "ERROR: '$bin' is required on PATH." >&2
    exit 1
  fi
done

BASE_URL="https://generativelanguage.googleapis.com/v1beta/models"
GEN_MODEL="gemini-2.5-pro"
JUDGE_MODEL="gemini-2.5-flash"

# Always run from the repo root so the node helper can resolve ../lambda/shared/constants.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

STAGE="${1:-all}"

# Pretty separators.
sep() { printf '\n\033[1;35m━━━ %s ━━━\033[0m\n' "$1"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
err() { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; }

# Run a single stage: build payload, POST it, extract the JSON the model returned.
run_stage() {
  local stage="$1"
  local model="$2"
  shift 2

  local payload_file
  payload_file=$(mktemp)
  trap 'rm -f "$payload_file"' RETURN

  if ! node scripts/build-gemini-payloads.mjs "$stage" "$@" > "$payload_file"; then
    err "[$stage] failed to build request payload"
    return 1
  fi

  local payload_size
  payload_size=$(wc -c < "$payload_file" | tr -d ' ')
  printf 'Model:       %s\nPayload:     %s bytes\n' "$model" "$payload_size"

  local response
  local http_code
  response=$(mktemp)
  http_code=$(
    curl -sS -o "$response" -w '%{http_code}' \
      -X POST \
      -H 'Content-Type: application/json' \
      --data-binary "@$payload_file" \
      "${BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}"
  ) || {
    err "[$stage] curl failed"
    rm -f "$response"
    return 1
  }

  printf 'HTTP status: %s\n' "$http_code"

  if [[ "$http_code" != "200" ]]; then
    err "[$stage] non-200 response:"
    jq '.' "$response" 2>/dev/null || cat "$response"
    rm -f "$response"
    return 1
  fi

  local text
  text=$(jq -r '.candidates[0].content.parts[0].text // empty' "$response")
  if [[ -z "$text" ]]; then
    err "[$stage] empty response text"
    jq '.' "$response"
    rm -f "$response"
    return 1
  fi

  echo "Response body (parsed):"
  if ! echo "$text" | jq '.'; then
    err "[$stage] response is not valid JSON — schema mode may have failed"
    echo "$text"
    rm -f "$response"
    return 1
  fi

  ok "[$stage] OK"
  rm -f "$response"

  # Emit the parsed JSON for downstream chaining.
  echo "$text" > "/tmp/smoke-${stage}.json"
}

case "$STAGE" in
  lexical)
    sep "1/1 Lexical planner"
    run_stage lexical "$GEN_MODEL"
    ;;
  clue)
    sep "1/1 Clue generator"
    run_stage clue "$GEN_MODEL"
    ;;
  judge)
    sep "1/1 Judge"
    run_stage judge "$JUDGE_MODEL"
    ;;
  all)
    sep "1/3 Lexical planner"
    run_stage lexical "$GEN_MODEL"

    sep "2/3 Clue generator (seeded with lexical output)"
    LEXICAL_JSON=$(cat /tmp/smoke-lexical.json)
    run_stage clue "$GEN_MODEL" "$LEXICAL_JSON"

    sep "3/3 Judge (seeded with lexical + generated clue)"
    CLUE_JSON=$(cat /tmp/smoke-clue.json)
    run_stage judge "$JUDGE_MODEL" "$LEXICAL_JSON" "$CLUE_JSON"

    sep "Summary"
    ok "All three stages completed."
    ;;
  *)
    err "Unknown stage: $STAGE. Use: lexical | clue | judge | all"
    exit 1
    ;;
esac
