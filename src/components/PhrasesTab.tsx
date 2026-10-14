import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/garden";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function PhrasesTab() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const phrases = useQuery({
    queryKey: ["admin-phrases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_phrases").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async (action: { kind: "create" } | { kind: "toggle"; id: string; active: boolean } | { kind: "delete"; id: string }) => {
      const result = action.kind === "create"
        ? await supabase.from("daily_phrases").insert({ text: text.trim() })
        : action.kind === "toggle"
          ? await supabase.from("daily_phrases").update({ active: action.active }).eq("id", action.id)
          : await supabase.from("daily_phrases").delete().eq("id", action.id);
      if (result.error) throw result.error;
      return action.kind;
    },
    onSuccess: (kind) => {
      if (kind === "create") { setText(""); toast.success("Frase plantada com carinho"); }
      qc.invalidateQueries({ queryKey: ["admin-phrases"] });
      qc.invalidateQueries({ queryKey: ["daily-phrase"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) save.mutate({ kind: "create" });
  }
  return (
    <div className="grid items-start gap-8 md:grid-cols-[1fr_340px]">
      <ul className="space-y-3">
        {phrases.data?.map((phrase) => (
          <li key={phrase.id} className="flex items-start gap-4 rounded-lg bg-leaf p-5 text-cream shadow-soft">
            <p className="min-w-0 flex-1 break-words font-serif text-xl italic">“{phrase.text}”</p>
            <div className="flex shrink-0 items-center gap-2">
              <Switch aria-label={`Ativar frase: ${phrase.text}`} checked={phrase.active} disabled={save.isPending} onCheckedChange={(active) => save.mutate({ kind: "toggle", id: phrase.id, active })} />
              <Button variant="ghost" size="icon" title="Excluir frase" aria-label="Excluir frase" disabled={save.isPending} onClick={() => { if (confirm("Excluir esta frase?")) save.mutate({ kind: "delete", id: phrase.id }); }}><Trash2 /></Button>
            </div>
          </li>
        ))}
        {phrases.isPending && <p role="status">Carregando frases…</p>}
        {phrases.isError && <p role="alert">Não foi possível carregar as frases.</p>}
        {phrases.data?.length === 0 && <p className="font-serif italic text-muted-foreground">Nenhuma frase plantada ainda.</p>}
      </ul>
      <form onSubmit={submit} className="space-y-4 rounded-lg bg-forest p-6 text-cream">
        <h2 className="text-center text-3xl italic">Uma palavra de carinho</h2>
        <label htmlFor="new-phrase" className="block text-sm">Nova frase</label>
        <Textarea id="new-phrase" required maxLength={500} value={text} onChange={(e) => setText(e.target.value)} className="min-h-32 bg-cream text-forest" />
        <Button className="w-full" disabled={!text.trim() || save.isPending} type="submit">{save.isPending ? "Salvando…" : "SALVAR FRASE"}</Button>
      </form>
    </div>
  );
}