export interface IndustryOption {
  id: "fashion" | "electronics" | "beauty" | "food" | "home" | "sports" | "jewelry" | "health";
  label: string;
  emoji: string;
}

export const industries: IndustryOption[] = [
  { id: "fashion", label: "Fashion & Apparel", emoji: "👗" },
  { id: "electronics", label: "Electronics & Tech", emoji: "💻" },
  { id: "beauty", label: "Beauty & Skincare", emoji: "💄" },
  { id: "food", label: "Food & Beverage", emoji: "🍽️" },
  { id: "home", label: "Home & Living", emoji: "🏡" },
  { id: "sports", label: "Sports & Fitness", emoji: "🏋️" },
  { id: "jewelry", label: "Jewelry & Accessories", emoji: "💎" },
  { id: "health", label: "Health & Wellness", emoji: "🌿" },
];

export function industryLabel(industryId: string): string {
  return industries.find((item) => item.id === industryId)?.label ?? industryId;
}
