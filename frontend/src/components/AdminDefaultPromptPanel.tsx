import { industries, industryLabel } from "@/lib/industries";

interface AdminDefaultPromptPanelProps {
  defaultPrompts: Record<string, string>;
  selectedIndustry: string;
  onSelectedIndustryChange: (industry: string) => void;
  onPromptChange: (industry: string, promptText: string) => void;
  onSave: () => void;
}

const AdminDefaultPromptPanel = ({
  defaultPrompts,
  selectedIndustry,
  onSelectedIndustryChange,
  onPromptChange,
  onSave,
}: AdminDefaultPromptPanelProps) => (
  <section className="rounded-3xl border border-border bg-card/80 p-6 space-y-6">
    <div className="space-y-2">
      <h2 className="font-display text-xl font-semibold">Industry Prompts</h2>
      <select
        className="w-full rounded-2xl border border-border bg-background px-4 py-3"
        value={selectedIndustry}
        onChange={(event) => onSelectedIndustryChange(event.target.value)}
      >
        {industries.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>

    <div className="space-y-2">
      <p className="text-sm font-medium">Default prompt for {industryLabel(selectedIndustry)}</p>
      <textarea
        className="min-h-[320px] w-full rounded-2xl border border-border bg-background px-4 py-3"
        value={defaultPrompts[selectedIndustry] ?? ""}
        onChange={(event) => onPromptChange(selectedIndustry, event.target.value)}
      />
      <button className="rounded-xl border border-border px-4 py-2 text-sm" onClick={onSave}>
        Save Default Prompt
      </button>
    </div>
  </section>
);

export default AdminDefaultPromptPanel;
