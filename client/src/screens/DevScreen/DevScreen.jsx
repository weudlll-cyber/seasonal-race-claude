// ============================================================
// File:        DevScreen.jsx
// Path:        client/src/screens/DevScreen/DevScreen.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Advanced configuration panel for the Game Master — all settings
//              are UI-driven, nothing requires touching the code
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { KEYS, storageGet, storageSet } from '../../modules/storage/storage.js';
import { InfoTooltip } from '../../components/InfoTooltip/index.js';
import PlayerGroupsManager from './sections/PlayerGroupsManager.jsx';
import RacerManager from './sections/RacerManager.jsx';
import TrackManager from './sections/TrackManager.jsx';
import BrandingProfiles from './sections/BrandingProfiles.jsx';
import RaceDefaults from './sections/RaceDefaults.jsx';
import RaceHistory from './sections/RaceHistory.jsx';
import SystemSettings from './sections/SystemSettings.jsx';
import AutoScaleSection from './sections/AutoScaleSection.jsx';
import RaceTuningSection from './sections/RaceTuningSection.jsx';
import SpriteSizeRangeSection from './sections/SpriteSizeRangeSection.jsx';
import NameTagVisibilitySection from './sections/NameTagVisibilitySection.jsx';
import CameraAdvancedSection from './sections/CameraAdvancedSection.jsx';
import PrioritySystemSection from './sections/PrioritySystemSection.jsx';
import RubberBandSection from './sections/RubberBandSection.jsx';
import RaceZonesSection from './sections/RaceZonesSection.jsx';
import SurfaceClassManager from './sections/SurfaceClassManager.jsx';
import UserManagementSection from './sections/UserManagementSection.jsx';
import s from './DevScreen.module.css';

// Default-deny: only explicit 'operator' tier is operator-visible; anything else is admin-only.
// eslint-disable-next-line react-refresh/only-export-components -- small tier helper co-located with the screen; fast-refresh DX only
export function isOperatorTier(tier) {
  return tier === 'operator';
}

const SECTIONS = [
  // ── Tier 1 — Operator ────────────────────────────────────
  {
    id: 'defaults',
    icon: '🏁',
    label: 'Race Defaults',
    desc: 'Duration, winners, countdown, sound',
    component: RaceDefaults,
    tier: 'operator',
  },
  {
    id: 'groups',
    icon: '👥',
    label: 'Player Groups',
    desc: 'Save and load named player rosters',
    component: PlayerGroupsManager,
    tier: 'operator',
  },
  {
    id: 'racers',
    icon: '🐎',
    label: 'Racer Types',
    desc: 'Manage racer types, icons, and colors',
    component: RacerManager,
    tier: 'operator',
  },
  {
    id: 'tracks',
    icon: '🗺️',
    label: 'Tracks',
    desc: 'Configure all track types and properties',
    component: TrackManager,
    tier: 'operator',
  },
  {
    id: 'branding',
    icon: '🎨',
    label: 'Branding',
    desc: 'Event names, colors, logos, sponsors',
    component: BrandingProfiles,
    tier: 'operator',
  },
  {
    id: 'history',
    icon: '📋',
    label: 'Race History',
    desc: 'View, filter, and export past races',
    component: RaceHistory,
    tier: 'operator',
  },
  // ── Tier 2 — Advanced ────────────────────────────────────
  {
    id: 'race-tuning',
    icon: '⚙️',
    label: 'Race Tuning',
    desc: 'Physics and dynamics — speed range, re-rolls, avoidance, drafting',
    component: RaceTuningSection,
    tier: 'advanced',
  },
  {
    id: 'rubber-band',
    icon: '🔁',
    label: 'Rubber Band',
    desc: 'Gap-based catch-up boost for trailing racers — keeps the field compressed',
    component: RubberBandSection,
    tier: 'advanced',
  },
  {
    id: 'race-zones',
    icon: '🚦',
    label: 'Race Zones',
    desc: 'Fixed brake zone that slows all racers — bunches the field (accordion effect)',
    component: RaceZonesSection,
    tier: 'advanced',
  },
  {
    id: 'priority-system',
    icon: '🎯',
    label: 'Priority System',
    desc: 'Home-force cooldown and lookahead for anti-collision priority logic',
    component: PrioritySystemSection,
    tier: 'advanced',
  },
  {
    id: 'sprite-size-range',
    icon: '🔭',
    label: 'Sprite Size Range',
    desc: 'Min/max screen-pixel bounds that limit how far the camera zooms',
    component: SpriteSizeRangeSection,
    tier: 'advanced',
  },
  {
    id: 'camera-advanced',
    icon: '🎥',
    label: 'Camera Advanced',
    desc: 'All camera controls in race-timeline order: Start → BATTLE → Director → LEAD_CHANGE → COMEBACK → Slowmo → Endgame → Finish → Zoom Profiles.',
    component: CameraAdvancedSection,
    tier: 'advanced',
  },
  {
    id: 'nametag-visibility',
    icon: '🏷️',
    label: 'Name Tag Visibility',
    desc: 'How many name tags appear during the race',
    component: NameTagVisibilitySection,
    tier: 'advanced',
  },
  {
    id: 'autoscale',
    icon: '📐',
    label: 'Auto-Scale',
    desc: 'Auto-adjust sprite sizes based on track width and racer count',
    component: AutoScaleSection,
    tier: 'advanced',
  },
  {
    id: 'surfaces',
    icon: '🌿',
    label: 'Surface Classes',
    desc: 'Define surface-effect classes — type, generator, and visual config',
    component: SurfaceClassManager,
    tier: 'advanced',
  },
  {
    id: 'system',
    icon: '💾',
    label: 'System',
    desc: 'Backup, restore, and factory reset',
    component: SystemSettings,
    tier: 'advanced',
  },
  {
    id: 'users',
    icon: '👤',
    label: 'User Management',
    desc: 'Manage race directors — list, create, change role, reset password, delete',
    component: UserManagementSection,
    tier: 'advanced',
  },
];

