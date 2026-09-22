# Line review — batch 3

All lines below are live in the JSON. Check a box once you've reviewed a
line as-is. For anything else, leave a note inline (edit the text, note
`CUT: reason`, or `CHANGE: what`) and I'll apply it to the matching pool.

Status legend: unchecked = not reviewed yet.

---

## Adama

**`BigRaiderEntered`** (priority normal, cooldown 30s)
- [ ] `adama-big-raider-entered-01` — "Big one inbound. Take it down!"
- [ ] `adama-big-raider-entered-02` — "That's not a standard Raider. Watch yourselves."
- [ ] `adama-big-raider-entered-03` — "Heavy contact. All Vipers, converge."
- [ ] `adama-big-raider-entered-04` — "That one's got teeth. Take it seriously."

**`CycleStarted`** (priority normal, cooldown 25s) — *cycle begins, hit every jump*
- [ ] `adama-cycle-started-01` (weight 3) — "Thirty-three seconds. Hold the line."
- [ ] `adama-cycle-started-02` (weight 2) — "Vipers away. Make it count."
- [ ] `adama-cycle-started-03` — "Thirty-three again. Let's beat the number this time."
- [ ] `adama-cycle-started-04` — "Analog and proud of it. Jump."
- [ ] `adama-cycle-started-05` — "Right on schedule. Vipers, launch."
- [ ] `adama-cycle-started-06` — "Another jump, another chance to earn it."
- [ ] `adama-cycle-started-07` — "Steady wings. Watch the fleet, not the glory."

**`ResurrectionShipMilestone`** (priority normal, cooldown 15s) — *fires at 75/50/25% resurrection ship integrity. Gaeta reports the numbers; Adama stays inspirational instead of repeating them*
- [ ] `adama-resurrection-ship-milestone-01` — "It's cracking. Keep the pressure on."
- [ ] `adama-resurrection-ship-milestone-02` — "She's hurting. Good hunting, Starbuck."
- [ ] `adama-resurrection-ship-milestone-03` — "Every hit counts. Don't let up now."

**`ResurrectionShipArrived`** (priority normal, cooldown 30s)
- [ ] `adama-resurrection-ship-arrived-01` — "Resurrection ship on the board. End it."
- [ ] `adama-resurrection-ship-arrived-02` — "There's their lifeline. Cut it."
- [ ] `adama-resurrection-ship-arrived-03` — "Factory's here. Kill it before it works."
- [ ] `adama-resurrection-ship-arrived-04` — "Focus fire. That ship doesn't get to help them."
- [ ] `adama-resurrection-ship-arrived-05` — "One target. Make it count."

**`ResurrectionShipDestroyed`** (priority normal, cooldown 30s)
- [ ] `adama-resurrection-ship-destroyed-01` — "One less door back for them."
- [ ] `adama-resurrection-ship-destroyed-02` — "Factory's down. Adama, out."
- [ ] `adama-resurrection-ship-destroyed-03` — "That's one less trick up their sleeve."
- [ ] `adama-resurrection-ship-destroyed-04` — "Good hit. Don't get comfortable."

**`RunWon`** (priority normal, cooldown 600s)
- [ ] `adama-run-won-01` — "The fleet's alive. So say we all."
- [ ] `adama-run-won-02` — "Everyone made it. That's the whole mission."
- [ ] `adama-run-won-03` — "We're still here. That's a good day."

**`SpecialUsed`** (priority normal, cooldown 40s) — *the Speech; Six also has a pool on this same trigger from earlier — both can fire on the same event*
- [ ] `adama-special-used-01` — "This is why we fight. Everybody, hold on."
- [ ] `adama-special-used-02` — "Give them everything we've got."
- [ ] `adama-special-used-03` — "For the fleet. All of it."
- [ ] `adama-special-used-04` — "No half measures today."
- [ ] `adama-special-used-05` — "This is what we trained for. Go."

**`FleetLost`** (priority normal, cooldown 600s) — *the defeat state*
- [ ] `adama-fleet-lost-01` — "We lost the fleet today. I won't forget it."
- [ ] `adama-fleet-lost-02` — "Every ship counted, and we still fell short."
- [ ] `adama-fleet-lost-03` — "This one's on me. Rest now."

