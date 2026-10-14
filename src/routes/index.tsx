import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Regar — Para florescer, precisa de cuidado" },
      { name: "description", content: "Um jardim diário de autocuidado: responda, ganhe gotas e colha recompensas." },
      { property: "og:title", content: "Regar" },
      { property: "og:description", content: "Para florescer, precisa de cuidado e carinho." },
    ],
  }),
});
