export function DropIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.5c-.3 0-.6.2-.8.4C9 6 5.5 10.6 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.6 15 6 12.8 2.9c-.2-.2-.5-.4-.8-.4Z" />
    </svg>
  );
}

export function TulipMark({ className = "size-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 60V30" stroke="var(--olive)" strokeWidth="2.5" fill="none" />
      <path d="M32 46c-8-1-13-6-14-13 7 0 12 5 14 13Z" fill="var(--leaf)" />
      <path d="M32 50c8-1 13-6 14-13-7 0-12 5-14 13Z" fill="var(--olive)" />
      <path d="M20 12c4 2 7 5 8 8l4-10 4 10c1-3 4-6 8-8 1 10-2 19-12 20-10-1-13-10-12-20Z" fill="var(--tulip)" />
      <path d="M32 10l-4 10c1 4 2 8 4 12 2-4 3-8 4-12Z" fill="var(--cream)" opacity=".85" />
    </svg>
  );
}
