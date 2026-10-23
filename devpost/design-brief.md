---
status: draft
---

# Design brief: Repair Rewind

**Remember how it came apart.**

Planning provenance: prepared using the official Devpost `plan-lens` template and both design references. The user selected “Repair companion: remember and reverse disassembly” and delegated the remaining engineering choices: “Jij bent de engineer. Maak het passend voor het project doel.” The details below are engineer-selected defaults, not invented interview answers. This is an actionable engineering draft; the full guided interview and final brief sign-off have not been claimed. Native construction has now run through the live Lens Studio MCP route; final acceptance remains separate and is tracked in the build report.

## The one spatial moment

After an interruption, you look down at a disassembled object. The next part to return lights up in its tray; a quiet arc connects it to a numbered ghost at the exact original location you recorded. Return it, confirm, and the next breadcrumb appears. Your own actions provide the sequence.

## Why it belongs on glasses
- Uses: draws in the world and leaves your hands available between brief pinches. Explicit marking ties the view to the workpiece; camera recognition is not claimed.
- Why it is better than a phone or laptop version: part, destination and order appear beside the physical task rather than requiring a switch to a photo or checklist. The device-specific comfort benefit remains untested until real-glasses evaluation.

## Product or overlay
- Type: overlay supporting disassembly and reassembly; the first preview uses an obvious simulated workpiece.
- What the real version would sense: user-selected part locations and user confirmations. Automatic recognition is a later research question, not an MVP dependency.
- Stand-in for the preview: a visibly virtual, disconnected mechanical teaching assembly with a cover, retaining ring and gear on a small table. Selecting a part and pressing **Remember & lift** explicitly records its original pose, then moves its model into a tray. This is not recognition or observation of a real removal.
- Keep **Simulated assembly · session memory** visible near the workpiece throughout the demo.

## Where things live
- The user looks slightly down at the workpiece and tray, not at a face-fixed dashboard.
- Workpiece: approximately 22 × 16 cm (default), centered about 90 cm in front of the initial view and 25 cm below eye level (default). The CLAD builder must inspect the selected preview environment before choosing the final world transform.
- Tray: about 24 × 16 cm (default), just right of the workpiece with a clear gap. All parts and the current target should fit within the main viewing area; reduce lateral spread if capture review shows clipping.
- Origin markers: numbered outlines, roughly 4 cm across (default), anchored to recorded world-space poses. Use shape, number and label together.
- Step prompt: one compact line, immediately above the current destination, maximum two lines at readable scale.
- Controls: two or three large UIKit pinch targets at a time, at least 6 cm wide (default), below the workpiece and within comfortable reach.
- Palette: warm white text, cyan recording cues, amber return cues; no dark backdrop required for legibility. Colors supplement the numbered shape cues.

## Hands and input
- Select a part: standard SIK pinch on its generous target; highlight on hover/aim.
- **Remember & lift**: capture a copied original position and orientation, assign a step number, then animate that part into its tray location. Disable capture for a part already recorded.
- **Undo mark**: remove only the latest observation and restore that simulated part, before reassembly begins.
- **Reassemble**: available after at least one recorded part; start with the latest recorded part.
- **Return this part**: in the simulated demo, animate the active part back. After the animation, show **Confirm returned**. The confirmation is explicit user input, not proof of physical correctness.
- **Back**: undo the last confirmation; restore that part to the pending state without losing its original pose.
- **Pause / Resume**: hide guidance and show one small resume control. Preserve the active step in memory only while this Lens session remains open.
- **Reset**: require a clear second confirmation in the UI before clearing all observations and returning the simulated assembly to its starting arrangement.
- Targets are big and highlight when aimed at. Guard buttons against repeated activations during transitions.
- Voice: none in the first build. All actions must work with mouse-driven pinch in Interactive Preview.

## When things show
- Recording: show the selected part and one capture control; existing numbered origin marks remain subdued.
- Reassembly: only the active part, its original ghost pose and connecting arc receive emphasis. Previously returned parts lose guidance.
- Paused: hide all arrows, prompts and ghosts; retain only Resume and the simulation label.
- Complete: show a brief “All recorded parts returned” message, then leave the object unobstructed with a Reset option.
- Invalid action: explain the immediate issue next to the control; do not advance the state.
- If the active target leaves view: a small edge hint points toward it. Never silently move an anchored destination to keep it visible.
- If future tracking becomes unreliable: pause guidance and request re-marking; never claim a stale anchor is exact. This is not a validated device feature in the preview MVP.

## Done criteria
Each one must be checked in Lens Studio's preview. Node tests alone cannot satisfy these criteria.
1. Capture cover, ring and gear. Three distinct numbered origin markers remain where the parts began; all parts move to distinct tray positions. Duplicate capture adds no fourth record.
2. Choose Reassemble. The active targets appear in reverse recorded order, **gear → ring → cover**. At each step, only that part and its original ghost position are emphasized. A wrong-part interaction cannot advance the sequence.
3. Pause after returning the gear, then Resume. Guidance disappears while paused and resumes on the ring without losing the recorded sequence or origin poses.
4. Confirm a return, press Back, and confirm again. Exactly one step is restored and replayed. Complete all three, then reset with confirmation: no old breadcrumbs or completion count survive.
5. Walk around the assembly in Interactive Preview. Markers stay at their recorded locations; labels remain readable; the simulation label remains present; every action can be performed with the mouse and standard SIK interaction.

## Out of scope
- Live object identification, camera interpretation, always-on recording or cloud model calls.
- Memory across Lens restarts, persistent anchors or automatic relocalization.
- Repair diagnosis, torque recommendations, safety guarantees or guessing unrecorded actions.
- Live electrical, pressurized, automotive, medical or other safety-critical repairs.
- Multiplayer, custom two-hand gestures, voice-only actions, account/backend features.

## Risks and open questions
- Remember & lift is an explicit preview stand-in. The real-world interaction for marking a tiny part remains to be tested on glasses.
- Placement and return confirmations prove the prototype's logic, not that a physical repair is correct.
- Large panels, excessive lateral spread and bright clutter may obscure the workpiece. Test captures at the intended viewing position and reduce UI if needed.
- Real hand tracking, comfort over time and anchor stability remain **feel unproven**.
- The project has been built and exercised through the native CLAD/MCP route. Final acceptance still requires closing the independent review findings and mapping actual evidence to every criterion; installation or compilation alone cannot establish that outcome.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
