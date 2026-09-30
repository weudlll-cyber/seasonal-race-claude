import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EffectConfig from './EffectConfig.jsx';
import { getDefaultConfig } from '../../modules/track-effects/index.js';
import * as trackEffects from '../../modules/track-effects/index.js';
import {
  buildTrackFromEditorState,
  extractEffects,
} from '../../screens/TrackEditor/trackEditorSave.js';

describe('EffectConfig — 0 effects', () => {
  it('renders only Add Effect button and no blocks when effects is empty', () => {
    const { container } = render(<EffectConfig effects={[]} onChange={vi.fn()} max={3} />);
    expect(screen.getByRole('button', { name: /Add Effect/i })).toBeInTheDocument();
    expect(container.querySelectorAll('select')).toHaveLength(0);
  });

  it('clicking Add Effect calls onChange with one null-id entry', () => {
    const onChange = vi.fn();
    render(<EffectConfig effects={[]} onChange={onChange} max={3} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Effect/i }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toEqual([{ id: null, config: {} }]);
  });
});

describe('EffectConfig — 1 effect', () => {
  it('renders one block with a dropdown and Add Effect button (below max)', () => {
    const effects = [{ id: null, config: {} }];
    const { container } = render(<EffectConfig effects={effects} onChange={vi.fn()} max={3} />);
    expect(container.querySelectorAll('select')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Add Effect/i })).toBeInTheDocument();
  });

  it('selecting an effect in the dropdown calls onChange with updated id and defaultConfig', () => {
    const onChange = vi.fn();
    const effects = [{ id: null, config: {} }];
    render(<EffectConfig effects={effects} onChange={onChange} max={3} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'stars' } });
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0];
    expect(next[0].id).toBe('stars');
    expect(next[0].config).toEqual(getDefaultConfig('stars'));
  });

  it('remove button calls onChange with empty array', () => {
    const onChange = vi.fn();
    const effects = [{ id: 'stars', config: getDefaultConfig('stars') }];
    render(<EffectConfig effects={effects} onChange={onChange} max={3} />);
    fireEvent.click(screen.getByTitle('Remove'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toEqual([]);
  });

  it('range slider fires onChange with updated config value (parsed as number)', () => {
    const onChange = vi.fn();
    const config = getDefaultConfig('stars');
    const effects = [{ id: 'stars', config }];
    const { container } = render(<EffectConfig effects={effects} onChange={onChange} max={3} />);
    const countSlider = container.querySelector('input[type="range"]');
    // PARTICLES-VISIBILITY-8: the amount slider moves in levels; level 50 of stars' 8000 is 4000.
    fireEvent.change(countSlider, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0];
    expect(next[0].config.count).toBe(4000);
  });
});

describe('EffectConfig — 3 effects (max reached)', () => {
  it('renders three blocks and hides Add Effect button when effects.length === max', () => {
    const effects = [
      { id: 'stars', config: {} },
      { id: 'rain', config: {} },
      { id: 'mud', config: {} },
    ];
    render(<EffectConfig effects={effects} onChange={vi.fn()} max={3} />);
    expect(screen.queryByRole('button', { name: /Add Effect/i })).toBeNull();
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
  });

  it('remove button in middle slot removes only that entry', () => {
    const onChange = vi.fn();
    const effects = [
      { id: 'stars', config: {} },
      { id: 'rain', config: {} },
      { id: 'mud', config: {} },
    ];
    render(<EffectConfig effects={effects} onChange={onChange} max={3} />);
    const removeBtns = screen.getAllByTitle('Remove');
    fireEvent.click(removeBtns[1]); // remove middle (rain)
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe('stars');
    expect(next[1].id).toBe('mud');
  });
});

describe('EffectConfig — duplicate prevention', () => {
  it('dropdown in block 2 does not show id already used in block 1', () => {
    const effects = [
      { id: 'stars', config: {} },
      { id: null, config: {} },
    ];
    render(<EffectConfig effects={effects} onChange={vi.fn()} max={3} />);
    const selects = screen.getAllByRole('combobox');
    const block2Select = selects[1];
    const optionValues = Array.from(block2Select.querySelectorAll('option')).map((o) => o.value);
    expect(optionValues).not.toContain('stars');
  });
});

describe('EffectConfig — unknown field type', () => {
  it('does not crash and logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getEffectSpy = vi.spyOn(trackEffects, 'getEffect').mockReturnValue({
      id: '__test__',
      configSchema: [{ key: 'bad', type: 'unknown_xyz', default: 1, label: 'Bad' }],
    });
    const effects = [{ id: '__test__', config: { bad: 1 } }];
    expect(() =>
      render(<EffectConfig effects={effects} onChange={vi.fn()} max={3} />)
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    getEffectSpy.mockRestore();
  });
});

