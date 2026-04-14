import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminDefaultPromptPanel from "@/components/AdminDefaultPromptPanel";
import AdminPromptOverrideModal from "@/components/AdminPromptOverrideModal";
import AdminUsersList from "@/components/AdminUsersList";
import Navbar from "@/components/Navbar";
import {
  adminCreateUser,
  adminListDefaultCategoryPrompts,
  adminDeleteUser,
  adminListDefaultPrompts,
  adminUpsertDefaultCategoryPrompt,
  adminListUsers,
  adminUpdateDefaultPrompt,
  adminUpdateUser,
  type AdminCreateUserPayload,
  type AdminUserRecord,
} from "@/lib/api";
import { industries } from "@/lib/industries";
import { toast } from "@/components/ui/sonner";

const defaultCreateState: AdminCreateUserPayload = {
  email: "",
  password: "",
  displayName: "",
  role: "user",
  industry: "jewelry",
  defaultImageModel: "gpt-image-1.5",
  defaultBatchImageModel: "gpt-batch-api",
  enableStyleNumber: false,
  plan: "free",
};

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [defaultPrompts, setDefaultPrompts] = useState<Record<string, string>>({});
  const [defaultShotPrompts, setDefaultShotPrompts] = useState<
    Record<string, { key: string; label: string; prompt: string }[]>
  >({});
  const [defaultCategoryPrompts, setDefaultCategoryPrompts] = useState<
    Record<string, { category_key: string; category_label: string; category_prompt_text: string; shot_prompts: { key: string; label: string; prompt: string }[] }[]>
  >({});
  const [selectedIndustry, setSelectedIndustry] = useState("jewelry");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("default");
  const [message, setMessage] = useState("");
  const [createState, setCreateState] = useState<AdminCreateUserPayload>(defaultCreateState);
  const [modalUser, setModalUser] = useState<AdminUserRecord | null>(null);

  const loadAll = async () => {
    const [userRows, promptRows] = await Promise.all([adminListUsers(), adminListDefaultPrompts()]);
    setUsers(userRows);
    setDefaultPrompts(Object.fromEntries(promptRows.map((row) => [row.industry, row.prompt_text])));
    setDefaultShotPrompts(Object.fromEntries(promptRows.map((row) => [row.industry, row.shot_prompts || []])));

    const categoryEntries = await Promise.all(
      industries.map(async (industry) => ({
        industry: industry.id,
        categories: await adminListDefaultCategoryPrompts(industry.id),
      })),
    );
    setDefaultCategoryPrompts(Object.fromEntries(categoryEntries.map((entry) => [entry.industry, entry.categories])));
    const selectedCategories = categoryEntries.find((entry) => entry.industry === selectedIndustry)?.categories ?? [];
    setSelectedCategoryKey((prev) => (selectedCategories.some((item) => item.category_key === prev) ? prev : (selectedCategories[0]?.category_key ?? "default")));
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await adminCreateUser(createState);
    setCreateState(defaultCreateState);
    setMessage("User created.");
    await loadAll();
  };

  const handleSaveUser = async (user: AdminUserRecord) => {
    await adminUpdateUser(user.id, {
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      industry: user.industry,
      defaultImageModel: user.defaultImageModel,
      defaultBatchImageModel: user.defaultBatchImageModel,
      enableStyleNumber: user.enableStyleNumber,
      plan: user.plan,
    });
    setMessage(`Changes saved successfully for ${user.displayName}.`);
    toast.success(`Changes saved for ${user.displayName}.`);
    await loadAll();
  };

  const handleDeleteUser = async (userId: string) => {
    await adminDeleteUser(userId);
    setMessage("User deleted.");
    await loadAll();
  };

  const handleSavePromptHierarchy = async () => {
    const category = (defaultCategoryPrompts[selectedIndustry] ?? []).find((item) => item.category_key === selectedCategoryKey);
    await adminUpdateDefaultPrompt(selectedIndustry, defaultPrompts[selectedIndustry] ?? "");
    if (category) {
      await adminUpsertDefaultCategoryPrompt(selectedIndustry, category.category_key, {
        categoryLabel: category.category_label,
        categoryPromptText: category.category_prompt_text,
        shotPrompts: category.shot_prompts,
      });
    }
    setMessage("Prompt hierarchy updated.");
    toast.success("Prompt hierarchy saved.");
    await loadAll();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-28 pb-16 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Superadmin</p>
          <h1 className="font-display text-3xl font-bold">Users & Prompts</h1>
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
        </div>

        <AdminDefaultPromptPanel
          defaultPrompts={defaultPrompts}
          defaultCategoryPrompts={defaultCategoryPrompts}
          selectedIndustry={selectedIndustry}
          selectedCategoryKey={selectedCategoryKey}
          onSelectedIndustryChange={(industry) => {
            setSelectedIndustry(industry);
            const categories = defaultCategoryPrompts[industry] ?? [];
            setSelectedCategoryKey(categories[0]?.category_key ?? "default");
          }}
          onSelectedCategoryKeyChange={setSelectedCategoryKey}
          onPromptChange={(industry, promptText) =>
            setDefaultPrompts((prev) => ({ ...prev, [industry]: promptText }))
          }
          onCategoryChange={(industry, categoryKey, next) =>
            setDefaultCategoryPrompts((prev) => ({
              ...prev,
              [industry]: (prev[industry] ?? []).map((item) =>
                item.category_key === categoryKey
                  ? {
                      ...item,
                      category_label: next.category_label,
                      category_prompt_text: next.category_prompt_text,
                      shot_prompts: next.shot_prompts,
                    }
                  : item,
              ),
            }))
          }
          onSaveAll={handleSavePromptHierarchy}
        />

        <section className="rounded-3xl border border-border bg-card/80 p-6 space-y-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Create User</h2>
          </div>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={handleCreateUser}>
              <input
                className="rounded-2xl border border-border bg-background px-4 py-3"
                placeholder="Display name"
                value={createState.displayName}
                onChange={(event) => setCreateState((prev) => ({ ...prev, displayName: event.target.value }))}
                required
              />
              <input
                className="rounded-2xl border border-border bg-background px-4 py-3"
                placeholder="Email"
                type="email"
                value={createState.email}
                onChange={(event) => setCreateState((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
              <input
                className="rounded-2xl border border-border bg-background px-4 py-3"
                placeholder="Password"
                type="password"
                value={createState.password}
                onChange={(event) => setCreateState((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <select
                className="rounded-2xl border border-border bg-background px-4 py-3"
                value={createState.role}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, role: event.target.value as "user" | "superadmin" }))
                }
              >
                <option value="user">User</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Industry</span>
                <select
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                  value={createState.industry}
                  onChange={(event) => setCreateState((prev) => ({ ...prev, industry: event.target.value }))}
                >
                  {industries.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Model for single product</span>
                <select
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                  value={createState.defaultImageModel}
                  onChange={(event) =>
                    setCreateState((prev) => ({
                      ...prev,
                      defaultImageModel: event.target.value as "reve" | "gpt-image-1.5" | "gpt-batch-api",
                    }))
                  }
                >
                  <option value="gpt-image-1.5">gpt-image-1.5</option>
                  <option value="reve">reve</option>
                  <option value="gpt-batch-api">gpt batch api</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Model for batch processing</span>
                <select
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                  value={createState.defaultBatchImageModel}
                  onChange={(event) =>
                    setCreateState((prev) => ({
                      ...prev,
                      defaultBatchImageModel: event.target.value as "reve" | "gpt-image-1.5" | "gpt-batch-api",
                    }))
                  }
                >
                  <option value="gpt-image-1.5">gpt-image-1.5</option>
                  <option value="reve">reve</option>
                  <option value="gpt-batch-api">gpt batch api</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Subscription</span>
                <select
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                  value={createState.plan}
                  onChange={(event) => setCreateState((prev) => ({ ...prev, plan: event.target.value }))}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3">
                <input
                  type="checkbox"
                  checked={createState.enableStyleNumber}
                  onChange={(event) =>
                    setCreateState((prev) => ({
                      ...prev,
                      enableStyleNumber: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm">Style Number</span>
              </label>
              <button
                type="submit"
                className="rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground md:col-span-4 md:justify-self-center w-full md:max-w-md"
              >
                Create User
              </button>
          </form>
        </section>

        <AdminUsersList
          users={users}
          onUsersChange={setUsers}
          onSaveUser={(user) => void handleSaveUser(user)}
          onDeleteUser={(userId) => void handleDeleteUser(userId)}
          onOpenOverride={setModalUser}
          onViewProjects={(user) =>
            navigate(
              `/projects?admin_user_id=${encodeURIComponent(user.id)}&admin_user_name=${encodeURIComponent(user.displayName)}`,
            )
          }
        />
      </div>

      {modalUser ? (
        <AdminPromptOverrideModal
          user={modalUser}
          defaultPrompt={defaultPrompts[modalUser.industry] ?? ""}
          defaultShotPrompts={defaultShotPrompts[modalUser.industry] ?? []}
          defaultCategoryPrompts={defaultCategoryPrompts[modalUser.industry] ?? []}
          onClose={() => setModalUser(null)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            toast.success(nextMessage);
            void loadAll();
          }}
        />
      ) : null}
    </div>
  );
};

export default AdminUsersPage;
