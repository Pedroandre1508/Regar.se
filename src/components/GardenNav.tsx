import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TulipMark } from "./Drops";

export function GardenNav({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function out() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  const link = "transition hover:text-cream";
  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 text-xs tracking-display text-cream/60">
      <Link to={admin ? "/admin" : "/dashboard"} className="flex items-center gap-2 text-cream">
        <TulipMark className="size-7" />
        <span className="font-serif text-lg">REGAR</span>
      </Link>
      <div className="flex items-center gap-5">
        {!admin && (
          <>
            <Link to="/dashboard" className={link} activeProps={{ className: "text-tulip" }}>JARDIM</Link>
            <Link to="/regar" className={link} activeProps={{ className: "text-tulip" }}>REGAR</Link>
          </>
        )}
        <button onClick={out} className={link}>SAIR</button>
      </div>
    </nav>
  );
}
