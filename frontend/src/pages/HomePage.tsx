import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/client'

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-[var(--color-sea)] uppercase">
        Portfolio project
      </p>
      <h1 className="mb-4 text-5xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-6xl">
        TravelLog
      </h1>
      <p className="mb-10 max-w-xl text-lg text-[color-mix(in_srgb,var(--color-ink)_75%,transparent)]">
        Personal travel journal — private by default, share when you want.
      </p>

      <section
        aria-live="polite"
        className="rounded-2xl border border-[color-mix(in_srgb,var(--color-ink)_12%,transparent)] bg-white/70 p-6 shadow-sm backdrop-blur"
      >
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-[var(--color-sea)] uppercase">
          API connectivity
        </h2>
        {healthQuery.isLoading && <p>Checking backend health…</p>}
        {healthQuery.isError && (
          <p className="text-[var(--color-accent)]">
            Backend unreachable. Start Postgres and the Spring Boot API, then refresh.
          </p>
        )}
        {healthQuery.data && (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[color-mix(in_srgb,var(--color-ink)_55%,transparent)]">Status</dt>
              <dd className="font-medium">{healthQuery.data.status}</dd>
            </div>
            <div>
              <dt className="text-[color-mix(in_srgb,var(--color-ink)_55%,transparent)]">Service</dt>
              <dd className="font-medium">{healthQuery.data.service}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[color-mix(in_srgb,var(--color-ink)_55%,transparent)]">Timestamp</dt>
              <dd className="font-medium">{healthQuery.data.timestamp}</dd>
            </div>
          </dl>
        )}
      </section>
    </main>
  )
}
