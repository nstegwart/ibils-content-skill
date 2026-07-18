#!/usr/bin/env bash
# Smoke: wrong ID collocations + POV mash must FAIL; gold-ish good path must PASS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VOICE="$ROOT/skill/scripts/lint-voice.js"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

python3 - <<'PY' "$TMP"
import json, pathlib, sys
d = pathlib.Path(sys.argv[1])
bad = {
  "surface": "carousel-id",
  "slides": [
    {"kind": "cover", "brief": 'HEADLINE: "LO KIRIM RP1JT KE ORTU TIAP GAJI."'},
    {"kind": "content", "brief": 'LAYOUT: statement. HEADLINE: "X". BODY: "Lo transfer tiap gaji. Sisa gaji abis."'},
    {"kind": "closing", "brief": 'HEADLINE: "TULIS."'},
  ],
}
good = {
  "surface": "carousel-id",
  "slides": [
    {"kind": "cover", "brief": 'HEADLINE: "LO KIRIM RP1JT KE ORTU TIAP GAJIAN."'},
    {"kind": "content", "brief": 'LAYOUT: statement. HEADLINE: "X". BODY: "Lo transfer tiap gajian. Sisa gaji abis di tanggal 20."'},
    {"kind": "closing", "brief": 'HEADLINE: "TULIS POS ORTU."'},
  ],
}
(d/"bad.json").write_text(json.dumps(bad))
(d/"good.json").write_text(json.dumps(good))
PY

if node "$VOICE" "$TMP/bad.json" >/dev/null 2>&1; then
  echo "FAIL: bad tiap gaji should not pass"; exit 1
fi
if ! node "$VOICE" "$TMP/good.json" >/dev/null 2>&1; then
  echo "FAIL: good tiap gajian should pass"; exit 1
fi
echo "selftest-collocation: OK"
