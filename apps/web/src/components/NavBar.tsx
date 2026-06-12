export function NavBar() {
  return (
    <header className="relative z-10 border-b border-white/15 bg-background/75 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <h1 className="text-lg font-black tracking-wide text-textPrimary">Absurt Mahkeme</h1>
        <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          Canli durusma
        </span>
      </div>
    </header>
  );
}
