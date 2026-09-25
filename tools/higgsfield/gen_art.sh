#!/usr/bin/env bash
# Generates painted backdrops for every stage/domain in parallel. Results: <name>.json + <name>.png
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

gen jujutsu_high 21:9 "$STYLE Location: a secluded traditional Japanese sorcery school campus hidden in forested mountains at golden sunset: old wooden temple-style school buildings with curved dark tiled roofs, a tall five-story pagoda, a red torii gate, blooming cherry blossom trees with drifting petals, warm orange and violet sky with glowing clouds. $FLOOR The floor is a flat pale stone-paved temple courtyard. $EMPTY" &
gen shinjuku 21:9 "$STYLE Location: a devastated Tokyo skyscraper district after a catastrophic supernatural battle: skyscrapers sliced clean in half and collapsing, huge craters, burning rubble, smoke columns and floating embers, a broken elevated highway, blood-orange dusk sky. $FLOOR The floor is flat cracked asphalt scattered with small debris. $EMPTY" &
gen kyoto 21:9 "$STYLE Location: a Kyoto bamboo grove at night under a huge full moon: towering bamboo stalks, glowing stone lanterns lining a path, a small red shrine gate, blue moonlit mist, fireflies. $FLOOR The floor is a flat stone and packed-earth shrine path. $EMPTY" &
gen unlimited_void 21:9 "$STYLE Location: an infinite cosmic void of pure information: endless white and ice-blue space filled with swirling galaxies, nebulae, star fields and streams of light, overwhelming and transcendent. $FLOOR The floor is a perfectly still mirror-like surface reflecting the stars. $EMPTY" &
wait
gen malevolent_shrine 21:9 "$STYLE Location: a sinister demonic Japanese shrine of dark lacquered wood standing in a flooded crimson world: the shrine roof shaped like a gaping fanged maw, ox skulls and bones piled around its base, blood-red sky with a black sun, ominous red mist. $FLOOR The floor is a flat, still, dark crimson liquid surface like a mirror. $EMPTY" &
gen yuji_domain 21:9 "$STYLE Location: a surreal, nostalgic rural Japanese train station platform at twilight: an empty wooden platform with a small shelter, endless railway tracks vanishing into the distance, power lines, rice fields, a crimson and indigo sky with a huge setting sun, floating embers, melancholic dreamlike mood. $FLOOR The floor is the flat concrete station platform. $EMPTY" &
gen chimera_shadow_garden 21:9 "$STYLE Location: a boundless garden of living shadow: a vast pitch-black lake under a deep indigo sky, dozens of glowing yellow eyes peering out of the darkness, shadowy tendrils and silhouettes of beasts rising from the ink, faint violet light. $FLOOR The floor is a flat glossy black liquid shadow surface with soft ripples. $EMPTY" &
gen coffin_iron_mountain 21:9 "$STYLE Location: inside the crater of an enormous active volcano: towering jagged black rock walls on all sides, rivers and waterfalls of glowing orange lava, ash-choked red sky, embers raining down, intense heat haze. $FLOOR The floor is flat cracked black basalt with glowing magma fissures. $EMPTY" &
wait
gen deadly_sentencing 21:9 "$STYLE Location: a vast pitch-black courtroom shrouded in thick rolling fog, dark and dramatic: gallery benches of dark wood on the left and right sides, tall columns fading up into darkness, faint gold trim, high arched windows with cold moonlight, a single harsh white spotlight from above onto the center. The center back of the room is left empty and dark (no judge's bench, no furniture in the middle). $FLOOR The floor is polished black marble with fog pooling across it. $EMPTY" &
gen overtime_collapse 21:9 "$STYLE Location: a high-rise corporate office floor at exactly six p.m. sunset: huge floor-to-ceiling windows showing a golden-orange Tokyo skyline and setting sun, the office is breaking apart with fractured concrete pillars, cracked ceiling panels, falling dust and debris, overturned desks and chairs, dramatic god rays. $FLOOR The floor is flat grey office carpet. $EMPTY" &
gen title 16:9 "Dramatic anime key art background for a fighting game title screen, high-budget TV anime style: night Tokyo skyline seen from a rooftop under a huge blood-red full moon, swirling dark purple and crimson cursed energy flames in the sky, paper talismans and petals caught in the wind, deep shadows, cinematic. Leave the center of the image calm and dark for a logo. No people, no characters, no readable text, no logos, no watermark." &
wait
echo ALL DONE
