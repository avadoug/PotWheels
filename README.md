# Pot Wheels: The Dispensary Run

A finished, original HTML5 arcade game starring Chris in his custom wheelchair. Reach the Terp Temple, dodge traffic, collect strains, and chase a better score.

## Play locally

Double-click **Play Pot Wheels.cmd** on Windows, or open **index.html** in a modern browser. No installation, build step, developer tools, or account is needed.

For consistent local score storage, use a local web server:

```sh
npm start
```

Open http://localhost:4173. The server requires Node.js; the game itself does not. It binds to all interfaces, so another device on the same network can use your computer's local IP with port 4173 if the firewall permits it.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | One grid step; hold to keep rolling |
| Space / USE STRAIN | Activate the oldest jar in your two-slot stash |
| P / Escape | Pause or resume |
| R | Restart the run |
| On-screen direction buttons | Touch movement, including press-and-hold |

Green medians are safe. Upper medians become checkpoints. Cross any part of the top sidewalk to reach the dispensary. Only forward progress into new rows earns distance points; retreating cannot farm points.

## Implemented

- **Dirty Taxi:** stops traffic for 4.5 seconds, with a taxi escort effect.
- **Apollo 13:** five-second cosmic collision shield. Both strain names came from your brief.
- Three starting lives; brief crash protection; a life restored every third crossing, up to five.
- Seven named stages followed by endless crossings. Traffic speed increases to a cap; gaps never shrink below a playable minimum.
- Twelve original vehicle designs, including Dirty Taxi, grow vans, Trim Jail buses, tractors, police, limousines, tiny cars, and monster trucks. Individual vehicles in a lane share velocity to prevent accidental overtaking; lanes differ in speed and direction, vehicle sizes vary, and gaps are generated with variation.
- Terp jars, seed packs, and strain jars; risky pickups; close-call rewards; timed combos up to ×5; speed and surviving-life bonuses.
- Ten visual chair tiers unlocked by score, with a persistent skin selector.
- Harvest Day, Dirty Taxi Convoy and rare 420 events. 420 gives double points, faster movement and traffic, extra jars, a music variation, and restrained edge effects.
- Synthesized movement, collection, collision, close-call, power, event, victory and game-over sounds, plus optional arcade music.
- Main menu, instructions, settings, local high scores, bio, pause, victory, game-over, and restart.
- Photo-inspired Chris artwork, victory wheelie, particles, animated upgrades, grower jokes, achievement banners, glowing dispensary windows and sign.
- Persistent best score, completed run history, achievements, chair skins, highest level and settings. Storage failures do not stop play.
- Touch controls, keyboard access, visible focus, mute, volume, reduced shake, reduced effects, high contrast, system reduced-motion defaults, and automatic pause when the page loses focus.

## Secrets

Type these on the title screen: `420` for a visual gag/event, `DIRTYTAXI` for a convoy, `APOLLO13` for a cosmic preview, and `POTWHEELS` to unlock the war machine. Starting a new run resets temporary effects; the unlocked chair is saved.

## Deployment

Upload **index.html**, **style.css**, **engine.js**, **game.js**, and the **assets/** folder to any static web host. The included **pot-wheels.zip** contains those production files plus these instructions. No build command, environment variables, database or backend is needed.

- GitHub Pages: put the production files at your repository root and select that branch/root in Pages settings.
- Netlify or another drag-and-drop static host: upload the unzipped production folder.
- Other static hosts: publish the directory containing index.html, with no build command.

No public deployment has been performed.

## Files created

`index.html` (interface), `style.css` (responsive presentation), `engine.js` (rules/physics), `game.js` (drawing/audio/input/menus/saves), `assets/chris.png` (generated character), `server.cjs`, `Play Pot Wheels.cmd`, `package.json`, `package-lock.json`, `.gitignore`, this README, `ASSETS.md`, and the test files/reports/screenshots in `tests/`.

The workspace began empty; no existing game files were modified.

## Validation

```sh
npm install
npm test
npm start
# In another terminal, while the server is running:
npm run test:browser
node tests/balance.cjs
```

The browser test uses installed Chrome through Playwright. It covers title/art loading, arrow and WASD movement, moving traffic, pause/resume, both pickups/abilities, collision/life loss, respawn, crossing, scoring, progression, game-over, restart, localStorage, desktop/tablet/mobile widths, emulated touch inputs, direct file launch, and browser exceptions. Controlled test fixtures isolate collisions and the victory path; they are enabled only by `?test=1`.

The balance audit runs real collision rules over 100 random seeds at stages 1, 3 and 7 for both blind forward movement and a simple gap-timing strategy, without power-ups or invincibility cheats. Reports and desktop/mobile screenshots are saved under `tests/`.

## Limits

Tested in desktop Chrome and Chrome's touch/device emulation; physical phones, Safari, Firefox and assistive-technology playthroughs have not been tested. The visual game is not fully playable with a screen reader. Audio synthesis is tested for runtime errors, but perceived audio quality has not been verified by listening. High scores stay in the current browser/device and may not persist in private browsing or with storage blocked. There is no online leaderboard. Fun is subjective; the balance audit establishes playability, not a substitute for Chris's feedback.

Artwork provenance and exact built-in image-generation prompts are in **ASSETS.md**.
