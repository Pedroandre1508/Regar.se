import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireUser, spNow } from "@/lib/garden";
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
  const dailyPhrase = useQuery({
    queryKey: ["daily-phrase", clock.day],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_phrase");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("me-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () =>
        qc.invalidateQueries({ queryKey: ["profile", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user.id, qc]);

  const balance = profile.data?.drops ?? 0;
  const nomeDoPerfil = profile.data?.display_name?.trim();
  const nomeDoMetadata =
    typeof user.user_metadata?.["display_name"] === "string"
      ? user.user_metadata["display_name"].trim()
      : "";
  const nome = nomeDoPerfil || nomeDoMetadata || user.email?.split("@")[0] || "jardineira";
  const resting = clock.hour < 8;
  const done = !!today.data;

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-forest pb-16 text-cream">
        <GardenNav />
        <div className="animate-rise mx-auto max-w-5xl px-6 pt-8 text-center">
          <h1 className="text-5xl italic md:text-6xl">Olá, {nome}</h1>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-cream/15 bg-leaf/40 px-6 py-3">
            <DropIcon className="size-6 text-tulip" />
            <span className="font-serif text-2xl tracking-display md:text-3xl">
              GOTAS D'ÁGUA: <span className="text-tulip">{balance}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-5xl space-y-14 px-6 pb-20">
        <section className="animate-rise mx-auto max-w-2xl rounded-2xl border border-leaf/15 bg-cream px-8 py-10 text-center shadow-soft">
          <p className="text-xs tracking-display text-leaf/70">UMA FRASE PARA HOJE</p>
          <blockquote className="mt-4 font-serif text-3xl italic leading-tight text-forest md:text-4xl">
            {dailyPhrase.data ? `“${dailyPhrase.data}”` : "Seu cuidado de hoje também conta."}
          </blockquote>
        </section>

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
      </main>
    </div>
  );
}
