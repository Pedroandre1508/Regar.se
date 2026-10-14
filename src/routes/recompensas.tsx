import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, requireUser } from "@/lib/garden";
import { GardenNav } from "@/components/GardenNav";
import { DropIcon } from "@/components/Drops";

export const Route = createFileRoute("/recompensas")({
  ssr: false,
  beforeLoad: () => requireUser(false),
  head: () => ({
    meta: [
      { title: "Recompensas — Regar" },
      { name: "description", content: "Troque suas gotas por pequenos mimos e acompanhe sua colheita." },
      { property: "og:title", content: "Recompensas — Regar" },
      { property: "og:description", content: "Seu canteiro de recompensas e sua colheita." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("drops").eq("id", user.id).single()).data,
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
    const channel = supabase
      .channel("rewards-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "redemptions", filter: `user_id=eq.${user.id}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["inventory", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user.id]);

  const redeem = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase.rpc("redeem_reward", { _reward_id: rewardId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colhido! Seu miminho está a caminho 🌷");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["inventory", user.id] });
    },
    onError: (error) => toast.error(errMsg(error)),
  });

  const balance = profile.data?.drops ?? 0;

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-forest pb-14 text-cream">
        <GardenNav />
        <div className="animate-rise mx-auto max-w-5xl px-6 pt-6 text-center">
          <p className="text-xs tracking-display text-cream/60">SEU CANTEIRO</p>
          <h1 className="mt-2 text-5xl italic md:text-6xl">Recompensas</h1>
          <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-cream/15 bg-leaf/40 px-6 py-3">
            <DropIcon className="size-5 text-tulip" />
            <span className="font-serif text-2xl tracking-display">
              {balance} gotas disponíveis
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-6 py-12 pb-20">
        <section>
          <SectionTitle title="Canteiro de Recompensas" />
          {rewards.data?.length === 0 && <Empty text="Nenhuma recompensa plantada ainda." />}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rewards.data?.map((reward, index) => {
              const canRedeem = balance >= reward.cost;
              return (
                <article
                  key={reward.id}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="animate-rise flex flex-col items-center rounded-2xl bg-leaf p-5 text-center text-cream shadow-soft transition hover:-translate-y-1"
                >
                  <div className="text-4xl">{reward.emoji}</div>
                  <h3 className="mt-2 text-xl leading-tight">{reward.name}</h3>
                  {reward.description && <p className="mt-1 text-xs text-cream/65">{reward.description}</p>}
                  <p className="mt-3 flex items-center gap-1 text-sm">
                    <DropIcon className="size-4 text-tulip" /> {reward.cost} gotas
                  </p>
                  <button
                    disabled={!canRedeem || redeem.isPending}
                    onClick={() => redeem.mutate(reward.id)}
                    className="mt-4 w-full rounded-full bg-tulip py-2 text-xs tracking-display text-cream transition hover:brightness-110 disabled:bg-olive/60 disabled:text-cream/70"
                  >
                    {canRedeem ? "RESGATAR" : "FALTAM GOTAS"}
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
            {inventory.data?.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                <span className="text-2xl">{item.reward_emoji}</span>
                <div className="flex-1">
                  <p className="font-serif text-lg">{item.reward_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")} · {item.cost} gotas
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs " +
                    (item.status === "delivered" ? "bg-leaf text-cream" : "bg-tulip/10 text-tulip")
                  }
                >
                  {item.status === "delivered" ? "Concluído" : "Aguardando miminho"}
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
