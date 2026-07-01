export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            OperatorLayer Lite
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">
            Fake-money spend controls for AI agents
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This initial app shell is ready for the static dashboard milestone.
            Phase 1 uses policy checks, risk checks, approvals, and audit logs
            around simulated spend only.
          </p>
        </div>
      </section>
    </main>
  );
}