**`ImaginarySixActive`** (priority flavor, cooldown 25s) — *"who are you talking to?" reaction; kept vague, no plot reveal*
- [ ] `adama-imaginary-six-active-01` — "Something on comms, Lieutenant?"
- [ ] `adama-imaginary-six-active-02` — "Keep the channel clear. Who's that?"
- [ ] `adama-imaginary-six-active-03` — "You're talking to yourself again."

---

## Starbuck

**`BigRaiderEntered`** (priority normal, cooldown 30s, **chance 0.3**) — *Adama's pool has no chance and always fires; this is her occasional aside on top*
- [ ] `starbuck-big-raider-entered-01` — "Nuggets, eyes open. This isn't a drill."

**`CycleStarted`** (priority normal, cooldown 20s, **chance 0.25**)
- [ ] `starbuck-cycle-started-01` (weight 2) — "Dibs on first kill."
- [ ] `starbuck-cycle-started-02` (weight 2) — "Try to keep up out there."
- [ ] `starbuck-cycle-started-03` — "Cylons again? I'm almost flattered."
- [ ] `starbuck-cycle-started-04` — "Bet you can't out-jump me today."
- [ ] `starbuck-cycle-started-05` — "Another 33. I was just getting comfortable."
- [ ] `starbuck-cycle-started-06` — "Somebody wake up the Raiders. I'm bored."
- [ ] `starbuck-cycle-started-07` — "Light a cigar. This won't take long."

**`MissileLaunched`** (priority flavor, cooldown 15s)
- [ ] `starbuck-missile-launched-01` (weight 2) — "Fox two. Try not to come back from that."
- [ ] `starbuck-missile-launched-02` (weight 2) — "Special delivery, right in the head."
- [ ] `starbuck-missile-launched-03` — "That's for the last one. And the one before."
- [ ] `starbuck-missile-launched-04` — "Incoming regret."
- [ ] `starbuck-missile-launched-05` — "Catch."
- [ ] `starbuck-missile-launched-06` — "Hope you weren't attached to that ship."
- [ ] `starbuck-missile-launched-07` — "One missile, zero apologies."
- [ ] `starbuck-missile-launched-08` — "That one's got your name on it. Not really."
- [ ] `starbuck-missile-launched-09` — "Frak off and stay off."
- [ ] `starbuck-missile-launched-10` — "Higher stakes than Triad, but I'll take it."

**`MultiKill`** (priority flavor, cooldown 15s)
- [ ] `starbuck-multi-kill-01` — "Wooooooooooooooooooooooooooooooo!"
- [ ] `starbuck-multi-kill-02` — "Frak yeah! Somebody get a spotter!"
- [ ] `starbuck-multi-kill-03` — "Three down before you blinked."
- [ ] `starbuck-multi-kill-04` — "Clean sweep. Try to keep count."
- [ ] `starbuck-multi-kill-05` — "Multiple confirmed. I'm just showing off now."

**`CloseCall`** (priority flavor, cooldown 15s)
- [ ] `starbuck-close-call-01` — "That one had my name on it. Missed."
- [ ] `starbuck-close-call-02` — "Too close. I'm counting that as a win."
- [ ] `starbuck-close-call-03` — "Okay, that one actually scared me a little."
- [ ] `starbuck-close-call-04` — "Nice try. Better luck next explosion."
- [ ] `starbuck-close-call-05` — "I felt that one. Didn't love it."

**`RaiderResurrected`** (priority flavor, cooldown 15s) — *covers both "first time" and "repeat offender"; no `when` key for a per-Raider kill count, so both flavors share one pool*
- [ ] `starbuck-raider-resurrected-01` — "Oh, you're back? Cute."
- [ ] `starbuck-raider-resurrected-02` — "Guess dying's not a deterrent anymore."
- [ ] `starbuck-raider-resurrected-03` — "You again? We really need to stop meeting like this."
- [ ] `starbuck-raider-resurrected-04` — "This guy just doesn't quit."
- [ ] `starbuck-raider-resurrected-05` — "Again? Didn't I see you before?"

**`ResurrectionShipDestroyed`** (priority normal, cooldown 30s)
- [ ] `starbuck-resurrection-ship-destroyed-01` — "Factory's closed. Try dying somewhere else."
- [ ] `starbuck-resurrection-ship-destroyed-02` — "Try coming back from that one."
- [ ] `starbuck-resurrection-ship-destroyed-03` — "Factory's toast. You're welcome."

---

## Gaeta

