// ============================================================
// File:        devScreenChapters.js
// Path:        client/src/screens/DevScreen/devScreenChapters.js
// Project:     RaceArena — DEVSCREEN-CHAPTERS-1
// Created:     2026-10-05
// Description: The Dev Screen's table of contents: seven chapters, each an intro and its
//              sub-groups in order, each sub-group the section parts it shows. Decided 2026-10-04
//              (Plan D, chapters); the design and its placement table live in
//              reports/evolution/DEVSCREEN-CHAPTERS-1.md and design.json, and the chapter guard
//              test holds this registry to that table.
//
//              A PART is one existing section component, whole or — with `part` — only the named
//              blocks of it (same state, handlers and storage; see each section's `part` prop).
//              `own` names a control the screen itself renders (DevScreen.jsx). `tier` is the
//              part's visibility exactly as the section's tier was before: 'operator' parts are
//              shown in the operator view, everything else only to an admin in the All view.
// ============================================================

import PlayerGroupsManager from './sections/PlayerGroupsManager.jsx';
import ChangePasswordSection from './sections/ChangePasswordSection.jsx';
import RacerManager from './sections/RacerManager.jsx';
import TrackManager from './sections/TrackManager.jsx';
import BrandingProfiles from './sections/BrandingProfiles.jsx';
import RaceDefaults from './sections/RaceDefaults.jsx';
import RaceHistory from './sections/RaceHistory.jsx';
import PeriodEvaluation from './sections/PeriodEvaluation.jsx';
import SystemSettings from './sections/SystemSettings.jsx';
import AutoScaleSection from './sections/AutoScaleSection.jsx';
import RaceTuningSection from './sections/RaceTuningSection.jsx';
import DynamicsTuningSection from './sections/DynamicsTuningSection.jsx';
import BehaviorTuningSection from './sections/BehaviorTuningSection.jsx';
import SpriteSizeRangeSection from './sections/SpriteSizeRangeSection.jsx';
import NameTagVisibilitySection from './sections/NameTagVisibilitySection.jsx';
import CameraAdvancedSection from './sections/CameraAdvancedSection.jsx';
import SurfaceClassManager from './sections/SurfaceClassManager.jsx';
import UserManagementSection from './sections/UserManagementSection.jsx';
import ConfigExportSection from './sections/ConfigExportSection.jsx';

const OP = 'operator';
const ADV = 'advanced';

