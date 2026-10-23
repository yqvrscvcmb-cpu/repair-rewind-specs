# Repair Rewind native integration contract

Status: planned acceptance; no native result is implied. The five criteria in `design-brief.md` remain the required Preview checks. These details resolve animation/input edge cases identified by the independent source reviewer.

## Pose capture and selection

Capture numeric world position and quaternion values before moving or reparenting a part. The session engine copies each numeric field explicitly; the adapter should also construct plain values at the Lens boundary. Save the initial transforms separately for Reset. Every intent carries its displayed part identity.

Acceptance: translate and rotate the assembly parent, capture three parts, then move the Preview camera. Each saved pose and ghost remains at its original world pose. Compare synthetic transforms within 0.01 cm and 0.1 degrees; this tolerance is a software check, not physical tracking accuracy. Duplicate capture creates no fourth record. Capture and reassemble a different order as well as cover/ring/gear to prove sequence comes from observations.

## Animation and confirmation

Keep transient adapter stages separate from RepairSession: ready, moving-to-tray, moving-to-origin, awaiting-confirmation. Capture records once before motion. Return starts motion but does not confirm. Arrival reveals Confirm returned. A confirmation carries the part identity shown when that control was rendered; a repeated/stale event cannot confirm the next part.

Acceptance: rapid double capture records once; rapid double Return starts one motion; arrival leaves returnedCount unchanged; two gear confirmations return only gear. Wrong-part input changes neither state nor geometry. Disable conflicting commands while an animation is running.

## Pause at any stage

Pause freezes animation progress and remembers its adapter stage. Hide all guidance and action controls except Resume and the simulation label. Resume continues the same motion or confirmation stage without repeating a session mutation.

Acceptance: pause halfway through capture, halfway through return, and while awaiting confirmation. During a two-second pause, transforms, counts and captured poses do not change. Resume completes exactly one motion and never confirms automatically. Also test gear-confirmed → pause → resume-on-ring.

## Undo and reset

Undo mark restores the latest captured part and removes only its marker. Back reverses exactly the last confirmation, returns that part to its tray and makes it the sole pending target. Disable Back during movement or while a placement awaits confirmation. Keep Back available after completion. During any undo animation, capture, return, confirm and further undo actions are disabled; Pause and Reset remain available. Pause freezes the undo motion, and Reset cancels it after confirmation.

Reset requires the second confirmation described in the design brief. Confirming Reset cancels motion, invalidates pending callbacks through a generation token or equivalent cancellation mechanism, restores initial transforms, clears selection/guidance and resets session state. Cancelling Reset changes nothing; if its dialog is modal, freeze/resume transient animation without mutating the session.

Acceptance: confirm gear → Back → gear returns to tray and becomes active → replay once. Pause halfway through each undo motion: no transform changes for two seconds, then Resume finishes exactly once. Reset halfway through undo: after confirmation no pending callback survives. At completion Back reopens cover. Undo a gear capture and recapture it: exactly three records numbered 1–3. Cancel Reset without changes. Confirm Reset during an animation and wait beyond its longest duration: no old callback changes geometry or state. The next capture receives number 1.

## Spatial payoff and demo

Use shape, number and label together. Only the active part, destination and connecting arc receive emphasis. Keep the visible “Simulated assembly · session memory” label in every mode, including pause, completion and Reset confirmation. Never reposition a saved destination to keep it onscreen; use a small directional hint when outside view.

Acceptance: inspect real runtime captures before/after motion and after a short Preview camera move. At the intended standing view, the active part, destination and action are readable together. Paused captures contain no ghosts/arrows. Rehearse capture → reverse → interruption after gear → resume on ring → one Back → completion/reset within 2:15, leaving 15 seconds for learning and limitations in the planned 2:30 video.

## Evidence required

Run native TypeScript compilation and log checks through Lens Studio MCP. Execute LEAF scenarios serially, because each may reset the Preview. Save actual outputs and fresh runtime captures; distinguish assertions from observations. Record pass/fail/untested for each of the five original criteria. Node tests supplement these checks and cannot establish a working Lens, physical comfort or device tracking quality.