**`FtlSpoolProgress`** (priority critical, cooldown 10s) — *critical, hit every jump*
- [ ] `gaeta-ftl-spool-progress-01` (weight 2) — "Spool at {percent} percent. Course is clean."
- [ ] `gaeta-ftl-spool-progress-02` (weight 2) — "Jump solution plotted. {seconds} to go."
- [ ] `gaeta-ftl-spool-progress-03` — "Spooling steady. No surprises yet."
- [ ] `gaeta-ftl-spool-progress-04` — "Spool holding at {percent} percent."
- [ ] `gaeta-ftl-spool-progress-05` — "{seconds} seconds to jump. Numbers don't lie."
- [ ] `gaeta-ftl-spool-progress-06` — "Course plotted. Awaiting your order, sir."
- [ ] `gaeta-ftl-spool-progress-07` — "Spool nominal. I checked twice."
- [ ] `gaeta-ftl-spool-progress-08` — "{percent} percent and climbing steadily."
- [ ] `gaeta-ftl-spool-progress-09` — "Spool nominal. Also, I skipped lunch."

**`FleetHit`** (priority normal, cooldown 20s)
- [ ] `gaeta-fleet-hit-01` — "Civilian hull breach reported. Logging it."
- [ ] `gaeta-fleet-hit-02` — "Stray round, aft quarter. Noted."
- [ ] `gaeta-fleet-hit-03` — "Fleet took a hit. Damage report incoming."
- [ ] `gaeta-fleet-hit-04` — "Confirmed impact. Logging the time."

**`ResurrectionShipMilestone`** (priority normal, cooldown 15s) — *fires at 75/50/25% resurrection ship integrity; no dedicated `when` key for ship health, so `{percent}` covers all three checkpoints in one pool*
- [ ] `gaeta-resurrection-ship-milestone-01` — "Resurrection ship integrity at {percent} percent."
- [ ] `gaeta-resurrection-ship-milestone-02` — "Confirmed: {percent} percent structural integrity remaining."
- [ ] `gaeta-resurrection-ship-milestone-03` — "Down to {percent} percent. Recommend continued fire."

**`ImaginarySixActive`** (priority flavor, cooldown 25s) — *"who are you talking to?" reaction; kept vague, no plot reveal*
- [ ] `gaeta-imaginary-six-active-01` — "I'm not reading a second transponder. Just you."
- [ ] `gaeta-imaginary-six-active-02` — "No incoming signal on my end. Curious."
- [ ] `gaeta-imaginary-six-active-03` — "Confirmed: you're alone up there. Allegedly."

---

## Dualla

**`FtlSpoolProgress`** (priority critical, cooldown 10s) — *critical, hit every jump*
- [ ] `dualla-ftl-spool-progress-01` (weight 2) — "{count} of {total} ships ready to jump."
- [ ] `dualla-ftl-spool-progress-02` (weight 2) — "Last ship's always last. She'll make it."
- [ ] `dualla-ftl-spool-progress-03` — "All hands report ready. Mostly."
- [ ] `dualla-ftl-spool-progress-04` — "{count} of {total} report ready."
- [ ] `dualla-ftl-spool-progress-05` — "Fleet's spooling. Everyone's accounted for."
- [ ] `dualla-ftl-spool-progress-06` — "Readiness holding steady."
- [ ] `dualla-ftl-spool-progress-07` — "One ship still catching up. As always."
- [ ] `dualla-ftl-spool-progress-08` — "All ships report in. Jump when ready."

**`FleetHit`** (priority normal, cooldown 20s)
- [ ] `dualla-fleet-hit-01` — "We took a hit. Casualties being counted."
- [ ] `dualla-fleet-hit-02` — "Minor damage reported. Nobody panic."
- [ ] `dualla-fleet-hit-03` — "We're patched. Moving on."
- [ ] `dualla-fleet-hit-04` — "Hit confirmed. Crews responding."

---

## Tigh *(cameo)*

**`FleetHit`** (priority flavor, cooldown 25s)
- [ ] `tigh-fleet-hit-01` — "Somebody's filing a report on this."
- [ ] `tigh-fleet-hit-02` — "That's coming out of somebody's pay."
- [ ] `tigh-fleet-hit-03` — "Vipers. Always the Vipers."
- [ ] `tigh-fleet-hit-04` — "I've dealt with worse before breakfast."
- [ ] `tigh-fleet-hit-05` — "Frak, that's gonna leave a mark."
- [ ] `tigh-fleet-hit-06` — "Gods-frakking-damnit, Starbuck!"
- [ ] `tigh-fleet-hit-07` — "Frakking hell, Starbuck, watch your six!"
- [ ] `tigh-fleet-hit-08` — "That was avoidable, Kara. Frakking avoidable."

