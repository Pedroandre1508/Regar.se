import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireUser, errMsg } from "@/lib/garden";
import { GardenNav } from "@/components/GardenNav";
import { DropIcon } from "@/components/Drops";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => requireUser(true),
  head: () => ({
    meta: [
      { title: "Painel ADM — Regar" },
      { name: "description", content: "Gerencie perguntas, recompensas e gotas do jardim." },
      { property: "og:title", content: "Painel ADM — Regar" },
      { property: "og:description", content: "Administração do jardim Regar." },
    ],
  }),
  component: Admin,
});

const input =
  "w-full rounded-lg border border-input bg-cream px-4 py-2 text-sm text-forest outline-none focus:ring-2 focus:ring-olive";
const btn = "rounded-full px-5 py-2 text-xs tracking-display transition hover:brightness-110 disabled:opacity-50";

function Admin() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const gardeners = useQuery({
    queryKey: ["gardeners"],
    queryFn: async () => {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = new Set((admins ?? []).map((a) => a.user_id));
      const { data } = await supabase.from("profiles").select("*").order("created_at");
      return (data ?? []).filter((p) => !ids.has(p.id));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("adm")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        qc.invalidateQueries({ queryKey: ["gardeners"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "redemptions" }, () =>
        qc.invalidateQueries({ queryKey: ["all-redemptions"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-forest pb-14 text-cream">
        <GardenNav admin />
        <div className="animate-rise mx-auto max-w-5xl px-6 pt-6 text-center">
          <h1 className="text-5xl italic">Olá, Pedro</h1>
          {gardeners.data?.length === 0 && (
            <p className="mt-4 text-sm text-cream/60">Nenhuma jardineira cadastrada ainda.</p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {gardeners.data?.map((g) => (
              <BalanceCard key={g.id} id={g.id} name={g.display_name} drops={g.drops} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Tabs defaultValue="questions">
          <TabsList className="mx-auto mb-8 flex w-fit bg-muted">
            <TabsTrigger value="questions">Perguntas Diárias</TabsTrigger>
            <TabsTrigger value="rewards">Recompensas</TabsTrigger>
          </TabsList>
          <TabsContent value="questions">
            <QuestionsTab />
          </TabsContent>
          <TabsContent value="rewards">
            <RewardsTab adminId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function BalanceCard({ id, name, drops }: { id: string; name: string; drops: number }) {
  const qc = useQueryClient();
  const [delta, setDelta] = useState("");
  async function adjust() {
    const n = parseInt(delta, 10);
    if (!n) return;
    const { error } = await supabase.rpc("admin_adjust_drops", { _user_id: id, _delta: n });
    if (error) return toast.error(errMsg(error));
    setDelta("");
    toast.success("Saldo ajustado");
    qc.invalidateQueries({ queryKey: ["gardeners"] });
  }
  return (
    <div className="rounded-2xl bg-leaf/50 px-6 py-4">
      <p className="font-serif text-2xl tracking-display">
        GOTAS D'ÁGUA DA {name.toUpperCase()}: <span className="text-tulip">{drops}</span>
      </p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <input
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="+10 ou -5"
          className="w-28 rounded-full bg-cream px-4 py-1.5 text-center text-sm text-forest outline-none"
          inputMode="numeric"
        />
        <button onClick={adjust} className={btn + " bg-olive text-cream"}>
          AJUSTAR
        </button>
      </div>
    </div>
  );
}

function QuestionsTab() {
  const qc = useQueryClient();
  const questions = useQuery({
    queryKey: ["admin-questions"],
    queryFn: async () =>
      (await supabase.from("questions").select("*,question_options(*)").order("position").order("created_at")).data ?? [],
  });
  const [text, setText] = useState("");
  const [opts, setOpts] = useState([
    { label: "", points: "10" },
    { label: "", points: "3" },
    { label: "", points: "-10" },
  ]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
    qc.invalidateQueries({ queryKey: ["questions-active"] });
  };

  async function create(e: FormEvent) {
    e.preventDefault();
    const clean = opts.filter((o) => o.label.trim());
    if (!text.trim() || clean.length < 2) return toast.error("Informe a pergunta e ao menos 2 opções");
    const { data: q, error } = await supabase
      .from("questions")
      .insert({ text: text.trim().slice(0, 300), position: (questions.data?.length ?? 0) + 1 })
      .select()
      .single();
    if (error || !q) return toast.error(errMsg(error));
    const { error: e2 } = await supabase.from("question_options").insert(
      clean.map((o, i) => ({ question_id: q.id, label: o.label.trim().slice(0, 200), points: parseInt(o.points, 10) || 0, position: i })),
    );
    if (e2) return toast.error(errMsg(e2));
    setText("");
    setOpts([
      { label: "", points: "10" },
      { label: "", points: "3" },
      { label: "", points: "-10" },
    ]);
    toast.success("Pergunta plantada");
    refresh();
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("questions").update({ active }).eq("id", id);
    if (error) toast.error(errMsg(error));
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta pergunta?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) toast.error(errMsg(error));
    refresh();
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_380px]">
      <ul className="space-y-3">
        {questions.data?.map((q) => (
          <li key={q.id} className="rounded-2xl bg-leaf p-4 text-cream shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <p className="font-serif text-xl">{q.text}</p>
              <div className="flex items-center gap-3">
                <Switch checked={q.active} onCheckedChange={(v) => toggle(q.id, v)} />
                <button onClick={() => remove(q.id)} aria-label="Excluir" className="text-cream/60 hover:text-tulip">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...q.question_options]
                .sort((a, b) => a.position - b.position)
                .map((o) => (
                  <span key={o.id} className="rounded-full bg-olive/70 px-3 py-1 text-xs">
                    {o.label} · {o.points > 0 ? "+" : ""}
                    {o.points}
                  </span>
                ))}
            </div>
          </li>
        ))}
        {questions.data?.length === 0 && <p className="font-serif italic text-muted-foreground">Nenhuma pergunta ainda.</p>}
      </ul>

      <form onSubmit={create} className="h-fit space-y-3 rounded-2xl bg-forest p-6 text-cream shadow-soft">
        <h3 className="text-center text-2xl italic">Nova pergunta</h3>
        <input className={input} placeholder="Ex: Como foi o café da manhã?" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex justify-between px-1 text-xs text-cream/60">
          <span>Resposta</span>
          <span>Gotas</span>
        </div>
        {opts.map((o, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={input}
              placeholder={`Opção ${i + 1}`}
              value={o.label}
              onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <input
              className={input + " w-20 text-center"}
              value={o.points}
              onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, points: e.target.value } : x)))}
            />
            {opts.length > 2 && (
              <button type="button" onClick={() => setOpts(opts.filter((_, j) => j !== i))} className="text-cream/50 hover:text-tulip">
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOpts([...opts, { label: "", points: "0" }])}
          className="flex items-center gap-1 text-xs text-cream/70 hover:text-cream"
        >
          <Plus className="size-3" /> adicionar opção
        </button>
        <button className={btn + " w-full bg-tulip text-cream"}>SALVAR PERGUNTA</button>
      </form>
    </div>
  );
}

function RewardsTab({ adminId: _ }: { adminId: string }) {
  const qc = useQueryClient();
  const rewards = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: async () => (await supabase.from("rewards").select("*").order("created_at")).data ?? [],
  });
  const redemptions = useQuery({
    queryKey: ["all-redemptions"],
    queryFn: async () => (await supabase.from("redemptions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [form, setForm] = useState({ name: "", description: "", cost: "", emoji: "🌷" });

  async function create(e: FormEvent) {
    e.preventDefault();
    const cost = parseInt(form.cost, 10);
    if (!form.name.trim() || !(cost > 0)) return toast.error("Nome e custo (maior que 0) são obrigatórios");
    const { error } = await supabase.from("rewards").insert({
      name: form.name.trim().slice(0, 80),
      description: form.description.trim().slice(0, 200),
      cost,
      emoji: form.emoji.trim().slice(0, 8) || "🌷",
    });
    if (error) return toast.error(errMsg(error));
    setForm({ name: "", description: "", cost: "", emoji: "🌷" });
    toast.success("Recompensa plantada");
    qc.invalidateQueries({ queryKey: ["admin-rewards"] });
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("rewards").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-rewards"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta recompensa?")) return;
    const { error } = await supabase.from("rewards").delete().eq("id", id);
    if (error) toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["admin-rewards"] });
  }
  async function deliver(id: string) {
    const { error } = await supabase
      .from("redemptions")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(errMsg(error));
    toast.success("Marcado como entregue 💐");
    qc.invalidateQueries({ queryKey: ["all-redemptions"] });
  }

  return (
    <div className="space-y-12">
      <div className="grid gap-8 md:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {rewards.data?.map((r) => (
            <div key={r.id} className={"rounded-2xl bg-leaf p-4 text-center text-cream shadow-soft " + (r.active ? "" : "opacity-50")}>
              <div className="text-3xl">{r.emoji}</div>
              <p className="mt-1 font-serif text-lg leading-tight">{r.name}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs">
                <DropIcon className="size-3 text-tulip" /> {r.cost}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} />
                <button onClick={() => remove(r.id)} aria-label="Excluir" className="text-cream/60 hover:text-tulip">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={create} className="h-fit space-y-3 rounded-2xl bg-forest p-6 text-cream shadow-soft">
          <h3 className="text-center text-2xl italic">Nova recompensa</h3>
          <div className="flex gap-2">
            <input className={input + " w-16 text-center"} value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
            <input className={input} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <input className={input} placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={input} placeholder="Custo em gotas" inputMode="numeric" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <button className={btn + " w-full bg-tulip text-cream"}>SALVAR RECOMPENSA</button>
        </form>
      </div>

      <section>
        <h3 className="mb-4 text-center text-3xl text-tulip">Resgates</h3>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border">
          {redemptions.data?.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-3">
              <span className="text-2xl">{r.reward_emoji}</span>
              <div className="flex-1">
                <p className="font-serif text-lg">{r.reward_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR")} · {r.cost} gotas
                </p>
              </div>
              {r.status === "delivered" ? (
                <span className="rounded-full bg-leaf px-3 py-1 text-xs text-cream">Concluído</span>
              ) : (
                <button onClick={() => deliver(r.id)} className={btn + " bg-olive text-cream"}>
                  MARCAR ENTREGUE
                </button>
              )}
            </li>
          ))}
          {redemptions.data?.length === 0 && (
            <li className="px-5 py-6 text-center font-serif italic text-muted-foreground">Nenhum resgate ainda.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
