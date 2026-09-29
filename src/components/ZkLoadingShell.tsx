export function ZkLoadingShell() {
  return (
    <div
      className="min-h-screen circle-gradient-bg"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading Sendly payments"
    >
      <header className="relative z-10 flex h-20 items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <img
            src="/sendly-wordmark.svg"
            alt="Sendly"
            width={446}
            height={203}
            fetchPriority="high"
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="h-8 w-28 rounded-full bg-white/70" aria-hidden="true" />
      </header>

      <main className="container relative z-10 mx-auto px-6 pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <nav className="mb-4" aria-hidden="true">
            <div className="flex gap-2">
              <div className="h-9 flex-1 rounded-2xl bg-white/70" />
              <div className="h-9 flex-1 rounded-2xl bg-white/70" />
              <div className="h-9 flex-1 rounded-2xl bg-white/70" />
            </div>
          </nav>

          <div className="min-h-[24rem] overflow-hidden rounded-2xl bg-white p-6 shadow-circle-card">
            <div className="mb-6 h-8 w-2/5 rounded-lg bg-gray-100" aria-hidden="true" />
            <div className="space-y-4" aria-hidden="true">
              <div className="h-12 rounded-xl bg-gray-100" />
              <div className="h-12 rounded-xl bg-gray-100" />
              <div className="h-12 rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