**`CycleRecovering`** (priority flavor, cooldown 25s)
- [ ] `tigh-cycle-recovering-01` — "Thirty-three seconds isn't a nap. Move."
- [ ] `tigh-cycle-recovering-02` — "Paperwork doesn't file itself. Move it."
- [ ] `tigh-cycle-recovering-03` — "Thirty-three seconds. Not a coffee break."
- [ ] `tigh-cycle-recovering-04` — "This job needs a stiff drink. Later."
- [ ] `tigh-cycle-recovering-05` — "The Old Man says move. So move."
- [ ] `tigh-cycle-recovering-06` — "Starbuck, if you break another wing I swear to the gods—"
- [ ] `tigh-cycle-recovering-07` — "Frakking patience, Thrace. That's all I ask."

**`HullLow`** (priority normal, cooldown 25s)
- [ ] `tigh-hull-low-01` — "Hull's thin. Watch yourself out there."
- [ ] `tigh-hull-low-02` — "We're running low on ship. Land it careful."
- [ ] `tigh-hull-low-03` — "Damage control's stretched thin. Don't test it."
- [ ] `tigh-hull-low-04` — "Hull integrity's dropping. I don't like the numbers."
- [ ] `tigh-hull-low-05` — "We're patched together with hope at this point."
- [ ] `tigh-hull-low-06` — "Starbuck, ease up before you gods-damned kill us."
- [ ] `tigh-hull-low-07` — "Frak me, this hull's had enough of your stunts, Starbuck."

**`KillDrought`** (priority flavor, cooldown 25s)
- [ ] `tigh-kill-drought-01` — "You planning on shooting something today, Starbuck?"
- [ ] `tigh-kill-drought-02` — "Frak, are they hiding from you now?"
- [ ] `tigh-kill-drought-03` — "That's a long dry spell up there."
- [ ] `tigh-kill-drought-04` — "Something wrong with the trigger, Lieutenant?"
- [ ] `tigh-kill-drought-05` — "Kids these days can't hit the broad side of a Battlestar."

**`ImaginarySixActive`** (priority flavor, cooldown 25s) — *"who are you talking to?" reaction; kept vague, no plot reveal*
- [ ] `tigh-imaginary-six-active-01` — "Who in the frak are you talking to?"
- [ ] `tigh-imaginary-six-active-02` — "That did it. Starbuck finally lost it."
- [ ] `tigh-imaginary-six-active-03` — "You feeling alright up there?"

---

## Baltar *(cameo — general panic)*

**`FleetHit`** (priority flavor, cooldown 25s)
- [ ] `baltar-fleet-hit-01` — "We're hit? We're hit. Is it bad? Don't answer."
- [ ] `baltar-fleet-hit-02` — "Is that smoke? That's probably fine."
- [ ] `baltar-fleet-hit-03` — "I did not sign up for structural damage."
- [ ] `baltar-fleet-hit-04` — "My Cylon detector would never see THIS coming."
- [ ] `baltar-fleet-hit-05` — "Frak. Frak. Also, frak."
- [ ] `baltar-fleet-hit-06` — "I demand a committee!"
- [ ] `baltar-fleet-hit-07` — "It's not me, I swear! I didn't do it!"
- [ ] `baltar-fleet-hit-08` — "I demand a proper investigation!!"

**`ResurrectionShipArrived`** (priority normal, cooldown 30s)
- [ ] `baltar-resurrection-ship-arrived-01` — "That thing again. Has anyone tried asking nicely?"
- [ ] `baltar-resurrection-ship-arrived-02` — "Oh, it's back. Wonderful. Just wonderful."
- [ ] `baltar-resurrection-ship-arrived-03` — "Has anyone considered diplomacy? No? Fine."
- [ ] `baltar-resurrection-ship-arrived-04` — "In my professional opinion, we should leave. Immediately."
- [ ] `baltar-resurrection-ship-arrived-05` — "Statistically, everyone panics. I'm just early."
- [ ] `baltar-resurrection-ship-arrived-06` — "Could we vote on ignoring it?"

