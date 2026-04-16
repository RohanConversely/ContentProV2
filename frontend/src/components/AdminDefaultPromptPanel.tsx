import { useEffect, useMemo, useState } from "react";
import { industryLabel } from "@/lib/industries";

interface ShotPrompt {
  key: string;
  label: string;
  prompt: string;
}

interface CategoryPrompt {
  category_key: string;
  category_label: string;
  category_prompt_text: string;
  shot_prompts: ShotPrompt[];
}

interface AdminDefaultPromptPanelProps {
  defaultPrompts: Record<string, string>;
  defaultCategoryPrompts: Record<string, CategoryPrompt[]>;
  industryOptions?: { id: string; label: string }[];
  selectedIndustry: string;
  selectedCategoryKey: string;
  onSelectedIndustryChange: (industry: string) => void;
  onSelectedCategoryKeyChange: (categoryKey: string) => void;
  onAddIndustry: (industryId: string) => Promise<void>;
  onDeleteIndustry: () => Promise<void>;
  onAddCategory: (categoryLabel: string) => Promise<void>;
  onDeleteCategory: () => Promise<void>;
  onPromptChange: (industry: string, promptText: string) => void;
  onCategoryChange: (
    industry: string,
    categoryKey: string,
    next: { category_label: string; category_prompt_text: string; shot_prompts: ShotPrompt[] },
  ) => void;
  onSaveAll: () => void;
}

