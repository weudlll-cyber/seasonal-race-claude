// ============================================================
// File:        controlInfo.js
// Path:        client/src/screens/DevScreen/sections/controlInfo.js
// Project:     RaceArena — DEVSCREEN-CHAPTERS-1
// Created:     2026-10-05
// Description: The info text of every Dev Screen control, keyed by its control id
//              ("<section file>:<identity>", the same string the control carries as
//              data-control-id). ONE HOME for these texts: each section renders its tooltip
//              from here, and the chapter guard test holds this map, the rendered screen and
//              the design table (reports/evolution/DEVSCREEN-CHAPTERS-1/design.json) to one
//              another. Copied from that table, text for text; no text states a config value —
//              where a reader needs the live value, the control's own read-out shows it.
// ============================================================

export const CONTROL_INFO = {
  'RaceDefaults:raceActionStage':
    'How eventful the racing is. Quiet is the shipped race. Medium and Wild push the front fight harder — the same fair finish, more of a contest getting there. The stage you pick here is stored with each race, so the result screen can tell you which one ran.',
  'RaceDefaults:duration':
    "Pre-fills the Duration field in Race Setup. The value that actually runs a race is derived by the track — closed tracks from laps and course length, open tracks from the setup slider or the track's own default — so this seed is not read once a race starts.",
  'RaceDefaults:winners':
    'How many top finishers the result screen celebrates as winners. Raise it and more places get a podium treatment; lower it and only the very front is honoured. Race Setup starts from this number and you can still change it per race.',
  'RaceDefaults:maxPlayersClosed':
    'The most player names Race Setup accepts for a closed-loop track. It is the only limit on field size for those tracks; a larger field is refused at setup, a smaller one is never padded.',
  'RaceDefaults:maxPlayersOpen':
    'The most player names Race Setup accepts for an open, start-to-finish track. Open tracks hold larger fields than closed ones, which is why the two limits are separate.',
  'RaceDefaults:handleReset':
    'Puts every race default back to the shipped values — including the two that now sit in other chapters: “Go to the results on its own” (Camera, Ending) and “Sound effects” (Look, Sound). Nothing else on the screen is touched.',
  'RaceTuningSection:handleReset':
    'Puts every tuning value below it in this chapter back to shipped — not the race defaults above: speed, start layout, auto-scale, re-rolls, race plan, the mid-race contest, the gap brake and racer behaviour. Camera, look and smoothness settings are not touched. Use it when races feel wrong and you no longer know what was changed.',
  'DynamicsTuningSection:reset-normal-speed': 'Puts the normal track speed back to shipped.',
  'DynamicsTuningSection:normalSpeedPxPerSec':
    'How far a normal racer travels per second, the same on every track and for every racer type. It is the one pace control: every race duration in the game is derived from it, so raising it makes every race shorter and faster to watch.',
  'DynamicsTuningSection:reset-speed-range':
    'Puts the slowest and fastest base speed back to shipped.',
  'DynamicsTuningSection:min':
    'The slowest base speed a racer can be dealt. Lower it and the field strings out more, with the back markers falling further behind; the spread preview below shows the effect on a closed track.',
  'DynamicsTuningSection:max':
    'The fastest base speed a racer can be dealt. Raise it and the quickest racers pull further ahead; it must stay above Min Speed.',
  'BehaviorTuningSection:enabled':
    'Master switch for how racers react to each other. Off: racers run on their own lines with no avoidance and no slipstream, and every setting below in this group stops acting. On: the settings below apply.',
  'BehaviorTuningSection:reset-drafting': 'Puts the three slipstream settings back to shipped.',
  'BehaviorTuningSection:draftingMaxDistance':
    'How close behind another racer a racer must be to get the slipstream boost. Raise it and drafting works from further back and more racers benefit; lower it and only a tight follower gets the push.',
  'BehaviorTuningSection:draftingConeAngle':
    'How wide the slipstream zone behind each racer is. Wider means drafting still works when a follower is off to the side, for example on a bend; narrower means only a racer straight behind is pulled along.',
  'BehaviorTuningSection:draftingBoost':
    'How strong the slipstream push is. Stronger makes overtakes on the straight easier to see but can glue whole packs together into a peloton; weaker keeps the field looser.',
  'BehaviorTuningSection:reset-comfort-zone': 'Puts the comfort-zone settings back to shipped.',
  'BehaviorTuningSection:comfortThreshold':
    'How early a racer reacts when another racer comes close. Higher = racers stay further apart, more spacious feel. Lower = racers tolerate close racing, denser packs.',
  'BehaviorTuningSection:softRepulsionStrength':
    'How forcefully racers move away when crowded. Higher = visible swerve when crowded. Lower = subtle drift, racers barely react.',
  'BehaviorTuningSection:reset-soft-avoidance':
    'Puts the avoidance buffer and maximum sideways step back to shipped.',
  'BehaviorTuningSection:avoidanceBufferPct':
    'How early racers start steering apart before their bodies would touch, as a share of body size. Larger keeps more air between racers; smaller lets them come very close before anything pushes them apart.',
  'BehaviorTuningSection:maxLateral':
    'Maximum sideways position deviation allowed during avoidance. Caps how far a racer can swerve from their lane to dodge another.',
  'BehaviorTuningSection:reset-speed-brake': 'Puts the speed-brake warm-up back to shipped.',
  'BehaviorTuningSection:avoidanceWarmupMs':
    'Open tracks only. How long after the gun the brake behind a slower racer takes to reach full strength, which gives back-row racers a window to pass. Zero means full braking from the first moment.',
  'BehaviorTuningSection:reset-look-before-brake':
    'Puts all seven look-before-you-brake settings back to shipped.',
  'BehaviorTuningSection:lookBeforeBrakeEnabled':
    'On: a racer that catches a slower one and sees a free lane beside it moves over early and passes at speed. Off: it always brakes first behind a slower racer in its lane. Either way racers never overlap.',
  'BehaviorTuningSection:lookBeforeBrakePassStrength':
    'How decisively a racer swerves into the free lane while passing. Higher = snappier, clears the slower racer sooner (more likely to pass at speed). Lower = gentler, and if it cannot clear in time the brake re-engages. Much stronger than the general Soft Steering spring by design.',
  'BehaviorTuningSection:lookBeforeBrakeReengageTMultiplier':
    'How much room a passing racer keeps before the brake comes back if it has not yet cleared into the free lane. Larger brings the brake back earlier — safer, fewer passes; smaller lets the racer commit longer to the pass.',
  'BehaviorTuningSection:maxLateralSpeedPerStep':
    'A cap on how fast any racer may move sideways, for dodging out and moving back alike. Lower gives a smooth glide instead of a sudden sideways jump, but racers must start dodging earlier and may brake and wait more.',
  'BehaviorTuningSection:lookBeforeBrakeLagFrames':
    'Extra safety lead the brake keeps because it acts one frame after it is decided. It is the guarantee that a racer that fails to get past still brakes in time and never overlaps; lowering it trades that safety for more passes.',
  'BehaviorTuningSection:lookBeforeBrakeRequireSlowerLeader':
    'On: a racer only takes a free lane when the racer ahead is genuinely slower, so nobody weaves around traffic of the same speed. Off: any racer in the brake zone may switch lanes.',
  'BehaviorTuningSection:lookBeforeBrakeMinDifferential':
    'How much faster a racer must be than the one ahead before it takes a free lane. Higher means only clearly faster racers pass, so the midfield weaves less; lower means more lane changes.',
  'BehaviorTuningSection:reset-soft-steering':
    'Puts the four soft-steering settings back to shipped.',
  'BehaviorTuningSection:softSteeringSymmetric':
    'Off: when two racers meet, only the one behind steers around; the one ahead holds its line. On: both steer away from each other. You see either one racer moving aside or both parting.',
  'BehaviorTuningSection:softSteeringStrength':
    'How quickly a racer moves toward the sideways position it is aiming for. Higher is snappier steering; lower is a gentler drift.',
  'BehaviorTuningSection:softSteeringClearancePct':
    'How much extra gap a racer aims to leave beside an obstacle, beyond just touching it. More clearance means wider, more visible passes.',
  'BehaviorTuningSection:softSteeringHysteresisY':
    'A dead zone around the obstacle’s line inside which a racer keeps the side it already chose. It stops a racer swinging left and right when it sits almost exactly behind another.',
  'DynamicsTuningSection:reset-row-start': 'Puts the three starting-row settings back to shipped.',
  'DynamicsTuningSection:rowGapMultiplier':
    'How much space is between starting rows. Higher = rows further apart, more spread out start. Lower = rows tightly packed, more compact start.',
  'DynamicsTuningSection:speedBonusFactor':
    'How much extra speed back-row racers get to make up for starting further back. Full compensation gives every row a fair chance; none gives the front row a clear advantage.',
  'DynamicsTuningSection:maxCapacityFactor':
    'How wide the starting rows are — controls how many racers fit in each row before adding another row. Higher = wider rows, fewer rows total. Lower = narrower rows, more rows.',
  'BehaviorTuningSection:reset-start-layout':
    'Puts the start spread and the run-out zone back to shipped.',
  'BehaviorTuningSection:startSpreadRange':
    'How spread out racers are at the starting line, relative to the track. Higher = racers start more spread out across the track. Lower = racers start in a tighter cluster.',
  'BehaviorTuningSection:runoutZone':
    'How much track is kept beyond the finish line for finishers to coast into. More room lets the finish breathe; less ends the race more abruptly at the line. It sits here because it shares a reset with the start spread.',
  'AutoScaleSection:handleReset': 'Puts the five auto-scale settings back to shipped.',
  'AutoScaleSection:enabled':
    'On: racer size adapts to each race, from the track’s width and the number of racers, which also changes how the starting grid is laid out. Off: every racer is drawn at its type’s own size. A size set for a racer type in its editor always wins.',
  'AutoScaleSection:referenceValue':
    'The track-width-per-racer at which racers are drawn at their normal size. A race with more room per racer than this draws them larger; a crowded race draws them smaller.',
  'AutoScaleSection:minScale':
    'The smallest racers may be shrunk to on a crowded track, as a share of their normal size.',
  'AutoScaleSection:maxScale':
    'The largest racers may be grown to on a roomy track, as a multiple of their normal size.',
  'AutoScaleSection:minTargetScreenPx':
    'The size floor every racer type starts from in the racer editor (Tracks, racers, brands and groups → Racer types); a type with its own floor keeps it. This is the setting for every type, not the per-type one, although both are stored under the same name. Neither changes the race picture: the floor the race draws with is “Minimum racer size (% of frame)” under Look, labels and effects.',
  'AutoScaleSection:setPreviewWidth':
    'Try-out only, nothing is saved: enter a track width to see the scale the settings above would give.',
  'AutoScaleSection:setPreviewRacers':
    'Try-out only, nothing is saved: enter a number of racers to see the scale the settings above would give.',
  'DynamicsTuningSection:reset-speed-reroll': 'Puts the five re-roll settings back to shipped.',
  'DynamicsTuningSection:reRollVariationPercent':
    "How much a racer's speed can change per re-roll. Higher = dramatic position changes, faster races and slower races mix things up. Lower = subtle shifts, more predictable order.",
  'DynamicsTuningSection:reRollTransitionDuration':
    'How smoothly the speed change happens (in seconds). Higher = cinematic slow shifts, looks dramatic. Lower = snappy reactive changes, feels more dynamic.',
  'DynamicsTuningSection:trajectoryTransitionDuration':
    'How smoothly Race Plan changes speed (controller transitions). Lower = snappier corrections, higher = gentler but slower rank adjustments.',
  'DynamicsTuningSection:reRollIntervalDivisor':
    'How often racers are dealt a new speed during a race. Lower values mean more frequent changes and a more chaotic order; higher values mean fewer changes and calmer racing.',
  'DynamicsTuningSection:reRollLastPositionPercent':
    'When during the race the last re-roll happens, as percentage of race duration. Higher = action keeps changing right until near the end. Lower = a calm final stretch where the leader can hold their position.',
  'DynamicsTuningSection:reset-gap-reroll':
    'Puts the gap re-roll switch, its gap, strength, mode and marker back to shipped.',
  'DynamicsTuningSection:gapRerollEnabled':
    'Master switch for the gap re-roll: when a racer gets too far from its neighbour, its next speed draws are nudged to close the gap. On keeps the field together; off lets gaps grow freely.',
  'DynamicsTuningSection:gapRerollThresholdLengths':
    'How big a gap to the neighbour, in racer lengths, before the re-roll starts nudging. Smaller acts sooner and keeps the field tighter; larger lets racers drift apart further first.',
  'DynamicsTuningSection:gapRerollStrength':
    'How hard one nudge pulls. Stronger corrections close gaps faster but can be seen as braking; gentler ones close them over many small steps.',
  'DynamicsTuningSection:gapRerollMode':
    'Symmetric: the racer who escaped is slowed and the racer who dropped back is helped, pulling both ends toward the pack. Down-only: only the escapee is slowed.',
  'DynamicsTuningSection:gapRerollDevMarker':
    'A drawing aid only: a ring flashes on a racer at the moment its re-roll is nudged, so you can see where the gap re-roll acts. It does not change the race; it sits here, beside its mechanism, because it is stored with the race settings.',
  'DynamicsTuningSection:reset-race-plan-bonus':
    'Puts the six race-plan timing and bonus settings back to shipped.',
  'DynamicsTuningSection:racePlanBonusStrengthMultiplier':
    'Scales the speed bonus the race plan gives racers who are behind where they should be. Higher makes the planned order assert itself sooner; lower leaves more to chance.',
  'DynamicsTuningSection:racePlanBonusTransitionEnd':
    'The area speed bonus is applied at full strength from race start until this point, then fades out over the Bonus fade duration.',
  'DynamicsTuningSection:racePlanBonusFadeDuration':
    'How long the area bonus takes to fade out completely after “Bonus active until”. Longer fades are invisible; short ones can show as a sudden change of pace.',
  'DynamicsTuningSection:racePlanCorridorStart':
    'The trajectory P-controller (OUTCOME phase) becomes active at this point and pushes each racer toward their assigned target rank.',
  'DynamicsTuningSection:racePlanCorridorEnd':
    'The point in the race where the controller stops steering racers toward their planned places and the final stretch runs free. It can never come before the start above; moving it earlier pulls the start with it.',
  'DynamicsTuningSection:racePlanMinDurationSec':
    'Races shorter than this run on raw physics with no race plan at all — no planned order and no fairness steering.',
  'DynamicsTuningSection:reset-phase-split':
    'Puts the phase-split switch and its four per-phase strengths back to shipped.',
  'DynamicsTuningSection:phaseSplitBonusEnabled':
    'Off: the area and row bonuses run at full strength all race. On: their strength follows the per-phase values below, early and late separately.',
  'DynamicsTuningSection:areaBonusEarly':
    'Strength of the area speed bonus in the early part of the race, when phase-split bonuses are on. Zero switches it off for that phase.',
  'DynamicsTuningSection:areaBonusPost':
    'Strength of the area speed bonus after the mid-race contest, when phase-split bonuses are on. Zero switches it off for that phase.',
  'DynamicsTuningSection:rowBonusEarly':
    'Strength of the back-row catch-up bonus in the early part of the race, when phase-split bonuses are on.',
  'DynamicsTuningSection:rowBonusPost':
    'Strength of the back-row catch-up bonus after the mid-race contest, when phase-split bonuses are on.',
  'DynamicsTuningSection:reset-pulk':
    'Puts the six PULK-phase settings and the chase settings back to shipped.',
  'DynamicsTuningSection:racePlanPulkStart':
    'Where the open, unscripted opening ends and the mid-race contest at the front begins. Earlier gives a shorter scramble and a longer front fight.',
  'DynamicsTuningSection:choreoOutcomeStart':
    'Where the mid-race contest ends and the race starts steering toward its outcome. Later gives a longer front fight and a shorter run to the finish.',
  'DynamicsTuningSection:pulkLeaderBrake':
    'How hard the current leader is slowed during the contest so a chaser can close in. It only ever slows; stronger makes lead changes more frequent and more visible.',
  'DynamicsTuningSection:pulkChallengerBoost':
    'The most extra speed a chasing challenger may get to close on the leader during the contest. Higher makes challenges arrive faster.',
  'DynamicsTuningSection:pulkLeadRotationDropDepthLengths':
    'How far back a dethroned leader is held before being released. Small keeps the rotation inside a tight front group; large sends ex-leaders back through the field.',
  'DynamicsTuningSection:chaseAfterOutcomeSlots':
    'How many racers the chase keeps accelerating after the outcome phase begins. It acts only when the chase switch below is on.',
  'DynamicsTuningSection:choreoIntensity':
    'Overall drama of the staged racer stories: low is calm, high gives deeper comebacks, more duels and later reveals. Each race clamps it so it cannot break fairness.',
  'DynamicsTuningSection:chaseAfterOutcomeEnabled':
    'On: the chase keeps accelerating its racers after the outcome phase begins instead of releasing everyone to natural speed. Only the boost continues; nobody is slowed by this switch.',
  'DynamicsTuningSection:chaseAfterOutcomeSelection':
    'Which racers the chase accelerates. From the gap: the front of the chasing field, behind the largest gap at the front. Behind the leader: the older rule, the racers directly behind the leader.',
  'DynamicsTuningSection:reset-pulk-bonuses': 'Puts the three PULK bonus settings back to shipped.',
  'DynamicsTuningSection:areaBonusPulk':
    'Strength of the area speed bonus inside the mid-race contest. Acts only when phase-split bonuses are on; zero leaves the contest without it.',
  'DynamicsTuningSection:rowBonusPulk':
    'Strength of the back-row catch-up bonus inside the mid-race contest. Acts only when phase-split bonuses are on.',
  'DynamicsTuningSection:pulkBiasGain':
    'How strongly racers in the contest are pulled back toward the middle of the pack, so the field stays together instead of stringing out. Zero switches it off; higher keeps the pack tighter.',
  'DynamicsTuningSection:reset-b2-attackers':
    'Puts the attacker count and re-steer threshold back to shipped.',
  'DynamicsTuningSection:b2AttackHeroes':
    'How many attacker heroes each race casts — racers from further back who mount a charge on the front late in the race. Zero casts none.',
  'DynamicsTuningSection:packReSteerThreshold':
    'How far, in places, a freed attacker may drift past its target band before it is steered back. Larger gives attackers more freedom; smaller keeps them on their planned places.',
  'DynamicsTuningSection:reset-gap-brake':
    'Puts all five gap-brake settings back to shipped, the servo switch included.',
  'DynamicsTuningSection:gapBrakeEnabled':
    'Master switch for the brake on a runaway leader in the outcome phase. It is the only mechanism that slows a racer for being too far ahead. Off reproduces the race as it was before the brake existed. Do not switch the servo setting below on while this is on.',
  'DynamicsTuningSection:servoNoiseBlindEnabled':
    'An experimental change to how the placement servo restarts its easing. Keep it off. Never switch it on together with the gap leader brake above: together, the brake’s release lands in a single frame instead of being eased.',
  'DynamicsTuningSection:gapBrakeAllowedGapPx':
    'How big a lead, leader to second, the leader may hold before the brake engages at all. Below it nothing slows the leader. Lower means the brake engages on smaller leads. The number is shown in canvas widths and stored in world pixels.',
  'DynamicsTuningSection:gapBrakeWindowEnd':
    'Where in the race the brake stops acting. Its start is fixed to the end of the mid-race contest, so the two brakes hand over without a gap.',
  'DynamicsTuningSection:gapBrakeMaxAuthority':
    'The hardest the brake may ever pull, as a share of natural speed. It is a ceiling: the pull grows only while the lead keeps growing and eases off as the gap closes.',
  'CameraAdvancedSection:referenceCorridorPx':
    'The width every “World in shot” setting is measured in. Changing it rescales every shot on every track at once: raise it and the whole game pulls back, lower it and everything moves in. A track wider than this keeps its own width.',
  'CameraAdvancedSection:minRacersVisible':
    'At least this many racers, counting the subject, stay in frame in the single-racer shots, so a tight leader shot never shows one racer alone on an empty track. The camera simply does not zoom in that far. Zero or one switches it off.',
  'CameraAdvancedSection:cameraTransitionGrammar':
    'How the camera moves from one shot to the next. Glide eases pan and zoom together; Cut jumps straight to the new framing.',
  'CameraAdvancedSection:glideDurationMs':
    'How long a Glide between two shots takes. Longer is calmer; shorter feels more like a cut. Used only when the transition style is Glide.',
  'CameraAdvancedSection:leaderForwardFrac':
    'Where the leader sits in the frame along the direction of travel. Centred shows as much ahead as behind; pushed forward shows more of the pack behind him.',
  'CameraAdvancedSection:leaderAimRoomFloorPx':
    'The least road the camera keeps visible ahead of the leader, by easing him back toward the centre where the frame is short in his direction. It matters on steep headings; the cost is seeing less of the pack behind. Takes effect on the next race; zero switches it off.',
  'CameraAdvancedSection:focalSmoothTc':
    'Smooths the camera’s aim while following a single racer in the leader and comeback shots, removing small shakes. Higher is smoother but trails the racer more; zero switches it off.',
  'CameraAdvancedSection:battleWeight':
    'How likely the camera is to accept a battle shot each time one is offered. Low means battles are often passed over for the leader; high means nearly every offered battle is shown. Whether a battle is offered at all is decided by the battle settings.',
  'CameraAdvancedSection:leadChangeWeight':
    'How likely the camera is to accept a lead-change shot each time one is offered, including near the end of the race.',
  'CameraAdvancedSection:comebackWeight':
    'How likely the camera is to accept a comeback shot each time one is offered.',
  'CameraAdvancedSection:overviewWeight':
    'How likely the camera is to accept a wide overview shot each time one is offered.',
  'CameraAdvancedSection:overviewCooldownMs':
    'Minimum pause after OVERVIEW before OVERVIEW may appear again.',
  'CameraAdvancedSection:overviewTargetCount': 'Target number of OVERVIEW cuts per race.',
  'CameraAdvancedSection:overviewStartDelay':
    'How long after the start before the first overview shot may be offered.',
  'CameraAdvancedSection:ceremonySkipOnClick':
    'On: a click on the race picture during the opening ends the beat you are watching and moves to the next; on the last one the gun fires. Nothing is cancelled and no beat changes length when you do not click. Off: the picture ignores clicks during the opening.',
  'CameraAdvancedSection:ceremonyBrandMs':
    'How long the opening card with the brand’s logo and the race name is shown. It only appears when a brand is active; with none, the opening begins directly on the track.',
  'CameraAdvancedSection:ceremonyVenueMs':
    'How long the opening shot of the whole track is held still before the camera starts to move. Longer makes the whole opening longer by exactly that much.',
  'CameraAdvancedSection:ceremonyPushMs':
    'How long the camera takes to move in from the whole track to the starting formation. Where it arrives is worked out from the formation itself, not set here.',
  'CameraAdvancedSection:ceremonyEasing':
    'The shape of the push-in. Ease in-out starts and ends at rest, a ceremonial move; quint holds longer at both ends; ease out starts at full speed and feels like catching up; linear moves at one speed.',
  'CameraAdvancedSection:startBoardFloorMs':
    'The shortest time the board listing the starters is shown, however small the field.',
  'CameraAdvancedSection:startBoardMsPerName':
    'Reading time allowed per racer on the starters board; a big field keeps the board up longer, and the camera waits on the formation until it is done. The opening total below shows the result for several field sizes.',
  'CameraAdvancedSection:ceremonySettledMs':
    'A still look at the formation after the board has gone and before the countdown, so viewers can find on the track the number the board just showed them. It is added to the opening.',
  'CameraAdvancedSection:countdownDigitsMs':
    'How long the countdown digits are on screen at the very end of the opening. The count still reaches zero exactly at the gun; this only sets how early the digits appear.',
  'CameraAdvancedSection:startWindowMs':
    'How long after the gun the start owns the picture: no battle, comeback or lead-change shots until it ends. The camera starts following the leader as soon as he reaches his place in the frame.',
  'CameraAdvancedSection:battlePulkThresholdT':
    'How close together, as a share of a lap, several front runners must be before a battle shot is offered. Tighter means only real duels; looser offers battles more often. The same on every track.',
  'CameraAdvancedSection:battleIsolationThresholdT':
    'Turns down a battle when another racer outside the group is this close to it, so the shot does not cut a crowd in half. Zero switches the check off.',
  'CameraAdvancedSection:battleMaxGroupSize': 'The most racers a battle shot will frame together.',
  'CameraAdvancedSection:battleMaxGroupRankSpan':
    'How far apart in places the racers of one battle may be. Smaller keeps a battle to neighbours; larger lets it span more of the field.',
  'CameraAdvancedSection:battleMinTopN':
    'At least one racer in a battle must be running at or above this place, so battles are about the front of the field.',
  'CameraAdvancedSection:battleMinDurationMs':
    'The shortest time a battle shot stays on screen once chosen, even if the group breaks up.',
  'CameraAdvancedSection:battleCooldownMs':
    'The least time after a battle shot before another battle may be shown.',
  'CameraAdvancedSection:battleSlowmoFactor':
    'How much the race slows down while a battle is on screen. Lower is slower motion; the full value means no slow motion. The race keeps its outcome; only the playback slows.',
  'CameraAdvancedSection:battleSlowmoMinDuration':
    'The shortest time slow motion lasts once a battle has triggered it, even if the battle shot ends sooner.',
  'CameraAdvancedSection:battleSlowmoFadeDuration':
    'How gradually slow motion fades in and out. Zero switches instantly.',
  'CameraAdvancedSection:battleFocusDarkening':
    'How much the racers outside a battle are dimmed while it is on screen. None leaves everyone as they are; full turns them black.',
  'CameraAdvancedSection:leadChangeMinGap':
    'How clearly the new leader must be ahead before a lead change counts. Larger ignores near-ties; smaller reacts to every swap.',
  'CameraAdvancedSection:leadChangeDebounceMs':
    'Duration in ms the new leader must hold before the change is confirmed.',
  'CameraAdvancedSection:leadChangeMinDuration':
    'Minimum time the camera stays on the new leader after LEAD_CHANGE entry.',
  'CameraAdvancedSection:leadChangeCooldownMs':
    'Minimum pause after LEAD_CHANGE before re-triggering is possible.',
  'CameraAdvancedSection:comebackUseBeats':
    'On: a racer the race plan has cast as a comebacker is only offered to the camera at the moments the plan sets for his charge. Off: the camera looks for comebacks from the rank changes alone.',
  'CameraAdvancedSection:comebackMinPositionsGained':
    'Minimum positions gained within the time window to trigger COMEBACK.',
  'CameraAdvancedSection:comebackWindowSec':
    'Look-back window for rank history. Positions gained = rank N seconds ago minus current rank.',
  'CameraAdvancedSection:comebackMinStartGap':
    'How far back from the leader a racer must have been at the start of the look-back window to count as a comeback. Larger means only racers from deep in the field.',
  'CameraAdvancedSection:comebackMaxCurrentRankPct':
    'Leaves out racers already in the leading group, so a comeback shot shows someone still working through the field. Larger excludes more of the front.',
  'CameraAdvancedSection:outcomePhaseThreshold':
    'How far the leader must be through the race before the camera starts looking for comebacks.',
  'CameraAdvancedSection:comebackMinDuration':
    'The shortest time the camera stays on a comeback racer once it has cut to him.',
  'CameraAdvancedSection:comebackCooldownMs':
    'Minimum pause after COMEBACK before re-triggering is possible.',
  'CameraAdvancedSection:endgameThreshold':
    'How far through the race the leader must be before the camera locks onto him for the endgame (lead changes may still cut in). The run-in framing below starts from the same point.',
  'CameraAdvancedSection:runInShot':
    'On: once the finish line can be framed without opening wider than an overview, the camera keeps it in view until the first racer crosses, tightening as the leader closes in. Off: the camera frames the leader only.',
  'CameraAdvancedSection:runInOpenMs':
    'How long the camera takes to open the shot when the run-in begins. Faster shows the line sooner; slower is calmer but trails its subject more while it moves.',
  'CameraAdvancedSection:contentionWatch':
    'On: in the endgame the camera keeps checking who can still win, from what is visible on the track, and eases the framing off racers the race has already decided. Off: everyone in the group stays framed to the line.',
  'CameraAdvancedSection:bandFloor':
    'On: the endgame keeps the finish inside the subject’s own part of the frame, which needs a wider shot but keeps the line on screen. Off: the finish may sit nearer the edge and the shot stays tighter.',
  'CameraAdvancedSection:photoFinishEnabled':
    'On: when the first finishers cross almost together, the camera shows a tight shot of them at the line. Off: a close finish gets the ordinary single-winner shot.',
  'CameraAdvancedSection:photoFinishLeadProgress':
    'How close to the line the leader must be when the camera decides whether the finish will be close. Later decides nearer the line.',
  'CameraAdvancedSection:photoFinishCloseThresholdT':
    'How close the leading finishers must be for a photo finish. Larger triggers it more often.',
  'CameraAdvancedSection:photoFinishSlowmoFactor':
    'How much the race slows down during the photo-finish shot. Lower is slower motion; the full value means none.',
  'CameraAdvancedSection:photoFinishContenderFraming':
    'On: the photo-finish shot keeps the racers it started on. Off: it follows whoever is in the top places right now, so the picture jumps when finished racers swap.',
  'CameraAdvancedSection:contenderZoom':
    'On: the photo-finish shot frames every racer still level with the leader on a free lane, usually a handful. Off: it frames the top two only. This switch also enables the limit that keeps the shot no wider than the road.',
  'CameraAdvancedSection:corridorCapArriveMs':
    'How long the photo-finish shot takes to settle to the road-width limit, so it moves instead of jumping. Zero applies the limit at once.',
  'CameraAdvancedSection:endingKeepsFinishShot':
    'On: the camera keeps composing while the ending runs, so the settled finish picture holds. Off: the older behaviour — the view resets the moment the last racer crosses, which can show an empty or shrunken picture.',
  'CameraAdvancedSection:finishDramaDurationMs':
    'How long the camera stays on the winner after the first crossing before it zooms out to the finish overview.',
  'CameraAdvancedSection:finishOverviewZoomOutDurationMs':
    'How long the zoom-out to the finish overview takes.',
  'CameraAdvancedSection:finishOverviewLookbackPx':
    'Where the finish overview is aimed: on the line itself, or further back along the track so the arriving racers are in view.',
  'CameraAdvancedSection:finishHoldAfterLastMs':
    'Extra time on the settled finish picture after the last racer is home, before the pause below begins. It lengthens the look at the result; it cannot bring back arrivals already past.',
  'CameraAdvancedSection:finishPauseMs':
    'The last part of the ending, until the screen changes to the results. The winner card is shown inside this pause, so this is the lever for a longer read of it.',
  'CameraAdvancedSection:winnerCardMs':
    'How long the card naming the winner stays up at the end. It lives inside the pause above and can never make the ending longer; zero shows no card.',
  'CameraAdvancedSection:podiumRevealBeatMs':
    'The beat the result screen is built on: third, then second, then the winner, then the full ranking, one beat apart. Zero shows the complete screen at once. A click or key completes it early.',
  'CameraAdvancedSection:finishedSplashEnabled':
    'On: brings back the old dark full-screen “race finished” cover over the ending. Off: the ending shows the race picture, the winner card and the podium uncovered.',
  'RaceDefaults:autoAdvance':
    'On: the results screen appears by itself once the ending above has played. Off: the finish picture stays until you click it, so you can hold the moment for the room. The length of the ending is set above in this group; this switch does not change it.',
  'CameraAdvancedSection:resetProfileState':
    'Puts every setting of this one camera state back to shipped. Each state has its own reset.',
  'CameraAdvancedSection:visibleCorridors':
    'How much of the world this camera state shows across the frame, in standard corridors. Higher is wider. The same number shows the same amount of world on every track.',
  'CameraAdvancedSection:trackingTC':
    'How quickly the camera follows its subject once the shot has settled. Higher lets the subject drift further before the camera catches up.',
  'CameraAdvancedSection:entryTC':
    'How quickly the camera moves in the moments after this state begins, before it has settled on its subject.',
  'CameraAdvancedSection:leadInDuration':
    'How long the camera shows the track ahead when this state begins.',
  'CameraAdvancedSection:leadOutDuration':
    'How long before this state ends the camera starts slowing to a stop.',
  'CameraAdvancedSection:innerFramePct':
    'The part of the frame the subject must stay inside. Smaller keeps the subject closer to the centre.',
  'CameraAdvancedSection:maxStateDuration':
    'The longest this state may stay on screen before the camera must move on.',
  'CameraAdvancedSection:minStateHold': 'The shortest time this state stays on screen once chosen.',
  'CameraAdvancedSection:maxEntryDurationMs':
    'The longest the camera may take to settle after this state begins; after it the camera treats the shot as settled anyway.',
  'CameraAdvancedSection:leadAheadEnabled':
    'On: this state shows more of the track ahead of the racer it follows. Only offered for the leader, battle and comeback states.',
  'CameraAdvancedSection:leadOutEnabled':
    'On: the camera eases to a stop over the lead-out time before this state ends. Only offered for the leader, battle and comeback states.',
  'CameraAdvancedSection:entryConvergenceZoom':
    'For every state: how close the zoom must come to its target before a new shot counts as settled. Smaller waits for a closer match.',
  'CameraAdvancedSection:entryConvergencePx':
    'For every state: how close the camera’s position must come to its target before a new shot counts as settled.',
  'CameraAdvancedSection:transitionTConvergence':
    'For every state: how close along the track the camera must come to its subject before a new shot counts as settled. It must stay above the camera’s normal following distance or a shot never settles.',
  'SpriteSizeRangeSection:reset-sprite-size-cap': 'Puts the largest racer size back to shipped.',
  'SpriteSizeRangeSection:maxTargetScreenPx':
    'The largest a racer may appear on screen. It holds the camera back from zooming in closer than this; lower it if racer animations look coarse when very large.',
  'CameraAdvancedSection:minDrawnFrameFrac':
    'A readability floor: a racer is never drawn smaller than this share of the picture height, so it stays recognisable when the camera is far out. It affects the drawing only and never moves the camera.',
  'NameTagVisibilitySection:reset-nametag-visibility':
    'Puts the three name-tag settings back to shipped.',
  'NameTagVisibilitySection:nameTagFrameFrac':
    'How big a name tag is drawn, as a share of the picture height — the same size at every zoom and on every track. Bigger names are easier to read but overlap sooner, so fewer are shown at once.',
  'NameTagVisibilitySection:nameTagMarginPx':
    'The space between the top of a racer and its name tag. The rest of the distance follows the racer’s drawn size by itself.',
  'NameTagVisibilitySection:nameTagAllUntilMs':
    'How long after the gun every name stays visible, so each viewer can find their racer once. After that, only tags with room are drawn.',
  'CameraAdvancedSection:labelNamesWhenRoom':
    'On: during the race a label shows the racer’s name when the name would cover no other label and no racer, and the number otherwise. Off: labels show numbers. The racer the camera is on, and every racer at the photo finish, always show a name.',
  'CameraAdvancedSection:labelFormHoldMs':
    'How long a label’s name must have been completely clear before it is shown. Lower means names appear sooner and switch more often. The switch back to a number is always immediate.',
  'CameraAdvancedSection:stateOverlayEnabled':
    "Shows short overlay texts (e.g. 'Currently leading: Max') on entry into OVERVIEW, BATTLE and COMEBACK.",
  'CameraAdvancedSection:stateOverlayDurationMs': 'How long each overlay text stays on screen.',
  'DynamicsTuningSection:reset-frame-timing':
    'Puts the three smoothness settings back to shipped. It is separate from the race reset on purpose: these change the picture, not the race.',
  'DynamicsTuningSection:dtSmoothingAlpha':
    'Smooths uneven browser frame times before they move the camera and effects. Higher is a smoother camera that reacts later to real frame-rate changes; zero uses the raw timing. The race itself is not affected.',
  'DynamicsTuningSection:renderInterpolation':
    'Smooths racer and camera movement between the race’s fixed steps, removing rhythmic jitter on uneven frame rates. Off is the older look, kept for comparison. Takes effect at once.',
  'DynamicsTuningSection:scoreboardIntervalMs':
    'How often the standings list beside the race is rebuilt. Faster reacts sooner to an overtake; slower drops fewer frames with large fields. Choose the slowest that still feels live. Takes effect at the next race start.',
  'RaceDefaults:soundEffects':
    'Reserved for race sounds. The switch is stored, but the game plays no sounds yet, so changing it has no effect today.',
  'SurfaceClassManager:openClass':
    'Opens a surface class for editing, with a live preview. A badge tells you whether it is a built-in class, a built-in class you changed, or one you created.',
  'SurfaceClassManager:handleNewClass':
    'Starts a new surface class from scratch. It appears in the list once saved and can then be chosen for tracks and racer types.',
  'SurfaceClassManager:label':
    'The name shown in the class list and in the track editor’s paint picker. The class keeps its internal id when you rename it.',
  'SurfaceClassManager:handleGeneratorChange':
    'Which effect draws this surface: particles, clouds, splashes or lines. Changing it replaces the settings below with the new effect’s own starting values.',
  'SurfaceClassManager:color': 'The colour of the effect, by picker or hex code.',
  'SurfaceClassManager:startSize': 'Cloud effect: how big each puff is when it appears.',
  'SurfaceClassManager:endSize': 'Cloud effect: how big each puff has grown when it fades.',
  'SurfaceClassManager:lifetimeFrames':
    'How long each particle, puff, splash or line stays visible before it fades. Longer leaves a longer trail.',
  'SurfaceClassManager:spawnProbability':
    'How often a racer gives off a new particle, puff or splash. Higher is denser.',
  'SurfaceClassManager:driftDirection':
    'Cloud effect: whether puffs drift back behind the racer or in random directions.',
  'SurfaceClassManager:opacity': 'How see-through the effect is, from invisible to solid.',
  'SurfaceClassManager:thickness': 'Line effect: how thick the trail lines are.',
  'SurfaceClassManager:sizeMin':
    'Particle and splash effects: the smallest size a single particle can have.',
  'SurfaceClassManager:sizeMax':
    'Particle and splash effects: the largest size a single particle can have.',
  'SurfaceClassManager:drift':
    'Particle effect: how far particles drift away from where they appear.',
  'SurfaceClassManager:gravity':
    'Particle and splash effects: how strongly particles fall after they appear. Zero lets them float.',
  'SurfaceClassManager:count': 'Splash effect: how many droplets one splash throws.',
  'SurfaceClassManager:spreadAngle': 'Splash effect: how wide the droplets of one splash fan out.',
  'SurfaceClassManager:handleSave':
    'Stores the class on the server, so every track and racer type using it shows the new look.',
  'SurfaceClassManager:handleCancel': 'Closes the editor and discards changes not yet saved.',
  'SurfaceClassManager:handleDelete':
    'Deletes a class you created. Built-in classes cannot be deleted.',
  'SurfaceClassManager:handleResetToDefault':
    'For a built-in class you changed: removes your change so the class looks as shipped again.',
  'PlayerGroupsManager:setShowForm': 'Opens an empty form to save a new roster of player names.',
  'PlayerGroupsManager:handleLoad':
    'Takes this group’s names into Race Setup, replacing the names entered there.',
  'PlayerGroupsManager:handleEdit':
    'Opens this group in the form below to rename it or change its names.',
  'PlayerGroupsManager:handleSetDefault':
    'Admin only. Marks this group as the one that comes with a fresh installation, or removes that mark.',
  'PlayerGroupsManager:handleExportSeed':
    'Admin only. Downloads this group as a seed file, the form used to ship it with the game.',
  'PlayerGroupsManager:handleDelete':
    'Deletes this group after you confirm. The races it was used in are not affected.',
  'PlayerGroupsManager:name':
    "What this group is called. Choose a short, recognizable name that you'll see in race setup.",
  'PlayerGroupsManager:playersText':
    'The players in this group, separated by commas. The counter below shows how many names were recognised and how many a race allows.',
  'PlayerGroupsManager:handleSave': 'Stores the group on the server for your team.',
  'PlayerGroupsManager:handleCancel': 'Closes the form without saving.',
  "DevScreen:navigate('/track-editor')":
    'Opens the Track Geometry Editor, where a track’s path, background, start, finish and width are drawn.',
  'TrackManager:setShowForm':
    'Opens an empty track form. Save the details first, then draw the path in the Track Geometry Editor.',
  'TrackManager:handleEdit': 'Opens this track in the form below.',
  'TrackManager:handleSetDefault':
    'Admin only. Marks this track as one that comes with a fresh installation, or removes that mark.',
  'TrackManager:handleExportSeed':
    'Admin only. Downloads this track as a seed file, the form used to ship it with the game.',
  'TrackManager:handleDelete': 'Deletes this track from the server after you confirm.',
  'TrackManager:name': 'What this track is called. Shown in race setup and in the race history.',
  'TrackManager:icon': 'The small symbol shown next to the track’s name in setup and history.',
  'TrackManager:description': 'A short line shown on the track’s card in Race Setup.',
  'TrackManager:color': 'The track’s accent colour on its card, by picker or hex code.',
  'TrackManager:defaultLaps':
    'Closed tracks only: how many laps a race on this track starts with in Race Setup. The race length follows from the laps and the course length.',
  'TrackManager:defaultDurationSec':
    'Open tracks only: how long a race on this track starts with in Race Setup.',
  'TrackManager:defaultWinners':
    'How many podium places a race on this track starts with in Race Setup.',
  'TrackManager:track-geometry-btn':
    'Opens this track in the Track Geometry Editor to draw or change its path.',
  'TrackManager:defaultRacerTypeId': 'The racer type Race Setup picks when this track is chosen.',
  'TrackManager:surfaceClasses':
    'Which ground effects this track can show. At least one is required. Classes themselves are defined under Look, labels and effects.',
  'TrackManager:maxRacers':
    'The field size above which Race Setup warns for this track. It is worked out from the track’s geometry; type a number to override it, and use “Reset to auto” to go back to the computed value.',
  'TrackManager:handleSave': 'Stores the track details on the server.',
  'TrackManager:handleCancel': 'Closes the form without saving.',
  "DevScreen:navigate('/racer-editor')":
    'Opens the Racer Editor, where racer types are created and their images and characters are set.',
  'RacerManager:navigate(`/racer-editor':
    'Opens this racer type in the Racer Editor. Offered for types you created.',
  'RacerManager:setEditTypeId':
    'Opens the tuning window for this racer type, with the settings listed below.',
  'RacerManager:handleDelete':
    'Deletes a racer type you created, after you confirm. Built-in types cannot be deleted.',
  'RacerManager:toggleActive':
    'Whether this racer type can be chosen in Race Setup. Off hides it from setup without deleting it.',
  'RacerEditModal:speedMultiplier':
    'How fast this racer type moves compared with the normal speed. Below the neutral value races take longer, above it they are shorter.',
  'RacerEditModal:displaySize':
    'Sprite size in pixels for this racer type. Setting it here skips auto-scaling for the race and feeds the starting grid (row gap and row count).',
  'RacerEditModal:basePeriodMs':
    'Duration of one full animation cycle in milliseconds. Low = fast flicker, high = slow and calm.',
  'RacerEditModal:leaderRingColor':
    'The colour of the glow ring drawn around the leading racer of this type, by picker or hex code.',
  'RacerEditModal:leaderEllipseRx':
    'Horizontal radius of the leader ring ellipse in pixels. Increase for wider sprites.',
  'RacerEditModal:leaderEllipseRy':
    'Vertical radius of the leader ring ellipse in pixels. Smaller values give a flatter ring.',
  'RacerEditModal:handleFieldReset':
    'Appears beside a field you changed; puts that one field back to the type’s shipped value.',
  'RacerEditModal:handleMinSizeChange':
    'This racer type’s own size floor, shown in the animated preview beside it. It starts from the floor set for every type under The race → Start; a value set here belongs to this type alone. This is the per-type setting, not the one for every type, although both are stored under the same name. Neither changes the race picture: the floor the race draws with is “Minimum racer size (% of frame)” under Look, labels and effects.',
  'RacerEditModal:handleMinSizeReset':
    'Removes this type’s own size floor so it follows the floor set for every type again.',
  'RacerEditModal:handleSurfaceClassToggle':
    'Which ground effects this racer type can show. In a race it shows the classes it shares with the track. At least one is required.',
  'RacerEditModal:handleSurfaceClassesReset':
    'Puts this type’s surface classes back to the shipped selection.',
  'RacerEditModal:spawnProbability':
    'For this racer type’s cloud effects only: how many puffs it gives off. Overrides the class’s own value.',
  'RacerEditModal:endSize': 'For this racer type’s cloud effects only: how big the puffs grow.',
  'RacerEditModal:lifetimeFrames':
    'For this racer type’s cloud effects only: how long each puff stays visible.',
  'RacerEditModal:handleEffectReset':
    'Removes this type’s cloud overrides so its clouds look like the surface class again.',
  'RacerEditModal:handleResetAll': 'Puts every setting of this racer type back to shipped.',
  'RacerEditModal:onClose': 'Closes the tuning window. Changes are already saved as you make them.',
  'BrandingProfiles:setShowForm': 'Opens an empty form for a new branding profile.',
  'BrandingProfiles:setPreview':
    'Shows how this brand looks — headline, subtitle, sponsor line and logo — without starting a race.',
  'BrandingProfiles:handleEdit': 'Opens this brand in the form below.',
  'BrandingProfiles:handleSetDefault':
    'Admin only. Marks this brand as one that comes with a fresh installation, or removes that mark.',
  'BrandingProfiles:handleExportSeed':
    'Admin only. Downloads this brand as a seed file, the form used to ship it with the game.',
  'BrandingProfiles:handleDelete': 'Deletes this branding profile after you confirm.',
  'BrandingProfiles:name':
    'What this branding profile is called. Pick a name that helps you recognize it — for example the event name or sponsor.',
  'BrandingProfiles:eventName':
    'The headline of the event, shown on the opening brand card and the result screen.',
  'BrandingProfiles:subtitle': 'A second line under the headline.',
  'BrandingProfiles:primaryColor':
    "The main accent color used in race UI elements like the timer and headers. Pick something that fits your event's look.",
  'BrandingProfiles:secondaryColor':
    'A supporting color used for backgrounds and secondary UI parts. Should contrast well with the primary color so text stays readable.',
  'BrandingProfiles:sponsorText':
    'A short sponsor line shown in the race intro and on the result screen. Keep it short so it fits on one line.',
  'BrandingProfiles:fileRef.current?.click':
    'Picks a logo image to show during races. A small image with a transparent background works best.',
  'BrandingProfiles:handleRemoveLogo': 'Removes the logo from this brand.',
  'BrandingProfiles:logoMaxHeight': 'How tall the logo is drawn during races.',
  'BrandingProfiles:logoOpacity': 'How see-through the logo is, from invisible to solid.',
  'BrandingProfiles:handleSave':
    'Stores the brand on the server. A headline and a name are required.',
  'BrandingProfiles:handleCancel': 'Closes the form without saving.',
  'RaceHistory:setFilterTrack':
    "Show only races on the selected track. Pick 'All tracks' to see every race regardless of track.",
  'RaceHistory:setFilterDate': 'Show only the races run on the chosen day.',
  'RaceHistory:setFilterTrack+setFilterDate': 'Removes both filters so every race is listed again.',
  'RaceHistory:handleExportCSV':
    'Downloads the races shown, with the filters applied, as a spreadsheet file.',
  'RaceHistory:handleClear':
    'Deletes the races kept on this device, after you confirm. Your team’s races stored on the server are not deleted.',
  'RaceHistory:run-again':
    'Runs this race again exactly as it ran, whatever this machine is set to now.',
  'RaceHistory:verify-race':
    'Races this race again on the server from its own record and compares every position and every finishing time. Takes a few seconds.',
  'RaceHistory:history-prev': 'Shows the previous page of stored races, nearer to today.',
  'RaceHistory:history-next': 'Shows the next page of stored races, further back in time.',
  'PeriodEvaluation:from':
    'The first day of the period, counted whole. Days are UTC days, so everyone gets the same table.',
  'PeriodEvaluation:to':
    'The last day of the period, counted whole, in UTC. A race finished on this day is included. Very long periods are refused.',
  'PeriodEvaluation:period-evaluation-load':
    'Builds the table for the chosen days: races, wins, second and third places and podiums per name. Quick Tests are left out and only racers who finished count.',
  'PeriodEvaluation:setDraftOn':
    'On: the table adds a Points column from the ladder beside it and is ordered by points. Off: races, wins and podiums only. The rule is the same for everyone on this server; only an admin can change it.',
  'PeriodEvaluation:setLadderText':
    'The points for each place, first place first, separated by commas. A place beyond the list scores nothing. Only an admin can change it.',
  'PeriodEvaluation:points-rule-save':
    'Admin only. Stores the points switch and ladder on the server for everyone.',
  'CameraAdvancedSection:highlightHeroes':
    'Draws a ring around the racers the race plan has cast as heroes — green for an ordinary hero, red for an attacker — so you can follow them in an eye test. It does not change the race.',
  'CameraAdvancedSection:showCameraStateHud':
    'Shows the camera state indicator (OVERVIEW / BATTLE / etc.) in the top-left of the race canvas.',
  'CameraAdvancedSection:showCameraDiagnostics':
    'Diagnostics panel bottom-left: live zoom values. Logs state transitions to the browser console.',
  'CameraAdvancedSection:showRpDiag':
    'Race plan diagnostics panel top-right: phase, re-roll status, spreadFactor. Only when Race Plan is active.',
  'CameraAdvancedSection:showRpWinnerList':
    'Lists the race plan’s favourites with their current place and how far they are from their planned place.',
  'CameraAdvancedSection:showRpMinimapBadges':
    'Marks the race plan’s favourites in the minimap with a gold ring.',
  'CameraAdvancedSection:showRpStartRow': 'Adds each racer’s starting row to its name tag.',
  'CameraAdvancedSection:showTop10SpeedMonitor':
    'Shows the race plan’s speed corrections for the leading racers, with a warning when one oscillates.',
  'CameraAdvancedSection:showBattleDiag':
    'BATTLE status, involved racers, and pulk validity live in the canvas.',
  'CameraAdvancedSection:showLeadChangeDiag':
    'Current and previous leader, pending status, minGap and debounce.',
  'CameraAdvancedSection:showComebackDiag':
    'Shows the comeback detector live: whether the outcome phase has begun, which favourites are gaining places, and which racer the camera has locked onto.',
  'CameraAdvancedSection:showGovernorDiag':
    'Shows, top centre, the field governor before the outcome phase: its phase fade, its strength, and the gap and cohesion between leader and stragglers.',
  'CameraAdvancedSection:enableFrameLog':
    'Enables the per-frame camera ring buffer. An export button appears on the race screen.',
  'CameraAdvancedSection:cameraDetourLog':
    'Logs the frames around each change of view to the browser console, to diagnose a camera move in the wrong direction. It changes nothing on screen. Run a race, then copy the console lines.',
  'CameraAdvancedSection:enablePerfLog':
    'Measures how long each frame spends on physics, camera and drawing, and shows the live figures and the worst spikes on screen. Takes effect on the next race.',
  'ConfigExportSection:export-race-config':
    'Downloads world.json — the exact configuration the game reads when a race starts — so a simulator run can be checked against it, and copies it to the clipboard where it can. The hash beside it names that configuration.',
  'ConfigExportSection:refresh':
    'Recomputes the configuration hash and the list of changed settings after you have changed something.',
  'DevScreen:handleViewChange':
    'Admin only. Operator shows only what is used on an event day; All adds every advanced setting. Your choice is remembered on this device.',
  "DevScreen:navigate('/setup')":
    'Leaves the Dev Screen and returns to Race Setup. Settings are already saved.',
  'DevScreen:logout': 'Signs you out of this browser.',
  'ChangePasswordSection:setCurrentPassword':
    'Your existing password. Verified by the server; a wrong value returns the same error the login screen uses.',
  'ChangePasswordSection:setNewPassword':
    'The password you want. The rule the server applies is the same one that governs new accounts; no extra rule is invented here.',
  'ChangePasswordSection:setConfirmPassword':
    'Typo guard, checked in the browser only. The server has no concept of a confirmation; if these two do not match, the form refuses to submit.',
  'ChangePasswordSection:handleSubmit':
    'Changes the password of the account you are signed in as. Your other sessions are signed out.',
  'UserManagementSection:loadUsers': 'Reloads the list of race directors from the server.',
  'UserManagementSection:handleTeamChange':
    'Moves this race director to another existing team. Their races are listed under the new team from then on.',
  'UserManagementSection:handleRoleChange':
    'Makes this race director an operator or an admin. Admins also see the advanced settings and admin-only actions.',
  'UserManagementSection:openResetForm': 'Opens a field to give this race director a new password.',
  'UserManagementSection:handleDelete': 'Deletes this race director’s account after you confirm.',
  'UserManagementSection:setResetPassword':
    'The new password for this race director, under the same rule as every account.',
  'UserManagementSection:handlePasswordReset': 'Sets the new password for this race director.',
  'UserManagementSection:setNewUsername':
    'The name the new user signs in with. Server-enforced uniqueness — a duplicate is refused.',
  'UserManagementSection:setNewPassword':
    'Initial password for the new account. Same rule the server applies everywhere; the user can change it themselves later from this same screen.',
  'UserManagementSection:setNewRole':
    'Operator sees the everyday Dev Screen; admin also sees the advanced settings, user management and every other admin-only action.',
  'UserManagementSection:setNewTeam':
    "The team the new account joins. The picker only lists teams that already exist — pick 'New team…' to found one, which is the only way to type a name. Guards against a typo silently splitting a team in two.",
  'UserManagementSection:setNewTeamName':
    "The name of the team you are founding. Only shown when you picked 'New team…'; the server tags this create request as an explicit new-team act so a typo cannot slip past.",
  'UserManagementSection:handleCreate': 'Creates the account on the server.',
  'SystemSettings:handleExport':
    'Downloads every setting this browser stores — tuning, camera, history and local overrides — as one file you can import later.',
  'SystemSettings:importRef.current?.click':
    'Restores settings from an exported file. Settings the file does not contain are left as they are.',
  'SystemSettings:handleDiagnosticExport':
    'Downloads the browser’s complete stored state, to attach to a bug report so the problem can be reproduced elsewhere.',
  'SystemSettings:handleReset':
    'Wipes every setting this browser stores and starts again from shipped values. Tracks, brands and player groups live on the server and are not deleted; only local overrides of them are cleared.',
};