function DevScreen() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [view, setView] = useState(() => storageGet(KEYS.DEV_PANEL_VIEW) ?? 'all');
  const navigate = useNavigate();

  function handleViewChange(newView) {
    setView(newView);
    storageSet(KEYS.DEV_PANEL_VIEW, newView);
    // If active section is advanced and switching to operator view, jump to first operator section
    const activeSection = SECTIONS.find((sec) => sec.id === activeId);
    if (newView === 'operator' && !isOperatorTier(activeSection?.tier)) {
      setActiveId(SECTIONS.find((sec) => isOperatorTier(sec.tier)).id);
    }
  }

  // Non-admin always sees only operator sections regardless of any persisted view value
  const effectiveView = isAdmin ? view : 'operator';

  const visibleSections =
    effectiveView === 'operator' ? SECTIONS.filter((sec) => isOperatorTier(sec.tier)) : SECTIONS;

  const activeSection = visibleSections.find((sec) => sec.id === activeId) ?? visibleSections[0];
  const ActiveComponent = activeSection.component;

  // Index of first advanced section among visible sections (for tier divider)
  const firstAdvancedIdx = visibleSections.findIndex((sec) => !isOperatorTier(sec.tier));

  return (
    <div className={s.screen}>
      {/* Sidebar */}
      <nav className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div>
            <div className={s.sidebarTitle}>⚙️ Dev Panel</div>
            <div className={s.sidebarSubtitle}>Configuration</div>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              style={{
                marginTop: '0.75rem',
                fontSize: '0.72rem',
                padding: '0.35rem 0.7rem',
                width: '100%',
              }}
              onClick={() => navigate('/track-editor')}
            >
              Track Geometry Editor →
            </button>
            <button
              className={`${s.btn} ${s.btnSecondary}`}
              style={{
                marginTop: '0.4rem',
                fontSize: '0.72rem',
                padding: '0.35rem 0.7rem',
                width: '100%',
              }}
              onClick={() => navigate('/racer-editor')}
            >
              Racer Editor →
            </button>
            <button
              className={`${s.btn} ${s.btnDanger}`}
              style={{
                marginTop: '0.4rem',
                fontSize: '0.72rem',
                padding: '0.35rem 0.7rem',
                width: '100%',
              }}
              onClick={() => logout()}
            >
              Log out
            </button>
          </div>
        </div>

        {/* Tier Toggle — admin only */}
        {isAdmin && (
          <div className={s.tierToggle}>
            <span className={s.tierToggleLabel}>View:</span>
            <div className={s.tierToggleBtns}>
              <button
                className={`${s.tierToggleBtn} ${view === 'all' ? s.tierToggleBtnActive : ''}`}
                onClick={() => handleViewChange('all')}
              >
                All
              </button>
              <button
                className={`${s.tierToggleBtn} ${view === 'operator' ? s.tierToggleBtnActive : ''}`}
                onClick={() => handleViewChange('operator')}
              >
                Operator
              </button>
            </div>
            <InfoTooltip text="Switch between Operator view (everyday workflow) and All view (includes advanced tuning settings). Advanced settings are normally only used during initial setup." />
          </div>
        )}

        {visibleSections.map((section, idx) => (
          <div key={section.id}>
            {effectiveView === 'all' && idx === firstAdvancedIdx && (
              <div className={s.tierDivider}>
                <span className={s.tierDividerLabel}>Advanced</span>
              </div>
            )}
            <button
              className={`${s.navItem} ${activeSection.id === section.id ? s.navItemActive : ''}`}
              onClick={() => setActiveId(section.id)}
            >
              <span className={s.navIcon}>{section.icon}</span>
              {section.label}
            </button>
          </div>
        ))}

        <button className={s.backBtn} onClick={() => navigate('/setup')}>
          ← Back to Setup
        </button>
      </nav>

      {/* Content */}
      <main className={s.content}>
        <div className={s.sectionHeader}>
          <h1 className={s.sectionTitle}>
            {activeSection.icon} {activeSection.label}
          </h1>
          <p className={s.sectionDesc}>{activeSection.desc}</p>
        </div>

        <ActiveComponent />
      </main>
    </div>
  );
}

export default DevScreen;
