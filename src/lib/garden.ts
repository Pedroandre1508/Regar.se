import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requireUser(admin = false) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/login" });
  const isAdmin = await checkAdmin(data.user.id);
  if (admin && !isAdmin) throw redirect({ to: "/dashboard" });
  if (!admin && isAdmin) throw redirect({ to: "/admin" });
  return { user: data.user, isAdmin };
}

export async function checkAdmin(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** Hour & date in São Paulo time — the garden follows Brazilian time. */
export function spNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

export function errMsg(e: unknown) {
  return e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Algo deu errado";
}
