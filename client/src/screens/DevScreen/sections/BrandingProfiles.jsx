// ============================================================
// File:        BrandingProfiles.jsx
// Path:        client/src/screens/DevScreen/sections/BrandingProfiles.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Create and manage branding profiles (event name, colors, logo,
//              sponsor text); preview rendered before saving.
//              Data source: server (/api/brands) — D4 migration.
//              KEYS.BRANDING mirror is updated via syncBrandingMirror after every
//              mutation so all other consumers (SetupScreen, RaceScreen) see the
//              latest data without knowing about the server.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import {
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
  deleteBrandLogo,
  setBrandDefault,
  clearBrandDefault,
  exportBrandSeed,
} from '../../../services/brandApi.js';
import { DefaultControls } from '../components/DefaultControls.jsx';
import { syncBrandingMirror } from '../../../modules/branding/brandingSync.js';
import s from '../DevScreen.module.css';

const BLANK = {
  name: '',
  eventName: '',
  subtitle: '',
  primaryColor: '#e63946',
  secondaryColor: '#f4a261',
  sponsorText: '',
  logo: '', // display URL: base64 for live preview of a newly chosen file, server URL for saved profile
  logoMaxHeight: 90,
  logoOpacity: 0.9,
  logoCorner: 'bottom-right',
};

