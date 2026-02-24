import { Category } from "@/types";

export default function CategoryBadge({ category }: { category: Category | null }) {
  if (!category) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: category.color + "20",
        color: category.color,
      }}
    >
      {category.emoji} {category.name}
    </span>
  );
}
