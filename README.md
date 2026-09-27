# Snowline Sprint

An original, self-contained, portrait-first downhill arcade game designed for a 240 × 282 Rabbit R1 browser viewport. No build or network dependency. Run `python3 -m http.server 8000` in this directory and open `http://localhost:8000/`. The public release and installation QR are linked below.

## Actual 240 × 282 browser screenshots

Captured from the running game in headless Chromium, not concept art. The results capture fast-forwards to the finish; it is not evidence of a successful human run.

| Menu | Gameplay | Results |
|---|---|---|
| ![Menu at 240 by 282](screenshot-menu.png) | ![Gameplay at 240 by 282](screenshot-gameplay.png) | ![Result at 240 by 282](screenshot-results.png) |

## Play and install

[Play the published release](https://geekthegreybeard.github.io/r1-tux-racer/?release=20260927-snowline). On R1, open **Creations card → Create tab → Add via QR code** and scan this release-specific QR. The QR encodes the JSON Creation card below, not merely a bare website URL. Physical R1 installation has not been verified.

![Snowline Sprint R1 install QR](snowline-sprint-r1-install-qr.png)

## Mechanics and campaign

Three sequentially unlocked courses—Pinewake, Glasswind, Emberfall—have progressively longer, more winding slopes and more gates. Follow the curved snow track; pass through offset slalom gates, pick up fish, jump or dodge rocks, and ride short ramps. The edge slows the penguin. A medal and next-course unlock require target fish, at least 65% of gates, a finish under par, and fewer than four hits. All finishes show fish, gates, hits, time, score and medal state. Score = 160 per gate + 85 per fish + 12 per second under par − 100 per hit − 45 per missed gate. Replay via Race Again; use Course Menu from pause/results to select an unlocked course. Pause/resume in a run. Unlocks persist locally if browser storage permits.

## Controls

Tilt left/right to steer. Tilt zero is calibrated to the first sensor reading after starting a race; start another run to recalibrate. Stale motion readings expire after one second. The large left/right touch buttons always work and override tilt while held, including on devices without sensors. Hold BRAKE to slow to 9 m/s; tap JUMP to clear rocks. Keyboard: left/right or A/D, down or S to brake, Space to jump, Escape to pause. Audio consists of short synthesized cues and starts only after user interaction.

## Limits

At 240 × 282, the touch controls overlay the bottom of the course; this is an arcade perspective rather than physically simulated 3D terrain. Orientation permission depends on browser policy; touch remains available. Browser localStorage can be disabled, in which case course unlocks last only for the session. Actual R1 sensor orientation, touch ergonomics and frame rate require on-device acceptance testing. This is a single-player offline game, not network racing.

## Tests

Run `npm test` (Node 18+). Tests cover procedural layouts, steering/braking, jump cooldown, collision single-counting, finish and medal logic. Run `npm run test:browser` after `npm install` and `npx playwright install chromium`. Headless Chromium was tested at exactly 240 × 282: menu, start, touch steering, jump, pause/resume, finish/results, and zero page errors. The test writes `screenshot-menu.png`, `screenshot-gameplay.png`, and `screenshot-results.png` in this directory. The result finish is fast-forwarded to exercise the screen; this does not establish human-play balance or R1 hardware compatibility.

## Credits

Original implementation and procedural geometry, scenery, character rendering, UI and Web Audio cues created for this project. The prior Alpine Reborn project was inspected for high-level downhill mechanics only; no artwork, source code, media or music was copied. Inspired by the downhill penguin arcade genre, not an official Tux Racer product. No third-party assets.
