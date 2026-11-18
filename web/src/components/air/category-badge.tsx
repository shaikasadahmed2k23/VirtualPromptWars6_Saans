import type { JSX } from 'react';

import type { NaqiCategory } from '@saans/shared';

import { useI18n } from '../../i18n/i18n-context.js';
import { CATEGORY_COLOURS, CategoryIcon } from '../../naqi/category-meta.js';

/** Props for {@link CategoryBadge}. */
export interface CategoryBadgeProps {
  readonly category: NaqiCategory;
  readonly size?: 'md' | 'lg';
}

/**
 * NAQI category as text + icon + colour, so meaning never depends on colour alone.
 * @param props - Category and size.
 * @returns A coloured pill with the translated category name.
 */
export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps): JSX.Element {
  const { t } = useI18n();
  const { background, text } = CATEGORY_COLOURS[category];
  const sizing = size === 'lg' ? 'px-4 py-2 text-lg' : 'px-3 py-1 text-sm';
  return (
    <span
      style={{ backgroundColor: background, color: text }}
      className={`inline-flex items-center gap-2 rounded-full font-semibold ${sizing}`}
    >
      <CategoryIcon category={category} className={size === 'lg' ? 'size-6' : 'size-4'} />
      {t.categories[category]}
    </span>
  );
}
