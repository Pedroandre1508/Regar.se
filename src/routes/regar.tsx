import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireUser, spNow, errMsg } from "@/lib/garden";
import { GardenNav } from "@/components/GardenNav";
import { DropIcon } from "@/components/Drops";

export const Route = createFileRoute("/regar")({
  ssr: false,
  beforeLoad: () => requireUser(false),
  head: () => ({
    meta: [
      { title: "Rega Diária — Regar" },
      { name: "description", content: "Responda as perguntas do dia e ganhe gotas d'água." },
      { property: "og:title", content: "Rega Diária — Regar" },
      { property: "og:description", content: "O questionário diário do seu jardim." },
    ],
  }),
  component: RegarPage,
});

function RegarPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { day, hour } = spNow();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const done = useQuery({
    queryKey: ["submission", user.id, day],
    queryFn: async () =>
      (await supabase.from("daily_submissions").select("id,total").eq("user_id", user.id).eq("day", day).maybeSingle()).data,
  });
  const questions = useQuery({
    queryKey: ["questions-active"],
    queryFn: async () =>
      (
        await supabase
          .from("questions")
          .select("id,text,question_options(id,label,points,position)")
          .eq("active", true)
          .order("position")
      ).data ?? [],
  });
  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("drops").eq("id", user.id).single()).data,
  });

  const qs = questions.data ?? [];
  const complete = qs.length > 0 && qs.every((q) => answers[q.id]);

  async function submit() {
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_daily", { _option_ids: Object.values(answers) });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    setResult(data ?? 0);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    qc.invalidateQueries({ queryKey: ["submission", user.id, day] });
  }

  let body;
  if (result !== null) {
    body = (
      <div className="animate-rise mx-auto max-w-md rounded-2xl bg-leaf p-10 text-center text-cream shadow-soft">
        <p className="font-serif text-xl italic">Obrigado por responder</p>
        <div className="animate-drop mt-6 flex justify-center">
          <DropIcon className="size-20 text-tulip" />
        </div>
        <p className="animate-rise mt-4 font-serif text-6xl [animation-delay:.4s]">
          {result >= 0 ? "+" : ""}
          {result}
        </p>
        <p className="text-sm text-cream/70">gotas hoje</p>
        <p className="mt-6 font-serif text-2xl tracking-display text-tulip">GOTAS D'ÁGUA: {profile.data?.drops ?? "…"}</p>
        <Link to="/dashboard" className="mt-8 inline-flex rounded-full bg-olive px-8 py-2 text-xs tracking-display">
          VOLTAR AO JARDIM
        </Link>
      </div>
    );
  } else if (done.data) {
    body = <Note text="Jardim regado hoje! Próxima rega amanhã a partir das 08:00." />;
  } else if (hour < 8) {
    body = <Note text="A flor está descansando 🌙 Volte a partir das 08:00." />;
  } else if (questions.isSuccess && qs.length === 0) {
    body = <Note text="Nenhuma pergunta foi cadastrada para hoje." />;
  } else {
    body = (
      <div className="mx-auto max-w-xl space-y-10">
        <p className="text-center font-serif text-xl italic text-cream/80">Questionário de perguntas diárias</p>
        {qs.map((q, i) => (
          <section key={q.id} className="animate-rise text-center" style={{ animationDelay: `${i * 90}ms` }}>
            <h2 className="mb-4 text-2xl italic">{q.text}</h2>
            <div className="flex flex-col items-center gap-3">
              {[...q.question_options]
                .sort((a, b) => a.position - b.position)
                .map((o) => {
                  const sel = answers[q.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                      className={
                        "w-full max-w-sm rounded-lg px-5 py-3 text-sm transition " +
                        (sel ? "bg-tulip text-cream shadow-tulip scale-[1.02]" : "bg-olive text-cream hover:brightness-110")
                      }
                    >
                      {o.label}
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
        <div className="text-center">
          <button
            disabled={!complete || busy}
            onClick={submit}
            className="rounded-full bg-tulip px-12 py-3 text-sm tracking-display text-cream shadow-tulip transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "REGANDO…" : "REGAR"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forest text-cream">
      <GardenNav />
      <main className="px-6 py-10">{body}</main>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <div className="animate-rise mx-auto max-w-md rounded-2xl bg-leaf p-10 text-center shadow-soft">
      <p className="font-serif text-2xl italic">{text}</p>
      <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-olive px-8 py-2 text-xs tracking-display">
        VOLTAR AO JARDIM
      </Link>
    </div>
  );
}
