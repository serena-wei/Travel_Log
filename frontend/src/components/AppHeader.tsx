import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'relative pb-1 text-[11px] font-medium tracking-[0.2em] uppercase transition',
    isActive
      ? 'text-[var(--color-ink)] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[var(--color-gold)]'
      : 'text-[var(--color-stone)] hover:text-[var(--color-sea)]',
  ].join(' ')

export function AppHeader() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  return (
    <header className="border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_88%,var(--color-sea-soft))] backdrop-blur-[6px]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <div className="flex min-w-0 items-center gap-6 sm:gap-10">
          <Link
            to="/"
            className="shrink-0 font-[family-name:var(--font-display)] text-2xl font-medium tracking-[0.18em] uppercase"
          >
            TravelLog
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6" aria-label="Main">
            <NavLink to="/journeys" className={navLinkClass}>
              My journeys
            </NavLink>
            <NavLink to="/explore" className={navLinkClass}>
              Explore
            </NavLink>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm tracking-wide text-[var(--color-stone)] sm:inline">
            {user?.username}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
