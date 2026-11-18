import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NAQI_CATEGORIES } from '@saans/shared';

import { CATEGORY_COLOURS, CategoryIcon } from './category-meta.js';

// WCAG 2.2 relative luminance and contrast ratio.
const channel = (value: number): number => {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string): number => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
};

describe('category colours', () => {
  it.each(NAQI_CATEGORIES)('%s badge text meets WCAG AA (4.5:1)', (category) => {
    const { background, text } = CATEGORY_COLOURS[category];
    expect(contrast(background, text)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses a distinct colour for every category', () => {
    const backgrounds = NAQI_CATEGORIES.map((category) => CATEGORY_COLOURS[category].background);
    expect(new Set(backgrounds).size).toBe(NAQI_CATEGORIES.length);
  });
});

describe('CategoryIcon', () => {
  it('draws a distinct, decorative shape per category', () => {
    const shapes = NAQI_CATEGORIES.map((category) => {
      const { container } = render(<CategoryIcon category={category} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      return svg?.querySelector('path')?.getAttribute('d');
    });
    expect(new Set(shapes).size).toBe(NAQI_CATEGORIES.length);
  });
});
