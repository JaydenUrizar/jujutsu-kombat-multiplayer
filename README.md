# Jujutsu Kombat — Multiplayer Edition

A Mortal Kombat-style 2D fighting game built on Jujutsu Kaisen, with **local two-player**
and **online versus** added on top of the original single-player game. You can still fight
CPU opponents at **Easy**, **Normal**, **Pro** or **Expert** difficulty. All visuals are
drawn in code: the cel-shaded skeletal characters, parallax stages and VFX. Sound effects
and the original score are synthesized, and anime OST tracks and voice clips in `audio/`
play at key moments (see *Music and voice clips*).

## Run it

Double-click `index.html`, or serve the folder with any static server, e.g.
`python -m http.server`. It works in any modern desktop browser (Chrome or Edge
recommended). It has no build step and no dependencies — online play additionally loads
the small PeerJS library from a CDN; if that fails, only online versus is unavailable.

## Modes

| Mode | What it is |
| --- | --- |
| **Online Versus** | Fight a friend over the internet (see *Multiplayer* below) |
| **Local Versus** | Two players, one keyboard (see *Multiplayer* below) |
| Arcade | Pick a sorcerer and difficulty, then beat every other sorcerer in a row for the ending |
| Versus CPU | Pick your fighter, the CPU's fighter, the difficulty and the stage |
| Survival | One-round fights against random foes. Your health carries over (+30% per win). Your best streak is saved |
| Training | Infinite meter and HP regen. C toggles technique cooldowns. TAB cycles the dummy, R resets positions. Shows an input history, hit damage, best combo and frame advantage |

## Multiplayer

### Local Versus (two players, one keyboard)

Pick a fighter for each player, then a stage. First to 3 rounds.

| | Player 1 | Player 2 |
| --- | --- | --- |
| Move / jump / crouch | A D W S | ← → ↑ ↓ |
| Light / Heavy / Kick | J / K / L | , / . / / |
| Techniques 1 / 2 / 3 | U / I / O | B / N / M |
| Block (↓ for low) | Space | Right Shift |
| Domain Expansion | Q | Enter |
| Throw | H | V |
| Dash | Left Shift / F | C |
| Amplify | E / R | X |

Gamepads work too: pad 1 drives Player 1, pad 2 drives Player 2.

### Online Versus

One player **hosts a room** and shares the 4-letter code; the other **joins**. The host
picks the stage and starts the match; both players pick their own fighter and costume in
the lobby. The host is always the left (P1) side. Both players use the standard Player 1
controls on their own machine.

