import type { JSX } from 'react';

import type { NaqiCategory } from '@saans/shared';

/** Background and text colour for a NAQI category, picked for WCAG AA contrast. */
export interface CategoryColours {
  readonly background: string;
  readonly text: string;
}

/** Category colours, close to the CPCB palette but darkened/lightened to pass 4.5:1. */
export const CATEGORY_COLOURS: Readonly<Record<NaqiCategory, CategoryColours>> = {
  good: { background: '#1a7f37', text: '#ffffff' },
  satisfactory: { background: '#9be15d', text: '#1a2e05' },
  moderate: { background: '#f5d90a', text: '#2b2300' },
  poor: { background: '#f08c00', text: '#231300' },
  veryPoor: { background: '#c81e1e', text: '#ffffff' },
  severe: { background: '#7a1020', text: '#ffffff' },
};

// One distinct shape per category, so meaning never depends on colour alone.
const ICON_PATHS: Readonly<Record<NaqiCategory, string>> = {
  good: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6',
  satisfactory: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9h8',
  moderate: 'M12 4 3 20h18L12 4Zm-4 12h8',
  poor: 'M12 4 3 20h18L12 4Zm0 5v5m0 3v.5',
  veryPoor: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v5m0 3v.5',
  severe: 'M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7L8.5 3Zm1 6.5 5 5m0-5-5 5',
};

/** Props for {@link CategoryIcon}. */
export interface CategoryIconProps {
  readonly category: NaqiCategory;
  readonly className?: string;
}

/**
 * Decorative icon for a NAQI category; always shown next to the category's text label.
 * @param props - Category and optional size classes.
 * @returns An `aria-hidden` SVG.
 */
export function CategoryIcon({ category, className = 'size-5' }: CategoryIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={ICON_PATHS[category]} />
    </svg>
  );
}
