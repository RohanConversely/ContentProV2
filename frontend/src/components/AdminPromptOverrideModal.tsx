import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import {
  adminDeleteUserCategoryPromptOverride,
  adminDeleteUserPromptOverride,
  adminGetUserCategoryPromptOverride,
  adminGetUserPromptOverride,
  adminSetUserCategoryPromptOverride,
  adminSetUserPromptOverride,
  type AdminUserRecord,
} from "@/lib/api";
import { industryLabel } from "@/lib/industries";

interface AdminPromptOverrideModalProps {
  defaultPrompt: string;
  defaultShotPrompts: { key: string; label: string; prompt: string }[];
  defaultCategoryPrompts: { category_key: string; category_label: string; category_prompt_text: string; shot_prompts: { key: string; label: string; prompt: string }[] }[];
  onClose: () => void;
  onSaved: (message: string) => void;
  user: AdminUserRecord | null;
}

const AdminPromptOverrideModal = ({
  defaultPrompt,
  defaultShotPrompts,
  defaultCategoryPrompts,
  onClose,
  onSaved,
  user,
}: AdminPromptOverrideModalProps) => {
  const [promptText, setPromptText] = useState("");
  const [shotPrompts, setShotPrompts] = useState<{ key: string; label: string; prompt: string }[]>([]);
  const [selectedShotKey, setSelectedShotKey] = useState("");
  const [hasOverride, setHasOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("default");
  const [categoryPromptText, setCategoryPromptText] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      setIsLoading(true);
      setError("");
      const override = await adminGetUserPromptOverride(user.id, user.industry);
      if (override) {
        setPromptText(override.prompt_text);
        const loadedShots = override.shot_prompts ?? [];
        setShotPrompts(loadedShots);
        setSelectedShotKey(loadedShots[0]?.key ?? "");
        setHasOverride(true);
      } else {
        setPromptText(defaultPrompt);
        setShotPrompts(defaultShotPrompts);
        setSelectedShotKey(defaultShotPrompts[0]?.key ?? "");
        setHasOverride(false);
      }
      const defaultCategory = defaultCategoryPrompts.find((item) => item.category_key === selectedCategoryKey) ?? defaultCategoryPrompts[0];
      if (defaultCategory) {
        setSelectedCategoryKey(defaultCategory.category_key);
        const categoryOverride = await adminGetUserCategoryPromptOverride(
          user.id,
          user.industry,
          defaultCategory.category_key,
        );
        setCategoryLabel(categoryOverride?.category_label ?? defaultCategory.category_label);
        setCategoryPromptText(categoryOverride?.category_prompt_text ?? defaultCategory.category_prompt_text);
        const nextShots = categoryOverride?.shot_prompts?.length
          ? categoryOverride.shot_prompts
          : defaultCategory.shot_prompts;
        setShotPrompts(nextShots);
        setSelectedShotKey(nextShots[0]?.key ?? "");
      }
      setIsLoading(false);
    })();
  }, [defaultPrompt, defaultShotPrompts, defaultCategoryPrompts, user]);

  if (!user) {
    return null;
  }

  const selectedShot = shotPrompts.find((item) => item.key === selectedShotKey) ?? shotPrompts[0] ?? null;
  const selectedShotIndex = selectedShot ? shotPrompts.findIndex((item) => item.key === selectedShot.key) : -1;

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      await adminSetUserPromptOverride(user.id, user.industry, promptText, shotPrompts);
      await adminSetUserCategoryPromptOverride(user.id, user.industry, selectedCategoryKey, {
        categoryLabel,
        categoryPromptText,
        shotPrompts,
      });
      setHasOverride(true);
      onSaved(`Custom prompt saved for ${user.displayName}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt override.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    setError("");
    try {
      await adminDeleteUserCategoryPromptOverride(user.id, user.industry, selectedCategoryKey);
      await adminDeleteUserPromptOverride(user.id, user.industry);
      onSaved(`Custom prompt removed for ${user.displayName}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove prompt override.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Prompt Override</p>
            <h2 className="font-display text-2xl font-semibold">{user.displayName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.email} · {industryLabel(user.industry)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasOverride
                ? "Editing this user's custom prompt."
                : "No custom prompt exists yet. The default prompt is loaded below and will become a user-specific override when you save."}
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select
              className="w-full rounded-2xl border border-border bg-background px-4 py-3"
              value={selectedCategoryKey}
              onChange={(event) => {
                void (async () => {
                  const nextKey = event.target.value;
                  setSelectedCategoryKey(nextKey);
                  const nextCategory = defaultCategoryPrompts.find((item) => item.category_key === nextKey);
                  if (!nextCategory || !user) {
                    return;
                  }
                  const categoryOverride = await adminGetUserCategoryPromptOverride(
                    user.id,
                    user.industry,
                    nextCategory.category_key,
                  );
                  setCategoryLabel(categoryOverride?.category_label ?? nextCategory.category_label);
                  setCategoryPromptText(categoryOverride?.category_prompt_text ?? nextCategory.category_prompt_text);
                  const nextShots = categoryOverride?.shot_prompts?.length
                    ? categoryOverride.shot_prompts
                    : nextCategory.shot_prompts;
                  setShotPrompts(nextShots);
                  setSelectedShotKey(nextShots[0]?.key ?? "");
                })();
              }}
              disabled={isLoading || isSaving}
            >
              {defaultCategoryPrompts.map((category) => (
                <option key={category.category_key} value={category.category_key}>
                  {category.category_label}
                </option>
              ))}
            </select>
          </div>
          <input
            className="w-full rounded-2xl border border-border bg-background px-4 py-3"
            value={categoryLabel}
            onChange={(event) => setCategoryLabel(event.target.value)}
            placeholder="Category label"
            disabled={isLoading || isSaving || selectedCategoryKey === "default"}
          />
          <textarea
            className="min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3"
            value={categoryPromptText}
            onChange={(event) => setCategoryPromptText(event.target.value)}
            placeholder="Category prompt"
            disabled={isLoading || isSaving}
          />
          <textarea
            className="min-h-[380px] w-full rounded-2xl border border-border bg-background px-4 py-3"
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            disabled={isLoading || isSaving}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Shot prompts</p>
            {shotPrompts.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                <select
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  value={selectedShotKey}
                  onChange={(event) => setSelectedShotKey(event.target.value)}
                  disabled={isLoading || isSaving}
                >
                  {shotPrompts.map((shotPrompt, index) => (
                    <option key={`${shotPrompt.key}-${index}`} value={shotPrompt.key}>
                      {shotPrompt.label || shotPrompt.key || `Shot ${index + 1}`}
                    </option>
                  ))}
                </select>

                {selectedShot && selectedShotIndex >= 0 ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
                        value={selectedShot.label}
                        onChange={(event) =>
                          setShotPrompts((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === selectedShotIndex ? { ...item, label: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Shot label"
                        disabled={isLoading || isSaving}
                      />
                      <input
                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
                        value={selectedShot.key}
                        onChange={(event) =>
                          setShotPrompts((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === selectedShotIndex ? { ...item, key: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Shot key"
                        disabled={isLoading || isSaving}
                      />
                    </div>
                    <textarea
                      className="min-h-[140px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                      value={selectedShot.prompt}
                      onChange={(event) =>
                        setShotPrompts((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === selectedShotIndex ? { ...item, prompt: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Shot prompt"
                      disabled={isLoading || isSaving}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No shot prompts found for this industry.</p>
            )}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50"
              onClick={handleSave}
              disabled={isLoading || isSaving || promptText.trim().length === 0}
            >
              {isLoading || isSaving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
              Save Override
            </button>
            <button
              type="button"
              className="rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive disabled:opacity-50"
              onClick={handleRemove}
              disabled={!hasOverride || isLoading || isSaving}
            >
              Remove Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPromptOverrideModal;