- **Netcode:** deterministic lockstep input sync over a WebRTC data channel (PeerJS free
  public broker — there is no game server). Both computers run the identical simulation;
  only 15-button input bitmasks cross the wire, delayed 6 frames (~100 ms) so they arrive
  in time. All gameplay randomness (Black Flash rolls, Hakari's slot reels, Higuruma's
  trial sequences, Yuta's copied techniques) draws from one seeded stream shared via the
  match seed, so both peers stay frame-perfect.
- **Verification:** every 120 frames both sides exchange a state fingerprint; a mismatch
  shows a DESYNC warning (you can keep playing; results may differ). `tools/desync-test.mjs`
  runs the whole simulation twice in isolated sandboxes with identical inputs and asserts
  zero divergence over thousands of frames, including domains, KOs and finishers — run it
  with `node tools/desync-test.mjs`.
- **Pause:** either player can pause; resuming re-syncs both tick clocks. Leave from the
  pause menu or the results screen. Rematch requires both players to pick REMATCH.
- **Fairness:** both fighters receive the same input delay. Ping shows in the top-right
  during a match. Strict corporate/school NATs without TURN relay may fail to connect — a
  home network or mobile hotspot works.

## Single-player game (unchanged)

Every match opens with an **intro cutscene**: a pan across the stage, a close-up of each fighter
with a name card and their line (Gojo and Sukuna speak theirs), then a VS slam. Press Enter to skip.

Matches are best of 3 rounds with a 99-second timer. The results screen shows your max combo,
damage, Black Flashes, domains, Just Guards and wall splats. Certain matchups open with their own rival dialogue.

**Costumes:** press ↑/↓ on the character select screen. Each fighter has three: Gojo's blindfold
or sunglasses, Sukuna's Heian kimono or "Shibuya Vessel" (Yuji's uniform), Yuji's hoodie, and more.
In a mirror match the CPU automatically wears a different costume.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move / jump / crouch | A D W S or arrow keys | Left stick / D-pad |
| Light / Heavy / Kick | J / K / L | X / Y / A |
| Techniques 1 / 2 / 3 | U / I / O (O costs 1 bar) | LB / B / RB |
| Block (add ↓ for low) | Space | RT |
| Throw | H (or J+L) | Back |
| Domain Expansion | Q (needs 3 bars) | LT |
| Amplify (during a special's startup) | E (or R) | R3 |
| Dash / run / backdash | Shift (or F); keep holding → to run, hold ← for a backdash. Double-tap → / ← also works | L3 / R3 |
| Tech roll (when knocked down) | Shift or Space; hold ← / → to roll | L3 / R3 / RT |
| Pause (move list, restart) | Esc or P | Start |

Menus also work with the mouse.

## Fighting system

- **Matches** are first to **3 round wins**, and both fighters have **1,400 HP** (up from 1,000).
- **CPU difficulty:** Easy, Normal, Pro and **Expert**. Expert reacts almost instantly, Just Guards
  your attacks and follows up with Flawless Block Attacks, punishes nearly every whiff and uses
  Breakers. In testing it won 17 of 18 matches against Pro.

- **Speed:** jumps are snappier (higher gravity, shorter hang time), walking and dashing are
  faster, normals recover sooner and poses blend more crisply, so the fight moves like MK instead
  of drifting.
- **Kombo strings (dial-a-kombo):** J → J → J (the third hit launches), J → J → K, K → L,
  L → L (Roundhouse > Spinning Heel, which blasts them into a wall splat) and air J → K / L.
  As in MK, strings come out whether the first hit connects, whiffs or is blocked, so you dial
  them in. Special cancels still need contact. ↓+K is an uppercut launcher and anti-air, ↓+L is a
  low sweep, →+K is an overhead that beats crouch-blocking, and ←+L is a long Push Kick.
- **Amplify:** press **E** during the startup of a special to spend half a bar. It flashes
  white and deals +35% damage and +50% chip with extra hitstun.
- **Breaker:** while you're being comboed (2+ hits), press **→ + Space** with 2 bars to blast the
  attacker away and recover. The HUD prompts you when it's available.
- **Flawless Block Attack:** after a **Just Guard**, press **K** (even out of blockstun) for a
  fast, invincible counter that knocks them away.
- **Counter hits and punishes:** hitting someone during their startup is a **COUNTER** (+15%
  damage, more hitstun); hitting them in their recovery is a **PUNISH** (+10%).
- **Krushing Blows:** certain hits become a Krushing Blow once per match, with an X-ray of a
  cracking bone, slow motion and +60% damage: the Uppercut on a counter or punish, and the
  Haymaker or Overhead Smash on a counter hit.
- **Throws:** ← + H throws them behind you. Press H (or J+L) right as you're grabbed to escape.
- **Dashing:** Shift dashes forward (← + Shift backdashes, with brief invincibility). You can
  dash once in the air, attack straight out of a dash, dash-cancel a normal that hits to
  chase for a longer combo, and cancel a dash into block or a jump.
- **Running:** keep holding forward after a dash to break into a sprint. Attack out of a run to
  keep the momentum, or press ↑ for a longer running jump. Let go to skid to a stop.
- **Air control:** you can drift a little left or right during a jump.
- **Technique cooldowns:** each technique button (U, I, O) has its own cooldown, shown as three
  icons above your cursed-energy bar. The icon fills back up as it recovers and shows the seconds
  left. Pressing a technique that is still cooling down flashes the icon red. Using ↓+U shares U's
  timer, and so on. Projectiles and supers have longer cooldowns than quick strikes. The CPU plays
  around cooldowns too. In Training, press **C** to switch cooldowns off.
- **Blocking** is a dedicated button, as in MK. Lows must be crouch-blocked, overheads blocked
  standing. Throws beat blocking.
- **Just Guard:** tap block right before a hit lands (within 6 frames). There's no chip damage,
  blockstun is halved and you gain cursed energy. Mashing block locks it out briefly.
- **Tech roll:** when knocked down, press Shift or Space to get up quickly, or hold ← / → to
  roll away or through the opponent (invincible).
- **Wall splat:** a juggled opponent blasted into the stage edge slams into the veil (帳) and hangs
  there for a moment, so you can extend the combo. Once per combo.
- **Cursed energy** (3 bars) builds from dealing and taking damage, and slowly over time.
- **Black Flash:** heavy hits can randomly become a Black Flash (2.2× damage, black lightning).
  Yuji's chance is much higher. His **I** technique is a timed Black Flash: press **I again** as
  his fist sparks red (the HUD shows *NOW!*) to guarantee it.
- **Supers (O):** every O technique triggers a super freeze. The world stops, focus lines
  converge on the caster, and they charge up. **Hollow Purple** is a full cinematic: Blue and Red
  form in each hand while "Kyoshiki… Murasaki" plays, then the sphere drags its victim through
  all 8 hits for about 26% (2 bars). Divine Flame: Open fires as Sukuna finishes the word "Fūga".
- **Domain Expansion (Q):** a cinematic cast with a shaking camera, focus lines, heartbeat,
  debris lifting off the ground, and an extreme close-up of the caster's eye as the domain is named.
  Then an inverted "impact frame" and shockwave as the arena becomes the domain for about 9 seconds. Afterwards the caster suffers *technique burnout* (no specials for 5s).
  - **Unlimited Void** (Gojo): the enemy is paralyzed for 5.5s, then takes a sure-hit.
  - **Malevolent Shrine** (Sukuna): endless unblockable slashes wherever the enemy stands.
  - **Unnamed domain** (Yuji): every hit is a Black Flash and the enemy is slowed.
  - **Chimera Shadow Garden** (Megumi): shadow wolves ambush the enemy from the ground.
  - **Coffin of the Iron Mountain** (Jogo): constant burning plus sure-hit eruptions.
  - **Deadly Sentencing** (Higuruma): a timed trial minigame. The verdict is Confiscation, the
    Death Penalty, or Not Guilty (see below).
  - **Overtime: Collapse** (Nanami, extension technique): the building comes down around the enemy.
    Ultimates can't be clashed.
  - **Authentic Mutual Love** (Yuta): katanas burst out of the ground under the enemy, and U draws
    a katana holding a copied technique (see Yuta below).
  - **Idle Death Gamble** (Hakari): a pachinko slot machine. Hit the **JACKPOT** (see Hakari below).
- **The Zone:** landing a Black Flash puts you *in the zone* for 8 seconds, which triples your
  Black Flash chance (black lightning crackles around you).
- **Reverse Cursed Technique:** Gojo and Sukuna can heal with **↓+O** (1 bar, 14% HP). It's
  interrupted if they're hit.
- **Simple Domain:** when an enemy domain is being cast and you have at least 1 bar, press
  **Space** to protect yourself. Sure-hit damage drops to 40%, and Unlimited Void paralysis
  drops to 1.5s.
- **Domain Clash:** if a domain is cast while you also have 3 bars, press **Q** during the cast,
  then mash attack buttons. The winner's domain takes over.
- **FINISH THEM:** when a match-winning KO lands, the loser is left dazed. Walk up and press
  **Q** for your character's finisher:
  - Gojo: Hollow Purple erases the opponent.
  - Sukuna: World Cutting Slash splits them in two.
  - Yuji: a Black Flash ×4 sends them into the sky.
  - Megumi: shadows swallow them.
  - Jogo: Maximum: Meteor incinerates them.
  - Higuruma: the fight is dragged into his fog-filled courtroom. Judgeman bangs the gavel for the
    death penalty, a pillar of light delivers the golden Executioner's Sword, and Higuruma passes
    straight through the opponent, splitting them in a flash of gold.
  - Nanami: a critical 7:3 strike, then the building collapses on them.
  - Yuta: Rika fully manifests, snatches them up, and Pure Love erases them.
  - Hakari: the reels line up 7-7-7 and a Jackpot uppercut sends them into orbit.

  Or just hit them for a normal KO.

## Animation

Fighters are skeletal rigs animated with keyframed poses, 2-bone IK and pose blending, plus:

- **Frame interpolation:** the simulation runs at a fixed 60 Hz, and rendering blends between the
  last two frames. Motion stays smooth on 120/144 Hz monitors and during slow motion. You can turn
  it off in Options (*Smooth motion*) for the lowest input delay.
- **Foot-planted walk and run cycles** driven by the distance actually travelled, so feet don't
  slide. Gojo and Sukuna stroll upright, the others shuffle in their guard, and everyone sprints
  with pumping arms (Gojo keeps his hands in his pockets). Footsteps kick up dust.
- **Squash and stretch** on jump take-off, landing (scaled by fall speed) and dashes.
- **Spring-driven hit reactions:** heads snap back from high hits, bodies fold from body blows,
  then overshoot and settle.
- **Turnarounds:** fighters pivot through a quick squeeze instead of popping to face the other way.
- Smooth rise-to-fall blending at the top of a jump, forward rolls that finish cleanly, idle
  blinking, and heavier breathing when low on health.

## Characters

| Sorcerer | U | I | ↓+U | O (1 bar) | Domain |
| --- | --- | --- | --- | --- | --- |
| Satoru Gojo | Lapse: Blue (pulls enemy in) | Reversal: Red (blast) | Teleport behind | Hollow Purple (2 bars) | Unlimited Void |
| Ryomen Sukuna | Dismantle (also in air) | Cleave (rushing cuts) | Rising Cleave | Divine Flame: Open (burns) | Malevolent Shrine |
| Yuji Itadori | Divergent Fist (delayed 2nd impact) | Black Flash (timed) | Manji Kick | Cursed Barrage | Unnamed domain |
| Megumi Fushiguro | Divine Dogs | Nue (overhead dive) | Toad (anti-air) | Max Elephant | Chimera Shadow Garden |
| Jogo | Ember Insects (homing) | Volcano (eruption under the enemy) | Flame Burst | Maximum: Meteor | Coffin of the Iron Mountain |
| Kento Nanami | Ratio Technique 7:3 (timed critical) | Collapse (rubble erupts forward, low) | Rising Ratio | Overtime (10s buff) | *Ultimate:* Overtime: Collapse |
| Hiromi Higuruma | Gavel Strike (the gavel grows) | Gavel Toss (boomerang, 2 hits) | Gavel Uppercut | Colossal Gavel (overhead) | Deadly Sentencing |
| Yuta Okkotsu | Cursed Blade (lunging katana slash) | Rika (she lunges out and rakes); ←+I Cursed Speech "Don't move." (freezes them) | Rising Moon | Pure Love (2 bars, colossal beam) | Authentic Mutual Love |
| Kinji Hakari | Shutter Doors (slam shut on the enemy) | Pachinko Ball (bounces) | Rough Uppercut | Rough Energy (sticks, then detonates) | Idle Death Gamble |

Gojo's **Infinity** means he takes no chip damage while blocking.

**Kento Nanami** fights with a cloth-wrapped blade. His **Ratio Technique** (U) is a timing test.
Nanami takes a stance, a line splits the opponent into ten parts, and a marker sweeps down it. Press
**U again** as the marker crosses the highlighted **7:3** point for a **CRITICAL HIT**: about 20%
of a health bar in one strike. Time slows, the screen inverts, the target is split at the ratio
line and blasted away, often into a wall splat. Press off the mark, or not at all, and it's a plain
cut. **Overtime** (O, 1 bar) loosens his tie at "18:00": for 10 seconds he deals +30% damage, the 7:3
window is wider, and his cooldowns recover 50% faster. Nanami has no domain, so his Q is an
**extension technique**, *Overtime: Collapse*. The fight moves into a high-rise office at sunset
that cracks apart: ceiling slabs drop on the opponent (a shadow shows where) and the whole floor
gives way at the end.

**Hiromi Higuruma** swings a judge's gavel that grows mid-swing, can be thrown like a boomerang, and
swells to colossal size for his O super (an overhead). The **Executioner's Sword** is not part of
his normal kit. He can only earn it in court.

**Yuta Okkotsu** fights with a katana and calls on **Rika**, a towering curse who lunges out
from behind him (I). **← + I** is a copied **Cursed Speech: "Don't move."**, which freezes the
opponent in place for about 0.7s (unblockable, short range, and it costs Yuta a little health).
**Pure Love** (O, 2 bars) is a super where Rika looms behind him and they fire a colossal beam.
His domain, **Authentic Mutual Love** (20 seconds), is an endless field of katanas: blades erupt from the ground
under the enemy, and **U** draws a katana that holds a random copied technique: Black Flash,
Cursed Speech "Explode", Granite Blast or Sky Manipulation. The domain theme is *This Is Pure Love*.

**Kinji Hakari** fights with Shutter Doors, Pachinko Balls and Rough Energy, the coarse
cursed energy that sticks to its target and then detonates. His domain, **Idle Death Gamble**
("Private Pure Love Train"), is a pachinko train carriage:
- Use **Shutter Doors (U)** or **Pachinko Ball (I)** twice to **spin the slots**. Both moves then
  go on a long cooldown before you can start another spin.
- The first two reels can line up for a **REACH**, announced with a riichi **scenario** (Transit
  Card, Seat Struggle, Potty Emergency, Pure Love Train) and a **hold color**: green (15% jackpot),
  red (33%), gold (60%) or rainbow (guaranteed).
- A miss **shifts the scenario** and heats up the machine, so later spins have better odds. The
  domain lasts 20s and won't collapse mid-spin.
- **JACKPOT** (7-7-7): the domain shatters and Hakari enters his **Jackpot state for 40 seconds**
  to his own Jackpot theme. He radiates green cursed energy and heals constantly. His whole
  moveset becomes heavy energy attacks with hyper armor on the big ones: Rough Cannon, Jackpot
  Burst, Rough Wave, Rising Surge and Jackpot Rush. **Nothing but the Executioner's Sword can
  kill him** while it lasts. (Higuruma's Confiscation also seizes it.)

His domain, **Deadly Sentencing**, is a pitch-black, fog-filled courtroom where Judgeman presides.
It's a **trial minigame**, and nobody can fight while it lasts:
- Judgeman reads the charge and the rules (about 5 seconds, and they stay pinned in the corner
  during the trial; press **J** to start early once you've read them), then a **22-second clock** starts. Against you, the CPU types at
  human-friendly speeds (about 2 keys a second on Pro), and a wrong key only locks you out briefly.
- The **prosecution** (Higuruma) types the button sequences shown on screen (arrows and J K L).
  Each completed sequence presents a piece of **EVIDENCE**. A human prosecutor gets 4-key
  sequences for the first three pieces of evidence, then 6-key ones.
- The **defense** types its own, longer sequences. Each one completed raises an **OBJECTION!**,
  which destroys a piece of evidence and scrambles the prosecutor's current sequence.
- A wrong key resets your sequence and locks you out for a moment. You can't see the other side's
  keys, only their progress.
- With **3+ evidence** the prosecutor may press **Q** to rest the case. Verdict: **CONFISCATION**.
  The defendant's cursed techniques and domain are sealed for **30 seconds**, all their cursed
  energy is seized, and Judgeman's gavel hits them (unblockable).
- Reach **5 evidence** and the verdict is the **DEATH PENALTY**. Higuruma holds the glowing
  yellow **Executioner's Sword** for 30 seconds, and O becomes **Execution**: a slow, blockable,
  telegraphed slash (the blade glints before it falls) that **kills instantly** if it lands.
- If the clock runs out first, the verdict is **NOT GUILTY**. Pushing for the death penalty
  instead of resting at 3 is a gamble.

Whether you're the prosecutor or the defendant, you type. How it goes depends on how fast and
accurately you enter your sequences.

## Stages

Every stage and domain interior has a **painted backdrop** (in `art/`, generated with Higgsfield's
GPT Image 2.5 model). Each one is drawn as a parallax layer whose painted floor lines up with the
fighters' floor. Rain, petals, fog, embers, Judgeman, the verdict scrolls and the collapsing-office
cracks are still drawn live on top. The title and menus use a painted key-art backdrop. Turn it off
with **Options → Painted backgrounds** to get the original procedural scenery back.

Tokyo Jujutsu High at sunset, the Shibuya Incident at night in the rain, the ruined Shinjuku
Showdown, and the moonlit Kyoto Bamboo Grove. Each stage has its own theme.

**Character art:** limbs are drawn thicker with a hard cel-shade band on the side away from the
light and a soft highlight on the lit side, so the fighters sit better against the painted plates.

## Music and voice clips

The game bundles anime audio in `audio/`:

| Where it plays | File |
| --- | --- |
| Menu, Kyoto Bamboo Grove | `audio/ost/delirious.mp3` (Gojo vs Toji, *Delirious*) |
| Tokyo Jujutsu High | `audio/ost/acrux.mp3` |
| Shibuya Incident | `audio/ost/with_rage.mp3` (from 1:17 on) |
| Yuta's domain | `audio/ost/this_is_pure_love.mp3` (*This Is Pure Love*, 1:39–2:37) |
| Hakari's domain | `audio/ost/private_pure_love_train.mp3` (the build-up of *Admiring You*) |
| Hakari's Jackpot state | `audio/ost/jackpot.mp3` (*Admiring You* from 1:07, ~44s) |
| Shinjuku Showdown | `audio/ost/defeat_here.mp3` |
| Gojo's domain cast ("Ryōiki Tenkai… Muryōkūsho") | `audio/sfx/gojo_domain.mp3` |
| Yuji / Megumi / Jogo domain cast ("Ryōiki Tenkai") | `audio/sfx/domain_generic.mp3` |
| Higuruma's domain cast ("Ryōiki Tenkai") | `audio/sfx/higuruma_domain.mp3` |
| Deadly Sentencing theme (during Higuruma's domain) | `audio/ost/deadly_sentencing.mp3` |
| Gojo's intro ("Yo… hisashiburi") | `audio/sfx/gojo_intro.mp3` |
| Sukuna's intro ("Know your place, fool") | `audio/sfx/sukuna_intro.mp3` |
| Sukuna's domain cast | `audio/sfx/sukuna_domain.mp3` |
| Hollow Purple (move and Gojo's finisher) | `audio/sfx/hollow_purple.mp3` |
| Divine Flame: Open (Fuga) | `audio/sfx/fuga.mp3` |

The tracks were loudness-normalized, and Gojo's clip was trimmed so the cinematic doesn't stall
on the long pause between the two lines. Apart from Deadly Sentencing, the domain themes themselves (during a domain), the
victory jingle and the other characters' lines use the game's original synthesized audio and the
text-to-speech announcer.

**Options → ANIME OST + VOICE CLIPS** switches between the bundled audio and the all-original score.

**Adding more:** drop files into `music/` using the names in
[`music/PUT_YOUR_MUSIC_HERE.txt`](music/PUT_YOUR_MUSIC_HERE.txt), for example
`unlimited_void.mp3` for Gojo's domain theme or `coffin_of_the_iron_mountain.mp3` for Jogo's.
Files in `music/` override both the bundled OST and the synthesized tracks. To play different OST
tracks on a stage, edit the `SOUNDTRACK` table at the top of the music section in `js/audio.js`.

### Generated sound effects

Eleven recorded-quality sound effects in `audio/sfx/gen/` (generated with Higgsfield Seed Audio) are
layered over the synthesized ones. The first six are listed below. The other five are `slot_spin`,
`jackpot`, `shutter`, `rika` and `katana`, for Hakari and Yuta; their generation script is
`tools/higgsfield/gen_hakari_yuta.sh`, which also painted the two new domains.

| Sound | Where |
| --- | --- |
| `gavel.mp3` | Trial gavel strikes, verdicts, Confiscation, Colossal Gavel, the finisher |
| `sword_manifest.mp3` | The Executioner's Sword appearing (Death Penalty, finisher) |
| `execution.mp3` | Execution landing, the finisher's cut |
| `domain_boom.mp3` | Every domain expansion |
| `heavy_hit.mp3` | Heavy (power 3) hits |
| `critical.mp3` | Nanami's 7:3 critical |

`tools/higgsfield/gen_art.sh` and `gen_sfx.sh` are the scripts that generated them. You need the
Higgsfield CLI logged in to rerun them.

## Code layout

| File | Purpose |
| --- | --- |
| `js/rig.js` | Skeleton, IK, pose interpolation, layered cel-shaded body renderer |
| `js/characters.js` | Palettes, outfits, heads and hair for each character |
| `js/moves.js` | Poses, frame data, specials, projectiles, shikigami drawings |
| `js/fighter.js` | State machine, physics, input buffer, cancels, hit and block resolution |
| `js/game.js` | Rounds, camera, domains, clashes, finishers, rendering |
| `js/ai.js` | CPU opponent (reaction delay, blocking, anti-air, punishes, combos) |
| `js/net.js` | Online versus: PeerJS room link, lockstep input sync, hash checks |
| `js/input.js` | Keyboard + gamepads, with the second-player cluster for local versus |
| `js/stages.js` | Parallax stages and domain interiors |
| `js/vfx.js` | Particle and VFX system |
| `js/audio.js`, `js/music.js` | Web Audio SFX, sequencer and original compositions |
| `js/hud.js`, `js/menus.js` | HUD and all menu screens, including the online lobby |
| `tools/desync-test.mjs` | Headless netplay determinism test (`node tools/desync-test.mjs`) |

---

Fan-made and non-commercial. Jujutsu Kaisen and its characters belong to Gege Akutami,
Shueisha and MAPPA. This project is not affiliated with them.
