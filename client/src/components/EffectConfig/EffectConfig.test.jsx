import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EffectConfig from './EffectConfig.jsx';
import { getDefaultConfig } from '../../modules/track-effects/index.js';
import * as trackEffects from '../../modules/track-effects/index.js';

describe('EffectConfig', () => {
  it('renders "None" selected and no config inputs when effectId is null', () => {
    const { container } = render(<EffectConfig effectId={null} config={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });

  it('dropdown contains a "Stars" option', () => {
    render(<EffectConfig effectId={null} config={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Stars' })).toBeInTheDocument();
  });

  it('selects stars in the dropdown and renders 5 config controls (4 range + 1 color)', () => {
    const config = getDefaultConfig('stars');
    const { container } = render(
      <EffectConfig effectId="stars" config={config} onChange={vi.fn()} />
    );
    expect(screen.getByRole('combobox')).toHaveValue('stars');
    const rangeInputs = container.querySelectorAll('input[type="range"]');
    const colorInputs = container.querySelectorAll('input[type="color"]');
    expect(rangeInputs.length + colorInputs.length).toBe(5);
  });

  it('range slider change fires onChange with updated key parsed as a number', () => {
    const config = getDefaultConfig('stars');
    const onChange = vi.fn();
    const { container } = render(
      <EffectConfig effectId="stars" config={config} onChange={onChange} />
    );
    const countSlider = container.querySelector('input[type="range"]'); // count is first
    fireEvent.change(countSlider, { target: { value: '200' } });
    expect(onChange).toHaveBeenCalledOnce();
    const [calledId, calledConfig] = onChange.mock.calls[0];
    expect(calledId).toBe('stars');
    expect(calledConfig.count).toBe(200);
  });

  it('color picker change fires onChange with the hex string for the color key', () => {
    const config = getDefaultConfig('stars');
    const onChange = vi.fn();
    const { container } = render(
      <EffectConfig effectId="stars" config={config} onChange={onChange} />
    );
    const colorInput = container.querySelector('input[type="color"]');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenCalledOnce();
    const [calledId, calledConfig] = onChange.mock.calls[0];
    expect(calledId).toBe('stars');
    expect(calledConfig.color).toBe('#ff0000');
  });

  it('switching dropdown from stars to None fires onChange(null, {})', () => {
    const config = getDefaultConfig('stars');
    const onChange = vi.fn();
    render(<EffectConfig effectId="stars" config={config} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null, {});
  });

  it('switching dropdown from None to stars fires onChange("stars", defaultConfig)', () => {
    const onChange = vi.fn();
    render(<EffectConfig effectId={null} config={{}} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'stars' } });
    expect(onChange).toHaveBeenCalledOnce();
    const [calledId, calledConfig] = onChange.mock.calls[0];
    expect(calledId).toBe('stars');
    expect(calledConfig).toEqual(getDefaultConfig('stars'));
  });

  it('unknown field type does not crash and logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getEffectSpy = vi.spyOn(trackEffects, 'getEffect').mockReturnValue({
      id: '__test__',
      configSchema: [{ key: 'badField', type: 'unknown_xyz', default: 42, label: 'Bad' }],
      defaultConfig: { badField: 42 },
    });

    expect(() =>
      render(<EffectConfig effectId="__test__" config={{ badField: 42 }} onChange={vi.fn()} />)
    ).not.toThrow();

    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    getEffectSpy.mockRestore();
  });
});
