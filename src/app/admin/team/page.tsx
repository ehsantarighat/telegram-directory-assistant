import { ShieldCheckIcon, UsersIcon } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { getUser } from "@/lib/auth/getUser";
import { fetchAdmins } from "@/lib/admin/team-queries";
import { formatRelative } from "@/lib/format/date";

import { DemoteDialog } from "./DemoteDialog";
import { PromoteForm } from "./PromoteForm";

export const metadata = {
  title: "Admin · Team",
};

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const [admins, currentUser] = await Promise.all([fetchAdmins(), getUser()]);

  return (
    <AdminShell
      title="Team & access"
      description="Promote users to admin or demote existing admins. Admin role gives access to every /admin page."
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promote a user</CardTitle>
          </CardHeader>
          <CardContent>
            <PromoteForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Current admins
              <span className="ms-1 font-normal text-muted-foreground">
                · {admins.length}
              </span>
            </CardTitle>
            <UsersIcon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </CardHeader>
          <CardContent className="p-0">
            {admins.length === 0 ? (
              <EmptyState
                icon={ShieldCheckIcon}
                title="No admins"
                description="Promote at least one user — without an admin the /admin section is unreachable."
              />
            ) : (
              <ul className="divide-y divide-border">
                {admins.map((a) => {
                  const isSelf = currentUser?.id === a.id;
                  const isLastAdmin = admins.length === 1;
                  const disabled = isSelf || isLastAdmin;
                  const reason = isSelf
                    ? "You can't demote yourself. Ask another admin."
                    : isLastAdmin
                      ? "Promote a replacement first — at least one admin must remain."
                      : undefined;
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                        aria-hidden
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">
                            {a.name ?? a.email.split("@")[0]}
                          </span>
                          {isSelf && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              You
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {a.email}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Admin since {formatRelative(a.createdAt)}
                        </span>
                      </div>
                      <DemoteDialog
                        userId={a.id}
                        email={a.email}
                        disabled={disabled}
                        disabledReason={reason}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
