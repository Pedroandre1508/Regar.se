import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireUser, spNow, errMsg } from "@/lib/garden";
import { GardenNav } from "@/components/GardenNav";
import { DropIcon } from "@/components/Drops";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: () => requireUser(false),
  head: () => ({
    meta: [
      { title: "Meu Jardim — Regar" },
      { name: "description", content: "Seu saldo de gotas, a rega diária e o canteiro de recompensas." },
      { property: "og:title", content: "Meu Jardim — Regar" },
      { property: "og:description", content: "Gotas d'água, recompensas e colheitas." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [clock, setClock] = useState(spNow());
  useEffect(() => {
    const t = setInterval(() => setClock(spNow()), 30000);
    return () => clearInterval(t);
  }, []);

  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).single()).data,
  });
  const today = useQuery({
    queryKey: ["submission", user.id, clock.day],
    queryFn: async () =>
      (await supabase.from("daily_submissions").select("id,total").eq("user_id", user.id).eq("day", clock.day).maybeSingle()).data,
  });
  const rewards = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => (await supabase.from("rewards").select("*").eq("active", true).order("cost")).data ?? [],
  });
  const inventory = useQuery({
    queryKey: ["inventory", user.id],
    queryFn: async () =>
      (await supabase.from("redemptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    const ch = supabase
      .channel("me-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () =>
        qc.invalidateQueries({ queryKey: ["profile", user.id] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "redemptions", filter: `user_id=eq.${user.id}` }, () =>
        qc.invalidateQueries({ queryKey: ["inventory", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user.id, qc]);

  const redeem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("redeem_reward", { _reward_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colhido! Seu miminho está a caminho 🌷");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      qc.invalidateQueries({ queryKey: ["inventory", user.id] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const balance = profile.data?.drops ?? 0;
  const name = profile.data?.display_name || "Daniely";
  const resting = clock.hour < 8;
  const done = !!today.data;

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-forest pb-16 text-cream">
        <GardenNav />
        <div className="animate-rise mx-auto max-w-5xl px-6 pt-8 text-center">
          <h1 className="text-5xl italic md:text-6xl">Olá, {name}</h1>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-cream/15 bg-leaf/40 px-6 py-3">
            <DropIcon className="size-6 text-tulip" />
            <span className="font-serif text-2xl tracking-display md:text-3xl">
              GOTAS D'ÁGUA: <span className="text-tulip">{balance}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-5xl space-y-14 px-6 pb-20">
        <section className="animate-rise rounded-2xl bg-leaf p-8 text-center text-cream shadow-soft">
          <p className="text-xs tracking-display text-cream/60">CHAMADA DIÁRIA</p>
          {done ? (
            <div className="mt-4">
              <span className="inline-block rounded-full bg-olive px-5 py-2 text-sm">Jardim regado hoje! 🌱</span>
              <p className="mt-3 font-serif text-lg italic text-cream/80">Próxima rega amanhã a partir das 08:00</p>
            </div>
          ) : resting ? (
            <p className="mt-4 font-serif text-xl italic text-cream/85">
              A flor está descansando… 🌙 A rega abre às 08:00.
            </p>
          ) : (
            <div className="mt-4">
              <p className="mb-5 font-serif text-xl italic text-cream/85">Seu jardim está com sede hoje.</p>
              <Link
                to="/regar"
                className="inline-flex rounded-full bg-tulip px-10 py-3 text-sm tracking-display text-cream shadow-tulip transition hover:brightness-110"
              >
                REGAR MEU DIA
              </Link>
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="Canteiro de Recompensas" />
          {rewards.data?.length === 0 && <Empty text="Nenhuma recompensa plantada ainda." />}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rewards.data?.map((r, i) => {
              const ok = balance >= r.cost;
              return (
                <article
                  key={r.id}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-rise flex flex-col items-center rounded-2xl bg-leaf p-5 text-center text-cream shadow-soft transition hover:-translate-y-1"
                >
                  <div className="text-4xl">{r.emoji}</div>
                  <h3 className="mt-2 text-xl leading-tight">{r.name}</h3>
                  {r.description && <p className="mt-1 text-xs text-cream/65">{r.description}</p>}
                  <p className="mt-3 flex items-center gap-1 text-sm">
                    <DropIcon className="size-4 text-tulip" /> {r.cost} gotas
                  </p>
                  <button
                    disabled={!ok || redeem.isPending}
                    onClick={() => redeem.mutate(r.id)}
                    className="mt-4 w-full rounded-full bg-tulip py-2 text-xs tracking-display text-cream transition hover:brightness-110 disabled:bg-olive/60 disabled:text-cream/70"
                  >
                    {ok ? "RESGATAR" : "FALTAM GOTAS"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle title="Minha Colheita" />
          {inventory.data?.length === 0 && <Empty text="Sua cesta ainda está vazia." />}
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-cream">
            {inventory.data?.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-4">
                <span className="text-2xl">{r.reward_emoji}</span>
                <div className="flex-1">
                  <p className="font-serif text-lg">{r.reward_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")} · {r.cost} gotas
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs " +
                    (r.status === "delivered" ? "bg-leaf text-cream" : "bg-tulip/10 text-tulip")
                  }
                >
                  {r.status === "delivered" ? "Concluído" : "Aguardando miminho"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-6 text-center text-3xl tracking-wide text-tulip md:text-4xl">{title}</h2>;
}
function Empty({ text }: { text: string }) {
  return <p className="text-center font-serif italic text-muted-foreground">{text}</p>;
}