function BrandingProfiles() {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null); // brand id being previewed

  // logoFile: File object to upload (null = no new file chosen)
  // logoRemoved: user explicitly cleared the logo while editing
  const [logoFile, setLogoFile] = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false);

  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      setBrands(await fetchBrands());
    } catch (e) {
      setLoadError(e.message ?? 'Failed to load brands');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const initial = await fetchBrands();
        if (!cancelled) setBrands(initial);
      } catch (e) {
        if (!cancelled) setLoadError(e.message ?? 'Failed to load brands');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function f(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoRemoved(false);
    const reader = new FileReader();
    reader.onload = (ev) => f('logo', ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    f('logo', '');
    setLogoFile(null);
    setLogoRemoved(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.eventName.trim()) return;
    setActionError(null);

    const record = {
      name: form.name.trim(),
      eventName: form.eventName.trim(),
      subtitle: form.subtitle,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      sponsorText: form.sponsorText,
      logoMaxHeight: form.logoMaxHeight,
      logoOpacity: form.logoOpacity,
      logoCorner: form.logoCorner,
    };

    try {
      let id;
      if (editId) {
        await updateBrand(editId, record);
        id = editId;
      } else {
        const created = await createBrand(record);
        id = created.id;
      }

      if (logoFile) {
        await uploadBrandLogo(id, logoFile);
      } else if (logoRemoved && editId) {
        await deleteBrandLogo(editId);
      }

      await refresh();
      await syncBrandingMirror();

      setForm(BLANK);
      setLogoFile(null);
      setLogoRemoved(false);
      setEditId(null);
      setShowForm(false);
    } catch (e) {
      setActionError(e.message ?? 'Failed to save brand');
    }
  }

  function handleEdit(brand) {
    setActionError(null);
    setForm({
      name: brand.name,
      eventName: brand.eventName,
      subtitle: brand.subtitle ?? '',
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      sponsorText: brand.sponsorText ?? '',
      logo: brand.logo ?? '', // URL from mirror, or '' if no logo
      logoMaxHeight: brand.logoMaxHeight ?? 90,
      logoOpacity: brand.logoOpacity ?? 0.9,
      logoCorner: brand.logoCorner ?? 'bottom-right',
    });
    setLogoFile(null);
    setLogoRemoved(false);
    setEditId(brand.id);
    setShowForm(true);
    setPreview(null);
  }

  async function handleDelete(id, isDefault) {
    if (isDefault) {
      setActionError(
        'Ein Default-Brand kann nicht gelöscht werden. Entferne zuerst den Default-Status.'
      );
      return;
    }
    if (!window.confirm('Delete this branding profile?')) return;
    setActionError(null);
    try {
      await deleteBrand(id);
      if (preview === id) setPreview(null);
      await refresh();
      await syncBrandingMirror();
    } catch (e) {
      // Server 403 on default brand becomes a visible error message
      setActionError(e.message ?? 'Failed to delete brand');
    }
  }

  function handleCancel() {
    setActionError(null);
    setForm(BLANK);
    setLogoFile(null);
    setLogoRemoved(false);
    setEditId(null);
    setShowForm(false);
  }

  const previewBrand = brands.find((b) => b.id === preview);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Branding Profiles <span className={s.badge}>{brands.length}</span>
          </span>
          <span className={s.spacer} />
          {!showForm && (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowForm(true)}>
              + New Profile
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
          Branding profiles let you give your races a custom look — colors, logos, sponsor messages.
          Useful when you&rsquo;re running a tournament, event, or just want a personal touch. You
          can switch between profiles per race.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '0.75rem',
            fontSize: '0.78rem',
            color: 'var(--color-muted)',
          }}
        >
          <span>Also configurable per race:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Sponsor Overlay
            <InfoTooltip text="Whether to show your sponsor branding (logo and tagline) during races. Turn off for unbranded races." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Overlay Position
            <InfoTooltip text="Where on the screen the sponsor overlay appears during races. Pick a position that doesn't cover important race action — usually a corner." />
          </span>
        </div>

        {isLoading && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Loading brands…</p>
        )}

        {loadError && !isLoading && (
          <p
            role="alert"
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-danger, #c00)',
              marginBottom: '0.5rem',
            }}
          >
            Could not load brands: {loadError}
          </p>
        )}

        {actionError && (
          <p
            role="alert"
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-danger, #c00)',
              marginBottom: '0.5rem',
            }}
          >
            {actionError}
          </p>
        )}

        {!isLoading && !loadError && brands.length === 0 ? (
          <p className={s.emptyState}>No branding profiles yet.</p>
        ) : (
          <div className={s.rowList}>
            {brands.map((brand) => (
              <div key={brand.id} className={s.row}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: brand.primaryColor,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{brand.name}</span>
                <span className={s.badge}>{brand.eventName}</span>
                {brand.isDefault && (
                  <span style={{ fontSize: '0.7rem', color: '#f4a261', fontWeight: 600 }}>
                    ★ Default
                  </span>
                )}
                <span className={s.spacer} />
                <button
                  className={`${s.btn} ${s.btnGhost}`}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setPreview(preview === brand.id ? null : brand.id)}
                >
                  {preview === brand.id ? 'Hide Preview' : 'Preview'}
                </button>
                <button className={s.btnIconOnly} onClick={() => handleEdit(brand)} title="Edit">
                  ✏️
                </button>
                <DefaultControls
                  id={brand.id}
                  isDefault={brand.isDefault}
                  onChanged={refresh}
                  setDefault={setBrandDefault}
                  clearDefault={clearBrandDefault}
                  exportSeed={exportBrandSeed}
                  seedFilename={`brand-${brand.id}.json`}
                />
                <button
                  className={`${s.btnIconOnly} ${s.danger}`}
                  onClick={() => handleDelete(brand.id, brand.isDefault)}
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      {previewBrand && (
        <div className={s.brandingPreview} style={{ background: previewBrand.primaryColor + '18' }}>
          {previewBrand.logo && (
            <img src={previewBrand.logo} alt="Logo" className={s.brandingPreviewLogo} />
          )}
          <div className={s.brandingPreviewTitle} style={{ color: previewBrand.primaryColor }}>
            {previewBrand.eventName}
          </div>
          {previewBrand.subtitle && (
            <div className={s.brandingPreviewSubtitle}>{previewBrand.subtitle}</div>
          )}
          {previewBrand.sponsorText && (
            <div className={s.brandingPreviewSponsor}>{previewBrand.sponsorText}</div>
          )}
        </div>
      )}

      {showForm && (
        <div className={s.card}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {editId ? 'Edit Branding Profile' : 'New Branding Profile'}
          </p>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Profile Name
                <InfoTooltip text="What this branding profile is called. Pick a name that helps you recognize it — for example the event name or sponsor." />
              </label>
              <input
                className={s.input}
                placeholder="e.g. Christmas Party"
                maxLength={40}
                value={form.name}
                onChange={(e) => f('name', e.target.value)}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Event Name (headline)</label>
              <input
                className={s.input}
                placeholder="e.g. Winter Race Championship"
                maxLength={60}
                value={form.eventName}
                onChange={(e) => f('eventName', e.target.value)}
              />
            </div>
            <div className={s.formGroupFull}>
              <label className={s.label}>Subtitle</label>
              <input
                className={s.input}
                placeholder="e.g. Powered by the best team in town"
                maxLength={80}
                value={form.subtitle}
                onChange={(e) => f('subtitle', e.target.value)}
              />
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Primary Color
                <InfoTooltip text="The main accent color used in race UI elements like the timer and headers. Pick something that fits your event's look." />
              </label>
              <div className={s.colorRow}>
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => f('primaryColor', e.target.value)}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                />
                <input
                  className={s.input}
                  value={form.primaryColor}
                  maxLength={7}
                  onChange={(e) => f('primaryColor', e.target.value)}
                />
              </div>
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Secondary Color
                <InfoTooltip text="A supporting color used for backgrounds and secondary UI parts. Should contrast well with the primary color so text stays readable." />
              </label>
              <div className={s.colorRow}>
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => f('secondaryColor', e.target.value)}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                />
                <input
                  className={s.input}
                  value={form.secondaryColor}
                  maxLength={7}
                  onChange={(e) => f('secondaryColor', e.target.value)}
                />
              </div>
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Sponsor Text
                <InfoTooltip text="A short message shown in the race intro and result screens. Keep it under 50 characters so it fits nicely on screen." />
              </label>
              <input
                className={s.input}
                placeholder="e.g. Sponsored by Acme Corp"
                maxLength={80}
                value={form.sponsorText}
                onChange={(e) => f('sponsorText', e.target.value)}
              />
            </div>
            <div className={s.formGroup}>
              <label
                className={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Logo (image file)
                <InfoTooltip text="Optional logo image shown during races. PNG with transparent background works best. Keep it small — around 200x100 pixels — so it doesn't dominate the screen." />
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className={`${s.btn} ${s.btnSecondary}`}
                  onClick={() => fileRef.current?.click()}
                >
                  Upload Logo
                </button>
                {form.logo && (
                  <>
                    <img
                      src={form.logo}
                      alt="preview"
                      style={{ height: '2rem', borderRadius: '4px' }}
                    />
                    <button
                      className={`${s.btnIconOnly} ${s.danger}`}
                      onClick={handleRemoveLogo}
                      title="Remove logo"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Logo Size</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range"
                  min={40}
                  max={160}
                  step={4}
                  value={form.logoMaxHeight}
                  onChange={(e) => f('logoMaxHeight', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', minWidth: '3rem' }}>
                  {form.logoMaxHeight}px
                </span>
              </div>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Logo Opacity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.logoOpacity}
                  onChange={(e) => f('logoOpacity', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', minWidth: '3rem' }}>
                  {Math.round(form.logoOpacity * 100)}%
                </span>
              </div>
            </div>
          </div>
          <div className={s.btnRow} style={{ marginTop: '0.75rem' }}>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={handleSave}
              disabled={!form.name.trim() || !form.eventName.trim()}
            >
              {editId ? 'Save Changes' : 'Create Profile'}
            </button>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandingProfiles;
