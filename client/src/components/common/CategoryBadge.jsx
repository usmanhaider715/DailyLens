import { getCategoryColor } from '../../utils/categoryColors.js';

export function CategoryBadge({ category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getCategoryColor(category)}`}
    >
      {category}
    </span>
  );
}
