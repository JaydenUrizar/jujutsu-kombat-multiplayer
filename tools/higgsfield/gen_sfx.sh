#!/usr/bin/env bash
# Sound effects for the game via Seed Audio. Results: sfx_<name>.json + sfx_<name>.<ext>
cd "$(dirname "$0")"
gen() {
  local name="$1" body="$2"
  higgsfield generate create seed_audio --prompt "$body" --format mp3 --sample_rate 44100 --wait --json > "sfx_$name.json" 2> "sfx_$name.err"
  local url
  url=$(python -c "import json;print(json.load(open('sfx_$name.json'))[0]['result_url'])" 2>/dev/null)
  if [ -n "$url" ]; then curl -s -o "sfx_$name.mp3" "$url"; echo "$name ok"; else echo "$name FAILED"; tail -3 "sfx_$name.err"; fi
}
gen gavel "A single powerful wooden judge's gavel strike in a huge empty stone courtroom, sharp crack followed by a long deep reverberating echo. Isolated sound effect, no music, no voices." &
gen sword_manifest "A holy golden sword materializing out of light: rising shimmering chime, crystalline ringing metal and a bright magical whoosh ending in a clean blade ring. Isolated sound effect, 2 seconds, no music, no voices." &
gen execution "One enormous sword slash cutting the air at blinding speed: sharp metallic shing followed by a heavy deep boom and rumbling aftershock. Isolated cinematic sound effect, no music, no voices." &
gen domain_boom "Massive cinematic supernatural impact: a deep sub-bass boom with a shockwave whoosh and glassy shattering tail, like reality breaking open. Isolated trailer sound effect, 3 seconds, no music, no voices." &
gen heavy_hit "A brutal anime fighting game heavy punch impact: punchy body hit with a sharp crack and deep thump, short and tight. Isolated sound effect, under one second, no music, no voices." &
gen critical "An anime critical-hit strike: a razor sharp blade slice, a bright ringing metallic ping and a heavy explosive thud with a quick reverse whoosh. Isolated sound effect, no music, no voices." &
wait
echo SFX DONE