export const CHAPTERS = [
  {
    id: 'race',
    icon: '🏁',
    title: 'The race',
    intro:
      'Everything that changes how a race runs, from the defaults a new race starts with to the mechanisms that shape the finish. Every control here, except the operator defaults at the top, sits in a config block the race fingerprint hashes, so changing one changes the race itself, not only the picture. One reset at the top of the tuning part restores every block in this chapter.',
    subgroups: [
      {
        title: 'Defaults for a new race',
        parts: [{ component: RaceDefaults, part: 'raceSetup', tier: OP }],
      },
      {
        title: 'Reset of the whole tuning',
        parts: [{ component: RaceTuningSection, part: 'reset', tier: ADV }],
      },
      {
        title: 'Pace — all race long',
        parts: [{ component: DynamicsTuningSection, part: 'pace', tier: ADV }],
      },
      {
        title: 'Racers among each other — all race long',
        parts: [{ component: BehaviorTuningSection, part: 'interaction', tier: ADV }],
      },
      {
        title: 'Start — grid and racer size',
        parts: [
          { component: DynamicsTuningSection, part: 'start', tier: ADV },
          { component: BehaviorTuningSection, part: 'startLayout', tier: ADV },
          { component: AutoScaleSection, tier: ADV },
        ],
      },
      {
        title: 'Speed changes during the race',
        parts: [{ component: DynamicsTuningSection, part: 'speedChanges', tier: ADV }],
      },
      {
        title: 'Race plan and bonuses',
        parts: [{ component: DynamicsTuningSection, part: 'racePlan', tier: ADV }],
      },
      {
        title: 'Mid-race contest (PULK)',
        parts: [{ component: DynamicsTuningSection, part: 'pulk', tier: ADV }],
      },
      {
        title: 'Outcome — the gap leader brake',
        parts: [{ component: DynamicsTuningSection, part: 'gapBrake', tier: ADV }],
      },
    ],
  },
  {
    id: 'camera',
    icon: '🎥',
    title: 'Camera — start to ending',
    intro:
      'Everything the camera does, in the order a race unfolds: how it frames at all times, how it chooses its shot, then the start, the battles and comebacks of the middle, the endgame, the finish and the ending. None of it changes the race — only what you see of it.',
    subgroups: [
      {
        title: 'Framing — all race long',
        parts: [{ component: CameraAdvancedSection, part: 'framing', tier: ADV }],
      },
      {
        title: 'Choosing the shot',
        parts: [{ component: CameraAdvancedSection, part: 'shot', tier: ADV }],
      },
      { title: 'Start', parts: [{ component: CameraAdvancedSection, part: 'start', tier: ADV }] },
      {
        title: 'Middle — battles',
        parts: [{ component: CameraAdvancedSection, part: 'battles', tier: ADV }],
      },
      {
        title: 'Middle — lead changes',
        parts: [{ component: CameraAdvancedSection, part: 'leadChanges', tier: ADV }],
      },
      {
        title: 'Middle — comebacks',
        parts: [{ component: CameraAdvancedSection, part: 'comebacks', tier: ADV }],
      },
      {
        title: 'Endgame and run-in',
        parts: [{ component: CameraAdvancedSection, part: 'endgame', tier: ADV }],
      },
      {
        title: 'Finish and photo finish',
        parts: [{ component: CameraAdvancedSection, part: 'finish', tier: ADV }],
      },
      {
        title: 'Ending — after the line',
        // The operator's hand-over switch last: it decides whether the ending above hands over by itself.
        parts: [
          { component: CameraAdvancedSection, part: 'ending', tier: ADV },
          { component: RaceDefaults, part: 'autoAdvance', tier: OP },
        ],
      },
      {
        title: 'Zoom profiles per camera state',
        parts: [{ component: CameraAdvancedSection, part: 'zoomProfiles', tier: ADV }],
      },
    ],
  },
  {
    id: 'look',
    icon: '🎨',
    title: 'Look, labels and effects',
    intro:
      'How the race is drawn, apart from where the camera points: how big racers appear, which names and labels are shown, the short overlay texts, how smoothly the picture moves, sound, and the ground effects racers kick up. Nothing here changes the race.',
    subgroups: [
      {
        title: 'Racer size on screen',
        parts: [
          { component: SpriteSizeRangeSection, tier: ADV },
          { component: CameraAdvancedSection, part: 'drawFloor', tier: ADV },
        ],
      },
      {
        title: 'Name tags and track labels',
        parts: [
          { component: NameTagVisibilitySection, tier: ADV },
          { component: CameraAdvancedSection, part: 'trackLabels', tier: ADV },
        ],
      },
      {
        title: 'Overlay texts',
        parts: [{ component: CameraAdvancedSection, part: 'overlays', tier: ADV }],
      },
      {
        title: 'Smoothness and live standings',
        parts: [{ component: DynamicsTuningSection, part: 'frameTiming', tier: ADV }],
      },
      { title: 'Sound', parts: [{ component: RaceDefaults, part: 'sound', tier: OP }] },
      {
        title: 'Ground effects (surface classes)',
        parts: [{ component: SurfaceClassManager, tier: ADV }],
      },
    ],
  },
  {
    id: 'records',
    icon: '🗺️',
    title: 'Tracks, racers, brands and groups',
    intro:
      'The things a race is made of — who races, where, as what, and under which look. Each part lists what exists, the actions on each entry, and then the form for creating or editing one. These are records and per-type settings, not the race tuning of the first chapter.',
    subgroups: [
      { title: 'Player groups', parts: [{ component: PlayerGroupsManager, tier: OP }] },
      {
        title: 'Tracks',
        parts: [
          { own: 'trackEditorLink', tier: OP },
          { component: TrackManager, tier: OP },
        ],
      },
      {
        title: 'Racer types',
        parts: [
          { own: 'racerEditorLink', tier: OP },
          { component: RacerManager, tier: OP },
        ],
      },
      { title: 'Brands', parts: [{ component: BrandingProfiles, tier: OP }] },
    ],
  },
  {
    id: 'history',
    icon: '📋',
    title: 'History and evaluation',
    intro:
      'What has been raced: every race your team has run, which you can filter, export, run again and — as an admin — verify on the server, and a table by name over any period you choose. Nothing here changes a setting; it reads the record.',
    subgroups: [
      { title: 'Race history', parts: [{ component: RaceHistory, tier: OP }] },
      { title: 'Period evaluation', parts: [{ component: PeriodEvaluation, tier: OP }] },
    ],
  },
  {
    id: 'diagnostics',
    icon: '🔬',
    title: 'Diagnostics and verification',
    intro:
      'Tools for checking the game rather than running an event: overlays and logs that show what the camera and the race plan are doing, and an export of the exact race configuration for verification in the simulator. None of them changes a race.',
    subgroups: [
      {
        title: 'On-screen diagnostics',
        parts: [{ component: CameraAdvancedSection, part: 'diagnostics', tier: ADV }],
      },
      { title: 'Logs', parts: [{ component: CameraAdvancedSection, part: 'logs', tier: ADV }] },
      {
        title: 'Race configuration export',
        parts: [{ component: ConfigExportSection, tier: ADV }],
      },
    ],
  },
  {
    id: 'accounts',
    icon: '👤',
    title: 'Accounts and system',
    intro:
      'Who may use the screen and what it keeps: your own password, the race directors of the server, and backups of everything this browser stores.',
    subgroups: [
      { title: 'Your password', parts: [{ component: ChangePasswordSection, tier: OP }] },
      { title: 'Race directors', parts: [{ component: UserManagementSection, tier: ADV }] },
      { title: 'Backup and reset', parts: [{ component: SystemSettings, tier: ADV }] },
    ],
  },
];
