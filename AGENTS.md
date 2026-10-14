<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Balance-changing actions (daily submission, redemptions, manual adjust) go through SECURITY DEFINER Postgres RPCs; profiles are not client-updatable, so drops can't be tampered with.
- Signed-in pages use `ssr: false` + `requireUser()` in beforeLoad (src/lib/garden.ts) because the session lives in browser storage.
- Rewards and harvest live on a dedicated route, leaving the garden focused on daily care.
- Daily encouragement is read through an authenticated, security-invoker Postgres RPC with date-based hashed ordering, keeping the phrase stable throughout each São Paulo day without browser storage.
