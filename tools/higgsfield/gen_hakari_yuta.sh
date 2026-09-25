#!/usr/bin/env bash
cd "$(dirname "$0")"
STYLE="Wide panoramic side-view background plate for a 2D anime fighting game stage. High-budget TV anime background art: painterly, cel-shaded, crisp clean linework, cinematic lighting, rich atmosphere."
FLOOR="The bottom 20 percent of the image is a flat, level floor running left to right, seen from eye level, forming the stage floor. Straight-on horizontal composition, low horizon, deep perspective."
EMPTY="Completely empty: no people, no characters, no creatures, no readable text, no logos, no watermark."
gen() {
  local name="$1" ar="$2" body="$3"
  higgsfield generate create gpt_image_2_5 --aspect_ratio "$ar" --resolution 2k --quality high \
    --prompt "$body" --wait --wait-timeout 20m --json > "$name.json" 2> "$name.err"
  local url
  url=$(python -c "import json;print(json.load(open('$name.json'))[0]['result_url'])" 2>/dev/null)
  if [ -n "$url" ]; then curl -s -o "$name.png" "$url"; echo "$name ok"; else echo "$name FAILED"; cat "$name.err" | tail -3; fi
}
gensfx() {
  local name="$1" body="$2"
  higgsfield generate create seed_audio --prompt "$body" --format mp3 --sample_rate 44100 --wait --json > "sfx_$name.json" 2> "sfx_$name.err"
  local url
  url=$(python -c "import json;print(json.load(open('sfx_$name.json'))[0]['result_url'])" 2>/dev/null)
  if [ -n "$url" ]; then curl -s -o "sfx_$name.mp3" "$url"; echo "$name ok"; else echo "$name FAILED"; tail -3 "sfx_$name.err"; fi
}
gen idle_death_gamble 21:9 "$STYLE Location: a surreal supernatural domain that fuses a glowing pachinko parlour with the interior of a long Japanese commuter train at night: rows of dazzling pachinko machines with flashing gold, green and pink lights line both sides like train seats, hanging hand straps, train windows showing a neon night city streaking past, thousands of silver pachinko balls scattered and floating in the air, a slot-machine reel display glowing high on the back wall, lucky green and gold light everywhere, exciting casino jackpot atmosphere. $FLOOR The floor is a flat polished train-carriage floor reflecting the neon lights. $EMPTY" &
gen authentic_mutual_love 21:9 "$STYLE Location: an endless bright otherworldly field under a pale luminous sky, thousands upon thousands of Japanese katanas stuck upright in the ground stretching to the horizon, a few giant ornate crosses and great ribbons of pink and lavender light in the sky, drifting white petals, serene yet overwhelming, soft heavenly light. $FLOOR The floor is flat pale grey earth with the katanas planted into it. $EMPTY" &
gensfx slot_spin "Pachinko and slot machine reels spinning fast with rapid mechanical clicking, bright electronic dings and a rising excited arcade jingle. Isolated sound effect, 2 seconds, no voices." &
gensfx jackpot "Casino slot machine JACKPOT payout: triumphant fanfare of bright bells and chimes, a cascade of coins pouring out, electronic celebration sirens. Isolated sound effect, 3 seconds, no voices." &
gensfx shutter "A heavy metal roller shutter door slamming shut violently: rattling corrugated steel crash and a hard metallic bang. Isolated sound effect, under one second, no music, no voices." &
gensfx rika "A giant monstrous cursed spirit roaring: a deep distorted inhuman growl with a shrieking ghostly edge, echoing. Isolated creature sound effect, 2 seconds, no music, no words." &
gensfx katana "A katana being drawn from its sheath and slicing the air: crisp metallic shing and a sharp whoosh. Isolated sound effect, under one second, no music, no voices." &
wait
echo ALL DONE
