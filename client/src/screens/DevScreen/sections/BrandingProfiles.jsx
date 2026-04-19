// ============================================================
// File:        BrandingProfiles.jsx
// Path:        client/src/screens/DevScreen/sections/BrandingProfiles.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Create and manage branding profiles (event name, colors, logo,
//              sponsor text); preview rendered before saving
// ============================================================

import React, { useState, useRef } from 'react';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS, newId } from '../../../modules/storage/storage.js';
import { DEFAULT_BRANDING } from '../../../modules/storage/defaults.js';
import s from '../DevScreen.module.css';

const BLANK = {
  name: '',
  eventName: '',
  subtitle: '',
  primaryColor: '#e63946',
  secondaryColor: '#f4a261',
  sponsorText: '',
  logo: '',       // base64 data URL
  isDefault: false,
};

function BrandingProfiles() {
  const [profiles, setProfiles] = useStorage(KEYS.BRANDING, DEFAULT_BRANDING);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null); // profile id being previewed
  const fileRef = useRef(null);

  function f(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => f('logo', ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!form.name.trim() || !form.eventName.trim()) return;
    const profile = { ...form, name: form.name.trim(), eventName: form.eventName.trim() };

    if (editId) {
      setProfiles((prev) => prev.map((p) => (p.id === editId ? { ...p, ...profile } : p)));
    } else {
      setProfiles((prev) => [...prev, { id: newId(), ...profile }]);
    }
    setForm(BLANK);
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(profile) {
    setForm({
      name: profile.name,
      eventName: profile.eventName,
      subtitle: profile.subtitle,
      primaryColor: profile.primaryColor,
      secondaryColor: profile.secondaryColor,
      sponsorText: profile.sponsorText,
      logo: profile.logo,
    });
    setEditId(profile.id);
    setShowForm(true);
    setPreview(null);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this branding profile?')) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (preview === id) setPreview(null);
  }

  function handleSetDefault(id) {
    setProfiles((prev) =>
      prev.map((p) => ({ ...p, isDefault: p.id === id }))
    );
  }

  function handleCancel() {
    setForm(BLANK);
    setEditId(null);
    setShowForm(false);
  }

  const previewProfile = profiles.find((p) => p.id === preview);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Branding Profiles <span className={s.badge}>{profiles.length}</span>
          </span>
          <span className={s.spacer} />
          {!showForm && (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowForm(true)}>
              + New Profile
            </button>
          )}
        </div>

        {profiles.length === 0 ? (
          <p className={s.emptyState}>No branding profiles yet.</p>
        ) : (
          <div className={s.rowList}>
            {profiles.map((profile) => (
              <div key={profile.id} className={s.row}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: profile.primaryColor,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{profile.name}</span>
                <span className={s.badge}>{profile.eventName}</span>
                {profile.isDefault && (
                  <span
                    style={{ fontSize: '0.7rem', color: '#f4a261', fontWeight: 600 }}
                  >
                    ★ Default
                  </span>
                )}
                <span className={s.spacer} />
                <button
                  className={`${s.btn} ${s.btnGhost}`}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setPreview(preview === profile.id ? null : profile.id)}
                >
                  {preview === profile.id ? 'Hide Preview' : 'Preview'}
                </button>
                {!profile.isDefault && (
                  <button
                    className={`${s.btn} ${s.btnGhost}`}
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => handleSetDefault(profile.id)}
                  >
                    Set Default
                  </button>
                )}
                <button className={s.btnIconOnly} onClick={() => handleEdit(profile)} title="Edit">
                  ✏️
                </button>
                <button
                  className={`${s.btnIconOnly} ${s.danger}`}
                  onClick={() => handleDelete(profile.id)}
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
      {previewProfile && (
        <div
          className={s.brandingPreview}
          style={{ background: previewProfile.primaryColor + '18' }}
        >
          {previewProfile.logo && (
            <img
              src={previewProfile.logo}
              alt="Logo"
              className={s.brandingPreviewLogo}
            />
          )}
          <div
            className={s.brandingPreviewTitle}
            style={{ color: previewProfile.primaryColor }}
          >
            {previewProfile.eventName}
          </div>
          {previewProfile.subtitle && (
            <div className={s.brandingPreviewSubtitle}>{previewProfile.subtitle}</div>
          )}
          {previewProfile.sponsorText && (
            <div className={s.brandingPreviewSponsor}>{previewProfile.sponsorText}</div>
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
              <label className={s.label}>Profile Name</label>
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
              <label className={s.label}>Primary Color</label>
              <div className={s.colorRow}>
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => f('primaryColor', e.target.value)}
                  style={{ width: '2rem', height: '2rem', border: 'none', background: 'none', cursor: 'pointer' }}
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
              <label className={s.label}>Secondary Color</label>
              <div className={s.colorRow}>
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => f('secondaryColor', e.target.value)}
                  style={{ width: '2rem', height: '2rem', border: 'none', background: 'none', cursor: 'pointer' }}
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
              <label className={s.label}>Sponsor Text</label>
              <input
                className={s.input}
                placeholder="e.g. Sponsored by Acme Corp"
                maxLength={80}
                value={form.sponsorText}
                onChange={(e) => f('sponsorText', e.target.value)}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>Logo (image file)</label>
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
                      onClick={() => f('logo', '')}
                      title="Remove logo"
                    >
                      ✕
                    </button>
                  </>
                )}
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
