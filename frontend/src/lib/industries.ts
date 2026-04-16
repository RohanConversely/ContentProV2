export interface IndustryOption {
  id: "jewelry";
  label: string;
  emoji: string;
}

export const industries: IndustryOption[] = [
  { id: "jewelry", label: "Jewellery", emoji: "💎" },
];

export function industryLabel(industryId: string): string {
  return industries.find((item) => item.id === industryId)?.label ?? industryId;
}
