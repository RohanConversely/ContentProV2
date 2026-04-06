import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type AdminUserRecord } from "@/lib/api";
import { industries, industryLabel } from "@/lib/industries";

interface AdminUsersListProps {
  onDeleteUser: (userId: string) => void;
  onOpenOverride: (user: AdminUserRecord) => void;
  onViewProjects: (user: AdminUserRecord) => void;
  onSaveUser: (user: AdminUserRecord) => void;
  users: AdminUserRecord[];
  onUsersChange: (users: AdminUserRecord[]) => void;
}

const AdminUsersList = ({
  onDeleteUser,
  onOpenOverride,
  onViewProjects,
  onSaveUser,
  users,
  onUsersChange,
}: AdminUsersListProps) => {
  const [query, setQuery] = useState("");
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AdminUserRecord | null>(null);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => {
      const haystack = `${user.displayName} ${user.email}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, users]);

  const toggleExpanded = (userId: string) => {
    setExpandedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const updateUser = (userId: string, updates: Partial<AdminUserRecord>) => {
    onUsersChange(users.map((item) => (item.id === userId ? { ...item, ...updates } : item)));
  };

  return (
    <section className="rounded-3xl border border-border bg-card/80 p-6 space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Current Users</h2>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4"
            placeholder="Search by name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="max-h-[720px] space-y-3 overflow-y-auto pr-2">
        {filteredUsers.map((user) => {
          const isExpanded = expandedUserIds.includes(user.id);
          return (
            <div key={user.id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => toggleExpanded(user.id)}
                >
                  <p className="truncate font-medium text-foreground">{user.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleExpanded(user.id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {isExpanded ? (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-xl border border-border bg-card px-3 py-2"
                      value={user.displayName}
                      onChange={(event) => updateUser(user.id, { displayName: event.target.value })}
                    />
                    <input
                      className="rounded-xl border border-border bg-card px-3 py-2"
                      value={user.email}
                      onChange={(event) => updateUser(user.id, { email: event.target.value })}
                    />
                    <select
                      className="rounded-xl border border-border bg-card px-3 py-2"
                      value={user.role}
                      onChange={(event) =>
                        updateUser(user.id, { role: event.target.value as "user" | "superadmin" })
                      }
                    >
                      <option value="user">User</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                    <select
                      className="rounded-xl border border-border bg-card px-3 py-2"
                      value={user.industry}
                      onChange={(event) => updateUser(user.id, { industry: event.target.value })}
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
                        className="w-full rounded-xl border border-border bg-card px-3 py-2"
                        value={user.defaultImageModel}
                        onChange={(event) =>
                          updateUser(user.id, {
                            defaultImageModel: event.target.value as "reve" | "gpt-image-1.5" | "gpt-batch-api",
                          })
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
                        className="w-full rounded-xl border border-border bg-card px-3 py-2"
                        value={user.defaultBatchImageModel}
                        onChange={(event) =>
                          updateUser(user.id, {
                            defaultBatchImageModel: event.target.value as "reve" | "gpt-image-1.5" | "gpt-batch-api",
                          })
                        }
                      >
                        <option value="gpt-image-1.5">gpt-image-1.5</option>
                        <option value="reve">reve</option>
                        <option value="gpt-batch-api">gpt batch api</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={user.enableStyleNumber}
                        onChange={(event) =>
                          updateUser(user.id, {
                            enableStyleNumber: event.target.checked,
                          })
                        }
                      />
                      <span className="text-sm">Style Number</span>
                    </label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Plan: {user.plan} · Industry: {industryLabel(user.industry)} · Single: {user.defaultImageModel} · Batch: {user.defaultBatchImageModel} · Style Number: {user.enableStyleNumber ? "Enabled" : "Disabled"}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-xl border border-border px-4 py-2 text-sm"
                      onClick={() => onSaveUser(user)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive"
                      onClick={() => setPendingDeleteUser(user)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-border px-4 py-2 text-sm"
                      onClick={() => onOpenOverride(user)}
                    >
                      Prompt Override
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-border px-4 py-2 text-sm"
                      onClick={() => onViewProjects(user)}
                    >
                      View Projects
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            No users match your search.
          </div>
        ) : null}
      </div>

      <AlertDialog open={Boolean(pendingDeleteUser)} onOpenChange={(open) => !open && setPendingDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDeleteUser?.displayName} and their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDeleteUser) return;
                onDeleteUser(pendingDeleteUser.id);
                setPendingDeleteUser(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default AdminUsersList;
