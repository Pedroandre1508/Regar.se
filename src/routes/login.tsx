import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin } from "@/lib/garden";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import bouquet from "@/assets/bouquet.png.asset.json";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Regar" },
      { name: "description", content: "Entre no seu jardim Regar." },
      { property: "og:title", content: "Entrar — Regar" },
      { property: "og:description", content: "Para florescer, precisa de cuidado e carinho." },
    ],
  }),
  component: LoginPage,
});

function LoginForm({ admin, onDone }: { admin: boolean; onDone: (isAdmin: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      setBusy(false);
      toast.error("E-mail ou senha incorretos");
      return;
    }
    const isAdmin = await checkAdmin(data.user.id);
    if (admin && !isAdmin) {
      await supabase.auth.signOut();
      setBusy(false);
      toast.error("Esta conta não tem acesso de administrador");
      return;
    }
    onDone(isAdmin);
  }

  const field =
    "w-full rounded-full border border-cream/30 bg-cream px-5 py-3 text-center text-sm text-forest placeholder:text-forest/40 outline-none focus:ring-2 focus:ring-olive";
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3">
      <input className={field} type="email" required placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} type="password" required placeholder="senha" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button
        disabled={busy}
        className="mt-2 rounded-full bg-tulip px-10 py-3 text-sm font-medium tracking-display text-cream shadow-tulip transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
      >
        {busy ? "..." : "ENTRAR"}
      </button>
    </form>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const done = (isAdmin: boolean) => navigate({ to: isAdmin ? "/admin" : "/dashboard", replace: true });

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-forest px-6 py-10 text-cream">
      <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 md:flex-row md:gap-16">
        <div className="animate-rise relative aspect-square w-56 overflow-hidden rounded-full bg-cream shadow-soft md:w-96">
          <img src={bouquet.url} alt="Buquê de tulipas" className="animate-sway size-full object-cover mix-blend-multiply" />
        </div>
        <div className="animate-rise flex w-full max-w-xs flex-col items-center text-center [animation-delay:.15s]">
          <h1 className="text-6xl font-light tracking-display md:text-7xl">REGAR</h1>
          <p className="mt-3 font-serif text-lg italic text-cream/80">Para florescer, precisa de cuidado e carinho</p>
          <div className="mt-8 w-full">
            <LoginForm admin={false} onDone={done} />
          </div>
        </div>
      </div>
      <button onClick={() => setAdminOpen(true)} className="mt-10 text-xs tracking-display text-cream/40 transition hover:text-cream">
        Acesso ADM
      </button>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="border-leaf bg-forest text-cream">
          <DialogHeader>
            <DialogTitle className="text-center font-serif text-4xl font-light tracking-display">ADM</DialogTitle>
          </DialogHeader>
          <LoginForm admin onDone={done} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
