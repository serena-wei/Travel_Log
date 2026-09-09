import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=80'

export function HomePage() {
  const { user, isBootstrapping, logout } = useAuth()

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--color-fog)]">
      <section className="relative isolate min-h-screen overflow-hidden text-white">
        <img
          src={HERO_IMAGE}
          alt="Sunlit mountain peaks rising above the clouds"
          className="absolute inset-0 h-full w-full object-cover brightness-[1.06] contrast-[1.04] saturate-[1.05] animate-hero-pan"
        />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(12,22,30,0.48)_0%,rgba(12,22,30,0.18)_46%,rgba(12,22,30,0.04)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,30,0.36),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.14),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-14">
          <header className="animate-soft-in flex items-center justify-between gap-4 drop-shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
            <p className="font-[family-name:var(--font-display)] text-[1.65rem] font-medium tracking-[0.18em] uppercase sm:text-[1.85rem]">
              TravelLog
            </p>
            <div className="flex items-center gap-3">
              {!isBootstrapping && user ? (
                <>
                  <span className="hidden text-sm tracking-wide text-white/85 sm:inline">
                    {user.username}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="border border-white/55 bg-white/12 px-5 py-2.5 text-[11px] font-medium tracking-[0.22em] text-white uppercase backdrop-blur-[2px] transition hover:border-white hover:bg-white/22"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="border border-white/55 bg-white/12 px-5 py-2.5 text-[11px] font-medium tracking-[0.22em] text-white uppercase backdrop-blur-[2px] transition hover:border-white hover:bg-white/22"
                >
                  Sign in
                </Link>
              )}
            </div>
          </header>

          <div className="flex flex-1 flex-col justify-end pb-16 pt-28 drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)] sm:pb-24 lg:max-w-3xl lg:pb-28">
            <p className="animate-fade-up mb-5 text-[11px] font-medium tracking-[0.35em] text-[var(--color-gold)] uppercase">
              Private travel journal
            </p>
            <h1 className="animate-fade-up font-[family-name:var(--font-display)] text-6xl leading-[0.92] font-medium tracking-[0.02em] sm:text-7xl lg:text-8xl">
              TravelLog
            </h1>
            <p className="animate-fade-up-delay mt-7 max-w-xl text-base font-light tracking-wide text-white/90 sm:text-lg">
              {user
                ? `Welcome back, ${user.username}. Your private journal is ready when you are.`
                : 'Save your travel memories, share the journeys you love, and connect with a community of travellers.'}
            </p>
            <div className="animate-fade-up-delay-2 mt-11 flex flex-wrap items-center gap-4">
              {user ? (
                <>
                  <Link
                    to="/journeys"
                    className="bg-white px-7 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-[#10161c] uppercase shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition hover:bg-white/92"
                  >
                    Continue
                  </Link>
                  <Link
                    to="/explore"
                    className="border border-white/55 bg-white/8 px-7 py-3.5 text-[11px] font-medium tracking-[0.2em] text-white uppercase backdrop-blur-[2px] transition hover:border-white hover:bg-white/16"
                  >
                    Explore
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="bg-white px-7 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-[#10161c] uppercase shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition hover:bg-white/92"
                  >
                    Start your journal
                  </Link>
                  <Link
                    to="/login"
                    className="border border-white/55 bg-white/8 px-7 py-3.5 text-[11px] font-medium tracking-[0.2em] text-white uppercase backdrop-blur-[2px] transition hover:border-white hover:bg-white/16"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