**`UpgradeOffered`** (priority normal, cooldown 20s) — *one pool per card, each with `when: { "upgrade": "<id>" }`*
- [ ] `baltar-upgrade-offered-01` (accidentally-wide) — "I become a bigger target. Fantastic design choice."
- [ ] `baltar-upgrade-offered-02` (anyone-could-be-a-cylon) — "Die, come back, no paperwork. I could use that policy."
- [ ] `baltar-upgrade-offered-03` (bootleg-hooch) — "Faster trigger, slower ship. Sounds like most of my mornings."
- [ ] `baltar-upgrade-offered-04` (continuity-of-government) — "Ten percent less panic per stack. I'll take it."
- [ ] `baltar-upgrade-offered-05` (flak-enthusiast) — "Galactica catches the small stuff. I remain unconvinced about the rest."
- [ ] `baltar-upgrade-offered-06` (hangar-door-slam) — "Hit them while the doors are open. Rude, but effective."
- [ ] `baltar-upgrade-offered-07` (imaginary-six) — "An invisible ally? I have... complicated feelings about that."
- [ ] `baltar-upgrade-offered-08` (raptor-escort) — "Someone else catching fire for once. I approve."
- [ ] `baltar-upgrade-offered-09` (overcompensating-cannon) — "Slow and enormous. I relate to this weapon on a personal level."
- [ ] `baltar-upgrade-offered-10` (personal-vendetta) — "The missile has a grudge. I understand grudges."
- [ ] `baltar-upgrade-offered-11` (your-call-is-important-to-us) — "A slower queue. Somewhere, a Cylon is on hold music."
- [ ] `baltar-upgrade-offered-12` (spoilers) — "Knowing where they land? I do love being right in advance."

---

## Roslin *(cameo — general strategy)*

**`ResurrectionShipArrived`** (priority normal, cooldown 30s)
- [ ] `roslin-resurrection-ship-arrived-01` — "Destroy the ship, and we buy real time."
- [ ] `roslin-resurrection-ship-arrived-02` — "Take it down before it multiplies the problem."
- [ ] `roslin-resurrection-ship-arrived-03` — "One factory. One priority."
- [ ] `roslin-resurrection-ship-arrived-04` — "I taught grade school. This is somehow calmer."
- [ ] `roslin-resurrection-ship-arrived-05` — "Every ship we down without it is a mercy."
- [ ] `roslin-resurrection-ship-arrived-06` — "Send the Vipers. This one doesn't get to finish."

**`RunWon`** (priority normal, cooldown 600s)
- [ ] `roslin-run-won-01` — "We live to jump again. That's the whole plan."
- [ ] `roslin-run-won-02` — "The fleet holds. That's the only vote that matters."
- [ ] `roslin-run-won-03` — "Not bad, for the forty-third in line."

**`UpgradeOffered`** (priority normal, cooldown 20s) — *one pool per card, each with `when: { "upgrade": "<id>" }`*
- [ ] `roslin-upgrade-offered-01` (accidentally-wide) — "More of you to hit means less fleet exposed. Fair trade."
- [ ] `roslin-upgrade-offered-02` (anyone-could-be-a-cylon) — "A second chance costs an eye. Spend it wisely."
- [ ] `roslin-upgrade-offered-03` (bootleg-hooch) — "Speed for accuracy. You will not outrun trouble now."
- [ ] `roslin-upgrade-offered-04` (continuity-of-government) — "The fleet absorbs less. That is the whole point of government."
- [ ] `roslin-upgrade-offered-05` (flak-enthusiast) — "Let the guns handle what they can. Cover what they can't."
- [ ] `roslin-upgrade-offered-06` (hangar-door-slam) — "Strike while it's vulnerable. That's not luck, that's timing."
- [ ] `roslin-upgrade-offered-07` (imaginary-six) — "If she's protecting the fleet, I won't ask who she is."
- [ ] `roslin-upgrade-offered-08` (raptor-escort) — "They'll peel off eventually. Watch for it."
- [ ] `roslin-upgrade-offered-09` (overcompensating-cannon) — "Lead your shots. It will not wait for you."
- [ ] `roslin-upgrade-offered-10` (personal-vendetta) — "Escorts will still catch some. Position for the rest."
- [ ] `roslin-upgrade-offered-11` (your-call-is-important-to-us) — "Every extra second is a quieter sky. Take it."
- [ ] `roslin-upgrade-offered-12` (spoilers) — "Knowing the next move is worth more than another gun."

---

## Tyrol

