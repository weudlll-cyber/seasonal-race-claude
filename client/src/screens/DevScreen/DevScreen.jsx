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
//   sub-groups in order, each sub-group the section parts placed in it. The two editor links are
//   parts like any other and sit where the design places them; this file renders them itself
//   (`own`). The view switch (admins only), Back to Setup and Log out stay in the sidebar, reachable
//   from every chapter (the owner's decision of 2026-10-05).
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

/** The screen's own controls placed as parts: the two editor links. */
function OwnPart({ which }) {
  const navigate = useNavigate();

  if (which === 'trackEditorLink') {
    return (
      <Ctl id="DevScreen:navigate('/track-editor')">
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => navigate('/track-editor')}>
          Track Geometry Editor →
        </button>
      </Ctl>
    );
  }
  // 'racerEditorLink'
  return (
    <Ctl id="DevScreen:navigate('/racer-editor')">
      <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => navigate('/racer-editor')}>
        Racer Editor →
      </button>
    </Ctl>
  );
}

function DevScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
      {/* Sidebar — the view switch, the chapters, and the way out, in every chapter */}
      <nav className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div>
            <div className={s.sidebarTitle}>⚙️ Dev Panel</div>
            <div className={s.sidebarSubtitle}>Configuration</div>
          </div>
        </div>

        {/* View switch — admins only */}
        {isAdmin && (
          <div className={s.tierToggle}>
            <Ctl id="DevScreen:handleViewChange" style={{ gap: '0.5rem' }}>
              <span className={s.tierToggleLabel}>View:</span>
              <span className={s.tierToggleBtns}>
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
              </span>
            </Ctl>
          </div>
        )}

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

        {/* The way out, directly under the chapters — never pushed down past a long chapter */}
        <Ctl id="DevScreen:navigate('/setup')">
          <button className={s.backBtn} onClick={() => navigate('/setup')}>
            ← Back to Setup
          </button>
        </Ctl>
        <Ctl id="DevScreen:logout">
          <button className={s.backBtn} onClick={() => logout()}>
            Log out
          </button>
        </Ctl>
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
                  {p.own ? <OwnPart which={p.own} /> : <Section part={p.part} />}
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
