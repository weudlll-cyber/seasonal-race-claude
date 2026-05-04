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
import SurfaceClassManager from './sections/SurfaceClassManager.jsx';
import s from './DevScreen.module.css';

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
];

function DevScreen() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [view, setView] = useState(() => storageGet(KEYS.DEV_PANEL_VIEW) ?? 'all');
  const navigate = useNavigate();

  function handleViewChange(newView) {
    setView(newView);
    storageSet(KEYS.DEV_PANEL_VIEW, newView);
    // If active section is advanced and switching to operator view, jump to first operator section
    const activeSection = SECTIONS.find((sec) => sec.id === activeId);
    if (newView === 'operator' && activeSection?.tier === 'advanced') {
      setActiveId(SECTIONS.find((sec) => sec.tier === 'operator').id);
    }
  }

  const visibleSections =
    view === 'operator' ? SECTIONS.filter((sec) => sec.tier === 'operator') : SECTIONS;

  const activeSection = visibleSections.find((sec) => sec.id === activeId) ?? visibleSections[0];
  const ActiveComponent = activeSection.component;

  // Index of first advanced section among visible sections (for tier divider)
  const firstAdvancedIdx = visibleSections.findIndex((sec) => sec.tier === 'advanced');

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
          </div>
        </div>

        {/* Tier Toggle */}
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

        {visibleSections.map((section, idx) => (
          <div key={section.id}>
            {view === 'all' && idx === firstAdvancedIdx && (
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