const AdminDefaultPromptPanel = ({
  defaultPrompts,
  defaultCategoryPrompts,
  industryOptions,
  selectedIndustry,
  selectedCategoryKey,
  onSelectedIndustryChange,
  onSelectedCategoryKeyChange,
  onAddIndustry,
  onDeleteIndustry,
  onAddCategory,
  onDeleteCategory,
  onPromptChange,
  onCategoryChange,
  onSaveAll,
}: AdminDefaultPromptPanelProps) => {
  const resolvedIndustryOptions = industryOptions ?? [];
  const categories = defaultCategoryPrompts[selectedIndustry] ?? [];
  const selectedCategory =
    categories.find((item) => item.category_key === selectedCategoryKey) ?? categories[0] ?? null;

  const [selectedShotKey, setSelectedShotKey] = useState("");
  const [newIndustryId, setNewIndustryId] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [isAddingIndustry, setIsAddingIndustry] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isDeletingIndustry, setIsDeletingIndustry] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  useEffect(() => {
    setSelectedShotKey(selectedCategory?.shot_prompts?.[0]?.key ?? "");
  }, [selectedCategory?.category_key]);

  const selectedShot = useMemo(() => {
    if (!selectedCategory) return null;
    return selectedCategory.shot_prompts.find((item) => item.key === selectedShotKey) ?? selectedCategory.shot_prompts[0] ?? null;
  }, [selectedCategory, selectedShotKey]);

  const selectedShotIndex = selectedCategory && selectedShot
    ? selectedCategory.shot_prompts.findIndex((item) => item.key === selectedShot.key)
    : -1;

  return (
    <section className="rounded-3xl border border-border bg-card/80 p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Prompt Hierarchy</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Edit industry, category, and shot prompts in one place and save together.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">Industry Prompts</h3>
            <div className="flex items-center gap-2">
              <input
                className="w-36 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                value={newIndustryId}
                onChange={(event) => setNewIndustryId(event.target.value)}
                placeholder="New Industry"
                disabled={isAddingIndustry}
              />
              <button
                type="button"
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs hover:bg-secondary disabled:opacity-60"
                disabled={isAddingIndustry || !newIndustryId.trim()}
                onClick={async () => {
                  setIsAddingIndustry(true);
                  try {
                    await onAddIndustry(newIndustryId);
                    setNewIndustryId("");
                  } finally {
                    setIsAddingIndustry(false);
                  }
                }}
              >
                Add Industry
              </button>
              <button
                type="button"
                className="rounded-xl border border-destructive/40 bg-background px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                disabled={isDeletingIndustry || !selectedIndustry}
                onClick={async () => {
                  setIsDeletingIndustry(true);
                  try {
                    await onDeleteIndustry();
                  } finally {
                    setIsDeletingIndustry(false);
                  }
                }}
              >
                Delete Industry
              </button>
            </div>
          </div>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            value={selectedIndustry}
            onChange={(event) => onSelectedIndustryChange(event.target.value)}
          >
            {resolvedIndustryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{industryLabel(selectedIndustry || "")}</p>
          <textarea
            className="min-h-[260px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            value={defaultPrompts[selectedIndustry] ?? ""}
            onChange={(event) => onPromptChange(selectedIndustry, event.target.value)}
            placeholder="Industry prompt"
          />
        </div>

        <div className="rounded-2xl border border-border bg-background/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">Category Prompts</h3>
            <div className="flex items-center gap-2">
              <input
                className="w-36 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                value={newCategoryLabel}
                onChange={(event) => setNewCategoryLabel(event.target.value)}
                placeholder="New category"
                disabled={isAddingCategory}
              />
              <button
                type="button"
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs hover:bg-secondary disabled:opacity-60"
                disabled={isAddingCategory || !newCategoryLabel.trim()}
                onClick={async () => {
                  setIsAddingCategory(true);
                  try {
                    await onAddCategory(newCategoryLabel);
                    setNewCategoryLabel("");
                  } finally {
                    setIsAddingCategory(false);
                  }
                }}
              >
                Add Category
              </button>
              <button
                type="button"
                className="rounded-xl border border-destructive/40 bg-background px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                disabled={isDeletingCategory || !selectedCategory || selectedCategory.category_key === "default"}
                onClick={async () => {
                  setIsDeletingCategory(true);
                  try {
                    await onDeleteCategory();
                  } finally {
                    setIsDeletingCategory(false);
                  }
                }}
              >
                Delete Category
              </button>
            </div>
          </div>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            value={selectedCategory?.category_key ?? ""}
            onChange={(event) => onSelectedCategoryKeyChange(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.category_key} value={category.category_key}>
                {category.category_label}
              </option>
            ))}
          </select>

          {selectedCategory ? (
            <>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                value={selectedCategory.category_label}
                onChange={(event) =>
                  onCategoryChange(selectedIndustry, selectedCategory.category_key, {
                    ...selectedCategory,
                    category_label: event.target.value,
                  })
                }
                placeholder="Category label"
                disabled={selectedCategory.category_key === "default"}
              />
              <textarea
                className="min-h-[260px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                value={selectedCategory.category_prompt_text}
                onChange={(event) =>
                  onCategoryChange(selectedIndustry, selectedCategory.category_key, {
                    ...selectedCategory,
                    category_prompt_text: event.target.value,
                  })
                }
                placeholder="Category prompt"
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No categories found for this industry.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background/40 p-4 space-y-3">
          <h3 className="font-medium">Shot Prompts</h3>
          {selectedCategory && selectedCategory.shot_prompts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {selectedCategory.shot_prompts.map((shotPrompt, index) => {
                  const isActive = (selectedShot?.key ?? "") === shotPrompt.key;
                  return (
                    <button
                      key={`${shotPrompt.key}-${index}`}
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-sm text-left transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-secondary"
                      }`}
                      onClick={() => setSelectedShotKey(shotPrompt.key)}
                    >
                      {shotPrompt.label || shotPrompt.key || `Shot ${index + 1}`}
                    </button>
                  );
                })}
              </div>

              {selectedShot && selectedShotIndex >= 0 ? (
                <div className="space-y-2">
                  <input
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    value={selectedShot.key}
                    onChange={(event) => {
                      const next = [...selectedCategory.shot_prompts];
                      next[selectedShotIndex] = { ...next[selectedShotIndex], key: event.target.value };
                      onCategoryChange(selectedIndustry, selectedCategory.category_key, {
                        ...selectedCategory,
                        shot_prompts: next,
                      });
                      setSelectedShotKey(event.target.value);
                    }}
                    placeholder="Shot key"
                  />
                  <input
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    value={selectedShot.label}
                    onChange={(event) => {
                      const next = [...selectedCategory.shot_prompts];
                      next[selectedShotIndex] = { ...next[selectedShotIndex], label: event.target.value };
                      onCategoryChange(selectedIndustry, selectedCategory.category_key, {
                        ...selectedCategory,
                        shot_prompts: next,
                      });
                    }}
                    placeholder="Shot label"
                  />
                  <textarea
                    className="min-h-[162px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    value={selectedShot.prompt}
                    onChange={(event) => {
                      const next = [...selectedCategory.shot_prompts];
                      next[selectedShotIndex] = { ...next[selectedShotIndex], prompt: event.target.value };
                      onCategoryChange(selectedIndustry, selectedCategory.category_key, {
                        ...selectedCategory,
                        shot_prompts: next,
                      });
                    }}
                    placeholder="Shot prompt"
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-destructive/40 bg-background px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (!selectedCategory || selectedShotIndex < 0) return;
                      const next = [...selectedCategory.shot_prompts];
                      next.splice(selectedShotIndex, 1);
                      onCategoryChange(selectedIndustry, selectedCategory.category_key, {
                        ...selectedCategory,
                        shot_prompts: next,
                      });
                      const fallback = next[Math.max(0, selectedShotIndex - 1)]?.key ?? next[0]?.key ?? "";
                      setSelectedShotKey(fallback);
                    }}
                  >
                    Delete Shot Prompt
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No shot prompts found for this category.</p>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          className="rounded-xl border border-border bg-background px-6 py-2.5 text-sm font-medium hover:bg-secondary"
          onClick={onSaveAll}
        >
          Save Changes
        </button>
      </div>
    </section>
  );
};

export default AdminDefaultPromptPanel;
