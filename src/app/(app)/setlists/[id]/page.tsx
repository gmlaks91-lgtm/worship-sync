import { notFound } from "next/navigation";

import { EditSetlistDialog } from "@/features/setlist/components/EditSetlistDialog";
import { StaffNotesEditor } from "@/features/setlist/components/StaffNotesEditor";
import { TEAM_ROLE_OPTIONS, type TeamRoleCode } from "@/lib/team-roles";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function SetlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      id,title,event_date,staff_notes,
      setlist_songs(order_index,songs(id,title,youtube_url)),
      setlist_lineups(role_code,member_id,profiles(username))
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  let canManageSetlist = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    canManageSetlist = profile?.role === "leader" || profile?.role === "admin";
  }

  const { data: membersRaw } = await supabase
    .from("profiles")
    .select("id, username")
    .order("username", { ascending: true });
  const teamMembers = (membersRaw ?? []) as Array<{ id: string; username: string }>;

  const lineupMap = new Map<TeamRoleCode, string[]>();
  for (const role of TEAM_ROLE_OPTIONS) lineupMap.set(role.code, []);
  for (const row of data.setlist_lineups ?? []) {
    const existing = lineupMap.get(row.role_code as TeamRoleCode) ?? [];
    lineupMap.set(row.role_code as TeamRoleCode, [...existing, row.member_id]);
  }
  const initialLineup = TEAM_ROLE_OPTIONS.map((role) => ({
    roleCode: role.code,
    memberIds: lineupMap.get(role.code) ?? [],
  }));
  const initialTracks = (data.setlist_songs ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      title: row.songs?.title ?? "",
      youtubeUrl: row.songs?.youtube_url ?? "",
    }))
    .filter((row) => !!row.youtubeUrl);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
            <p className="text-sm text-muted-foreground">{data.event_date}</p>
          </div>
          {canManageSetlist ? (
            <EditSetlistDialog
              setlistId={data.id}
              initialTitle={data.title}
              initialEventDate={data.event_date}
              initialTracks={initialTracks}
              initialLineup={initialLineup}
              members={teamMembers}
            />
          ) : null}
        </div>
      </header>

      <section className="space-y-2 rounded-lg border border-border/60 bg-card/60 p-4">
        <h2 className="text-sm font-semibold">수록곡</h2>
        <ul className="space-y-1 text-sm">
          {(data.setlist_songs ?? [])
            .sort((a, b) => a.order_index - b.order_index)
            .map((row) => (
              <li key={`${data.id}-${row.order_index}`}>{row.songs?.title ?? "알 수 없음"}</li>
            ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-border/60 bg-card/60 p-4">
        <h2 className="text-sm font-semibold">라인업</h2>
        <ul className="space-y-1 text-sm">
          {(data.setlist_lineups ?? []).map((row, idx) => (
            <li key={`${data.id}-${row.role_code}-${idx}`}>
              {row.role_code} · {row.profiles?.username ?? "미배정"}
            </li>
          ))}
        </ul>
      </section>

      <StaffNotesEditor setlistId={data.id} initialValue={data.staff_notes} />
    </div>
  );
}
