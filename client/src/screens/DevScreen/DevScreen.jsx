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
import PlayerGroupsManager from './sections/PlayerGroupsManager.jsx';
import RacerManager from './sections/RacerManager.jsx';
import TrackManager from './sections/TrackManager.jsx';
import BrandingProfiles from './sections/BrandingProfiles.jsx';
import RaceDefaults from './sections/RaceDefaults.jsx';
import RaceHistory from './sections/RaceHistory.jsx';
import SystemSettings from './sections/SystemSettings.jsx';
import AutoScaleSection from './sections/AutoScaleSection.jsx';
import s from './DevScreen.module.css';

const SECTIONS = [
  {
    id: 'groups',
    icon: '👥',
    label: 'Player Groups',
    desc: 'Save and load named player rosters',
    component: PlayerGroupsManager,
  },
  {
    id: 'racers',
    icon: '🏇',
    label: 'Racer Types',
    desc: 'Manage racer types, icons, and colors',
    component: RacerManager,
  },
  {
    id: 'tracks',
    icon: '🗺️',
    label: 'Tracks',
    desc: 'Configure all track types and properties',
    component: TrackManager,
  },
  {
    id: 'branding',
    icon: '🎨',
    label: 'Branding',
    desc: 'Event names, colors, logos, sponsors',
    component: BrandingProfiles,
  },
  {
    id: 'defaults',
    icon: '⚙️',
    label: 'Race Defaults',
    desc: 'Duration, winners, countdown, sound',
    component: RaceDefaults,
  },
  {
    id: 'history',
    icon: '📋',
    label: 'Race History',
    desc: 'View, filter, and export past races',
    component: RaceHistory,
  },
  {
    id: 'system',
    icon: '💾',
    label: 'System',
    desc: 'Backup, restore, and factory reset',
    component: SystemSettings,
  },
  {
    id: 'autoscale',
    icon: '📐',
    label: 'Auto-Scale',
    desc: 'Auto-adjust sprite sizes based on track width and racer count',
    component: AutoScaleSection,
  },
];

function DevScreen() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const navigate = useNavigate();

  const activeSection = SECTIONS.find((s) => s.id === activeId);
  const ActiveComponent = activeSection.component;

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

        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`${s.navItem} ${activeId === section.id ? s.navItemActive : ''}`}
            onClick={() => setActiveId(section.id)}
          >
            <span className={s.navIcon}>{section.icon}</span>
            {section.label}
          </button>
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
