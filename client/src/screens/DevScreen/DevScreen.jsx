// ============================================================
// File:        DevScreen.jsx
// Path:        client/src/screens/DevScreen/DevScreen.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Advanced configuration panel for the Game Master — all settings
//              are UI-driven, nothing requires touching the code.
//
// DEVSCREEN-CHAPTERS-1 (decided 2026-10-04, built 2026-10-05): the screen is read by CHAPTER.
//   The sidebar lists the chapters of `devScreenChapters.js`; a chapter shows its intro and its
//   sub-groups in order, each sub-group the section parts placed in it. The controls the sidebar
//   used to carry (the editor links, the view switch, Log out, Back to Setup) are parts like any
//   other and sit where the design places them; this file renders those few itself (`own`).
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { KEYS, storageGet, storageSet } from '../../modules/storage/storage.js';
import { Ctl } from './sections/ControlInfo.jsx';
import { CHAPTERS } from './devScreenChapters.js';
import s from './DevScreen.module.css';

// Default-deny: only explicit 'operator' tier is operator-visible; anything else is admin-only.
// eslint-disable-next-line react-refresh/only-export-components -- small tier helper co-located with the screen; fast-refresh DX only
export function isOperatorTier(tier) {
  return tier === 'operator';
}

/** The chapters as one view shows them: the operator view keeps only operator-tier parts, and a
 *  sub-group or chapter left with none is not shown at all. */
function chaptersFor(view) {
  if (view !== 'operator') return CHAPTERS;
  return CHAPTERS.map((chapter) => ({
    ...chapter,
    subgroups: chapter.subgroups
      .map((sub) => ({ ...sub, parts: sub.parts.filter((p) => isOperatorTier(p.tier)) }))
      .filter((sub) => sub.parts.length > 0),
  })).filter((chapter) => chapter.subgroups.length > 0);
}

/** The screen's own controls, placed as parts: the two editor links and the screen frame. */
function OwnPart({ which, isAdmin, view, onViewChange }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  if (which === 'trackEditorLink') {
    return (
      <Ctl id="DevScreen:navigate('/track-editor')">
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => navigate('/track-editor')}>
          Track Geometry Editor →
        </button>
      </Ctl>
    );
  }
  if (which === 'racerEditorLink') {
    return (
      <Ctl id="DevScreen:navigate('/racer-editor')">
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => navigate('/racer-editor')}>
          Racer Editor →
        </button>
      </Ctl>
    );
  }
  // 'screenFrame' — the view switch (admins only, as before), the way back, signing out.
  return (
    <div className={s.btnRow}>
      {isAdmin && (
        <Ctl id="DevScreen:handleViewChange" style={{ gap: '0.5rem' }}>
          <span className={s.tierToggleLabel}>View:</span>
          <span className={s.tierToggleBtns}>
            <button
              className={`${s.tierToggleBtn} ${view === 'all' ? s.tierToggleBtnActive : ''}`}
              onClick={() => onViewChange('all')}
            >
              All
            </button>
            <button
              className={`${s.tierToggleBtn} ${view === 'operator' ? s.tierToggleBtnActive : ''}`}
              onClick={() => onViewChange('operator')}
            >
              Operator
            </button>
          </span>
        </Ctl>
      )}
      <Ctl id="DevScreen:navigate('/setup')">
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => navigate('/setup')}>
          ← Back to Setup
        </button>
      </Ctl>
      <Ctl id="DevScreen:logout">
        <button className={`${s.btn} ${s.btnDanger}`} onClick={() => logout()}>
          Log out
        </button>
      </Ctl>
    </div>
  );
}

function DevScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeId, setActiveId] = useState(CHAPTERS[0].id);
  const [view, setView] = useState(() => storageGet(KEYS.DEV_PANEL_VIEW) ?? 'all');

  function handleViewChange(newView) {
    setView(newView);
    storageSet(KEYS.DEV_PANEL_VIEW, newView);
  }

  // Non-admin always sees only operator parts regardless of any persisted view value
  const effectiveView = isAdmin ? view : 'operator';
  const visibleChapters = chaptersFor(effectiveView);

  // A chapter the view does not show (e.g. after switching to Operator) falls back to the first.
  const activeChapter = visibleChapters.find((ch) => ch.id === activeId) ?? visibleChapters[0];

  return (
    <div className={s.screen}>
      {/* Sidebar — the chapters */}
      <nav className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div>
            <div className={s.sidebarTitle}>⚙️ Dev Panel</div>
            <div className={s.sidebarSubtitle}>Configuration</div>
          </div>
        </div>

        {visibleChapters.map((chapter) => (
          <button
            key={chapter.id}
            className={`${s.navItem} ${activeChapter.id === chapter.id ? s.navItemActive : ''}`}
            onClick={() => setActiveId(chapter.id)}
          >
            <span className={s.navIcon}>{chapter.icon}</span>
            {chapter.title}
          </button>
        ))}
      </nav>

      {/* Content — the active chapter: intro, then its sub-groups in order */}
      <main className={s.content} data-chapter={activeChapter.title}>
        <div className={s.sectionHeader}>
          <h1 className={s.sectionTitle}>
            {activeChapter.icon} {activeChapter.title}
          </h1>
          <p className={s.sectionDesc}>{activeChapter.intro}</p>
        </div>

        {activeChapter.subgroups.map((sub) => (
          <section key={sub.title} className={s.subgroup}>
            <h2 className={s.subgroupTitle}>{sub.title}</h2>
            {sub.parts.map((p, i) => {
              const Section = p.component;
              return (
                // data-part: one placement — the chapter guard test refuses a control in two.
                <div key={i} className={s.part} data-part={`${sub.title}#${i}`}>
                  {/* In the All view an admin sees which parts the operator view leaves out. */}
                  {effectiveView === 'all' && !isOperatorTier(p.tier) && (
                    <span className={s.advancedTag}>Advanced</span>
                  )}
                  {p.own ? (
                    <OwnPart
                      which={p.own}
                      isAdmin={isAdmin}
                      view={view}
                      onViewChange={handleViewChange}
                    />
                  ) : (
                    <Section part={p.part} />
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </main>
    </div>
  );
}

export default DevScreen;
