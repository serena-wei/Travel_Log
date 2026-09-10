import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { getDashboardConfig } from '../auth/dashboardConfig'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'

export function DashboardPage() {
  const { user } = useAuth()
  const config = getDashboardConfig(user?.role)

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: fetchHealth,
    enabled: Boolean(config.showSystemHealth),
    staleTime: 30_000,
  })

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="page-intro">
          <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
            {config.eyebrow}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
            {config.title}
          </h1>
          <p className="mt-3 max-w-2xl font-light text-[var(--color-stone)]">
            {user?.username ? `Welcome back, ${user.username}. ` : null}
            {config.blurb}
          </p>
        </div>

        <section className="mt-12" aria-label="Quick actions">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.actions.map((action) => (
              <li key={action.to + action.label}>
                <Link
                  to={action.to}
                  className={[
                    'interactive-entry flex h-full flex-col border border-[var(--color-line)] p-5 sm:p-6',
                    action.emphasis === 'primary'
                      ? 'bg-[color-mix(in_srgb,var(--color-sea-soft)_70%,var(--color-paper))]'
                      : 'bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)]',
                  ].join(' ')}
                >
                  <span className="interactive-entry-title font-[family-name:var(--font-display)] text-2xl font-medium tracking-wide text-[var(--color-ink)] transition-colors">
                    {action.label}
                  </span>
                  <span className="mt-2 flex-1 text-sm font-light leading-relaxed text-[var(--color-stone)]">
                    {action.description}
                  </span>
                  <span className="interactive-entry-open mt-5 text-[11px] font-medium tracking-[0.2em] text-[var(--color-stone)] uppercase">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {config.showSystemHealth && (
          <section className="mt-12 border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_88%,var(--color-sea-soft))] px-5 py-6 sm:px-8">
            <p className="mb-2 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
              System health
            </p>
            {healthQuery.isLoading && (
              <p className="text-sm font-light text-[var(--color-stone)]">Checking API…</p>
            )}
            {healthQuery.isError && (
              <p role="alert" className="text-sm text-[var(--color-danger)]">
                Unable to reach the API health endpoint.
              </p>
            )}
            {healthQuery.data && (
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <p className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-wide text-[var(--color-ink)]">
                  {healthQuery.data.status}
                </p>
                <p className="text-sm font-light text-[var(--color-stone)]">
                  {healthQuery.data.serviceName}
                  {healthQuery.data.timestamp ? ` · ${healthQuery.data.timestamp}` : null}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </AppShell>
  )
}