**`CycleRecovering`** (priority flavor, cooldown 20s) — *standalone bark, separate from the scene beats below*
- [ ] `tyrol-cycle-recovering-01` — "Thirty-three seconds to patch a hull. Sure. Why not."
- [ ] `tyrol-cycle-recovering-02` — "Nothing's on fire. I don't trust it."
- [ ] `tyrol-cycle-recovering-03` — "Give me thirty-three seconds and a miracle."
- [ ] `tyrol-cycle-recovering-04` — "Hull's holding. Don't test it."
- [ ] `tyrol-cycle-recovering-05` — "I fix ships, not luck. Both are running low."
- [ ] `tyrol-cycle-recovering-06` — "Duct tape and prayer. In that order."
- [ ] `tyrol-cycle-recovering-07` — "Chief by title. Miracle worker by necessity."

---

## Six

**`SpecialUsed`** (priority flavor, cooldown 40s)
- [ ] `six-special-used-01` — "You didn't need me for that. But I liked watching."
- [ ] `six-special-used-02` — "You didn't need to hear that from me. But here we are."
- [ ] `six-special-used-03` — "Careful. That almost looked like faith."
- [ ] `six-special-used-04` — "Everything happens for a reason. Mine, usually."
- [ ] `six-special-used-05` — "You can thank the red dress later."

**Wired:** Tigh, Adama, and Gaeta already have `ImaginarySixActive` lines. The game says one of them once each time she appears, after the louder line has finished.

---

## Recovering scenes

**Scene: `scene-recover-clean-01`** — damage band: clean
- [ ] tyrol: "Not a scratch. I'm almost disappointed."
- [ ] adama: "Take the win, Chief."
- [ ] dualla: "Next jump in thirty-three."

**Scene: `scene-recover-rough-01`** — damage band: rough
- [ ] tyrol: "Patching what I can. Give me the thirty-three."
- [ ] tigh: "Vipers held. Barely counts as good news."
- [ ] dualla: "Fleet's regrouping. Jump's coming."

**Scene: `scene-recover-wrecked-01`** — damage band: wrecked
- [ ] tyrol: "This is not patching. This is prayer."
- [ ] adama: "Do what you can, Chief. That's all I ask."
- [ ] gaeta: "Sure hope you count right, Starbuck."
- [ ] dualla: "Thirty-three seconds. Brace."

---

## Title screen

**Body (fixed, shown every visit)**
- [ ] "Every thirty-three seconds, the fleet jumps. Every thirty-three
  seconds, you keep them alive."
- [ ] "Fly the line. Pick your upgrades. Don't overthink the eye."

**Disclaimer (fixed)**
- [ ] "Unofficial fan project. Not affiliated with or endorsed by the show's
  rights holders or anyone in the cast."

**Quotes (random pool, one shown per visit)**
- [ ] "Thirty-three seconds. Try not to die of pride."
- [ ] "The paperwork survives. Nothing else is guaranteed."
- [ ] "Resurrection ships: like exes, but louder."
- [ ] "Every pilot thinks they're the exception. Fly anyway."
- [ ] "The fleet remembers every ship that almost made it."
- [ ] "Somewhere, Tyrol is already judging your landing."

---

## Batch totals

| Speaker | Lines in JSON | Triggers covered |
|---|---|---|
| Adama | 37 | BigRaiderEntered, CycleStarted, FleetLost, ImaginarySixActive, ResurrectionShipArrived, ResurrectionShipDestroyed, ResurrectionShipMilestone, RunWon, SpecialUsed |
| Starbuck | 36 | BigRaiderEntered, CloseCall, CycleStarted, MissileLaunched, MultiKill, RaiderResurrected, ResurrectionShipDestroyed |
| Gaeta | 19 | FtlSpoolProgress, FleetHit, ImaginarySixActive, ResurrectionShipMilestone |
| Dualla | 12 | FtlSpoolProgress, FleetHit |
| Tigh | 30 | CycleRecovering, FleetHit, HullLow, ImaginarySixActive, KillDrought |
| Baltar | 26 | FleetHit, ResurrectionShipArrived, UpgradeOffered (12 cards) |
| Roslin | 21 | ResurrectionShipArrived, RunWon, UpgradeOffered (12 cards) |
| Tyrol | 7 | CycleRecovering |
| Six | 5 | SpecialUsed |
| Scenes | 3 (10 beats) | CycleRecovering |
| Title | 6 quotes + fixed body/disclaimer | — |

**Total spoken lines in JSON: 193**

**Missing triggers:** none. Every trigger listed in the schema now has at
least one pool across the project.
