import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EffectConfig from './EffectConfig.jsx';
import { getDefaultConfig } from '../../modules/track-effects/index.js';
import * as trackEffects from '../../modules/track-effects/index.js';

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
    fireEvent.change(countSlider, { target: { value: '200' } });
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0];
    expect(next[0].config.count).toBe(200);
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
