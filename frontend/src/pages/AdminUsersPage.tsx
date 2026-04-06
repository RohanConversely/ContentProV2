import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminDefaultPromptPanel from "@/components/AdminDefaultPromptPanel";
import AdminPromptOverrideModal from "@/components/AdminPromptOverrideModal";
import AdminUsersList from "@/components/AdminUsersList";
import Navbar from "@/components/Navbar";
import {
  adminCreateUser,
  adminDeleteUser,
  adminListDefaultPrompts,
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
  plan: "free",
};

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [defaultPrompts, setDefaultPrompts] = useState<Record<string, string>>({});
  const [defaultShotPrompts, setDefaultShotPrompts] = useState<
    Record<string, { key: string; label: string; prompt: string }[]>
  >({});
  const [selectedIndustry, setSelectedIndustry] = useState("jewelry");
  const [message, setMessage] = useState("");
  const [createState, setCreateState] = useState<AdminCreateUserPayload>(defaultCreateState);
  const [modalUser, setModalUser] = useState<AdminUserRecord | null>(null);

  const loadAll = async () => {
    const [userRows, promptRows] = await Promise.all([adminListUsers(), adminListDefaultPrompts()]);
    setUsers(userRows);
    setDefaultPrompts(Object.fromEntries(promptRows.map((row) => [row.industry, row.prompt_text])));
    setDefaultShotPrompts(Object.fromEntries(promptRows.map((row) => [row.industry, row.shot_prompts || []])));
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

  const handleSaveDefaultPrompt = async () => {
    await adminUpdateDefaultPrompt(selectedIndustry, defaultPrompts[selectedIndustry] ?? "");
    setMessage("Default prompt updated.");
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

        <div className="grid gap-8 xl:grid-cols-[1.2fr,0.8fr]">
          <section className="rounded-3xl border border-border bg-card/80 p-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold">Create User</h2>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateUser}>
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
              <select
                className="rounded-2xl border border-border bg-background px-4 py-3"
                value={createState.industry}
                onChange={(event) => setCreateState((prev) => ({ ...prev, industry: event.target.value }))}
              >
                {industries.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
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
              <select
                className="rounded-2xl border border-border bg-background px-4 py-3"
                value={createState.plan}
                onChange={(event) => setCreateState((prev) => ({ ...prev, plan: event.target.value }))}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground md:col-span-2"
              >
                Create User
              </button>
            </form>
          </section>

          <AdminDefaultPromptPanel
            defaultPrompts={defaultPrompts}
            selectedIndustry={selectedIndustry}
            onSelectedIndustryChange={setSelectedIndustry}
            onPromptChange={(industry, promptText) =>
              setDefaultPrompts((prev) => ({ ...prev, [industry]: promptText }))
            }
            onSave={handleSaveDefaultPrompt}
          />
        </div>

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