// ── PARTICLES-VISIBILITY-8: the amount on one 0–100 level scale ─────────────────────────────────
const SEVEN = ['bubbles', 'dust', 'fireflies', 'mud', 'rain', 'stars', 'wave'];
const amountMax = (id) =>
  trackEffects.getEffect(id).configSchema.find((f) => f.key === 'count').max;
// The first range input is the amount in all seven schemas; the test checks that too.
const amountSlider = (container) => container.querySelector('input[type="range"]');

describe('EffectConfig — the amount shows as a level 0–100', () => {
  it.each(SEVEN)('%s — the amount slider runs 0–100 in steps of 1', (id) => {
    expect(trackEffects.getEffect(id).configSchema[0].key).toBe('count');
    const effects = [{ id, config: getDefaultConfig(id) }];
    const { container } = render(<EffectConfig effects={effects} onChange={vi.fn()} max={3} />);
    const slider = amountSlider(container);
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('100');
    expect(slider.step).toBe('1');
  });

  it.each(SEVEN)('%s — moving the amount writes level × max / 100 in native units', (id) => {
    const onChange = vi.fn();
    const effects = [{ id, config: getDefaultConfig(id) }];
    const { container } = render(<EffectConfig effects={effects} onChange={onChange} max={3} />);
    fireEvent.change(amountSlider(container), { target: { value: '100' } });
    expect(onChange.mock.calls[0][0][0].config.count).toBe(amountMax(id));
    fireEvent.change(amountSlider(container), { target: { value: '0' } });
    expect(onChange.mock.calls[1][0][0].config.count).toBe(0);
  });

  it('the other fields keep their native scale', () => {
    const effects = [{ id: 'rain', config: getDefaultConfig('rain') }];
    const { container } = render(<EffectConfig effects={effects} onChange={vi.fn()} max={3} />);
    const size = container.querySelectorAll('input[type="range"]')[1];
    const sizeField = trackEffects.getEffect('rain').configSchema[1];
    expect(size.max).toBe(String(sizeField.max));
    expect(size.value).toBe(String(sizeField.default));
  });

  it.each([
    ['rain', 200, '5'],
    ['bubbles', 100, '1'],
    ['stars', 360, '5'],
  ])('a stored %s amount of %s shows level %s', (id, count, level) => {
    const effects = [{ id, config: { ...getDefaultConfig(id), count } }];
    const { container } = render(<EffectConfig effects={effects} onChange={vi.fn()} max={3} />);
    expect(amountSlider(container).value).toBe(level);
    expect(container.querySelector('label span').textContent).toBe(level);
  });
});

describe('EffectConfig — an untouched amount saves byte-identical', () => {
  // The owner's three stored effect blocks, as they are in server/data/tracks (read, not changed).
  const STORED = [
    [{ id: 'rain', config: { count: 200, size: 2.3, color: '#88aaff', opacity: 0.8 } }],
    [{ id: 'bubbles', config: { count: 100, size: 1.9, color: '#aaddff', opacity: 0.6 } }],
    [
      {
        id: 'stars',
        config: { count: 360, twinkleSpeed: 1.5, color: '#ffffff', opacity: 0.35, size: 1 },
      },
    ],
  ];
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const save = (effects) =>
    buildTrackFromEditorState({
      mode: 'boundary',
      centerPoints: [],
      centerWidth: 80,
      innerPoints: square,
      outerPoints: square,
      closed: true,
      name: 'Round Trip',
      backgroundImage: null,
      effects,
    }).effects;

  /** The editor's own state loop: EffectConfig's onChange replaces the effects it was given. */
  function Editor({ initial, onEffects }) {
    const [effects, setEffects] = useState(initial);
    onEffects(effects);
    return <EffectConfig effects={effects} onChange={setEffects} max={3} />;
  }

  it.each(STORED.map((s) => [s]))('%j — open and save without touching anything', (stored) => {
    const json = JSON.stringify(stored);
    let current;
    render(
      <Editor
        initial={extractEffects({ effects: JSON.parse(json) })}
        onEffects={(e) => (current = e)}
      />
    );
    expect(JSON.stringify(save(current))).toBe(json);
  });

  it.each(STORED.map((s) => [s]))(
    '%j — moving another field leaves the stored amount native',
    (stored) => {
      const json = JSON.stringify(stored);
      let current;
      const { container } = render(
        <Editor
          initial={extractEffects({ effects: JSON.parse(json) })}
          onEffects={(e) => (current = e)}
        />
      );
      // The last range input is never the amount; move it and back.
      const ranges = container.querySelectorAll('input[type="range"]');
      const other = ranges[ranges.length - 1];
      const was = other.value;
      fireEvent.change(other, { target: { value: other.max } });
      fireEvent.change(other, { target: { value: was } });
      const saved = save(current);
      expect(saved[0].config.count).toBe(stored[0].config.count);
      expect(JSON.stringify(saved)).toBe(json);
    }
  );
});
