import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/client'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=80'

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <div className="min-h-screen bg-[var(--color-fog)]">
      <section className="relative isolate min-h-screen overflow-hidden text-white">
        <img
          src={HERO_IMAGE}
          alt="Sunlit mountain peaks rising above the clouds"
          className="absolute inset-0 h-full w-full object-cover brightness-[1.06] contrast-[1.04] saturate-[1.05] animate-hero-pan"
        />
        {/* Soft cinematic grade — keep the photo bright, only lift text readability */}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(12,22,30,0.48)_0%,rgba(12,22,30,0.18)_46%,rgba(12,22,30,0.04)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,30,0.36),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.14),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-14">
          <header className="animate-soft-in flex items-center justify-between drop-shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
            <p className="font-[family-name:var(--font-display)] text-[1.65rem] font-medium tracking-[0.18em] uppercase sm:text-[1.85rem]">
              TravelLog
            </p>
            <Link
              to="/register"
              className="border border-white/55 bg-white/12 px-5 py-2.5 text-[11px] font-medium tracking-[0.22em] text-white uppercase backdrop-blur-[2px] transition hover:border-white hover:bg-white/22"
            >
              Join
            </Link>
          </header>

          <div className="flex flex-1 flex-col justify-end pb-16 pt-28 drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)] sm:pb-24 lg:max-w-3xl lg:pb-28">
            <p className="animate-fade-up mb-5 text-[11px] font-medium tracking-[0.35em] text-[var(--color-gold)] uppercase">
              Private travel journal
            </p>
            <h1 className="animate-fade-up font-[family-name:var(--font-display)] text-6xl leading-[0.92] font-medium tracking-[0.02em] sm:text-7xl lg:text-8xl">
              TravelLog
            </h1>
            <p className="animate-fade-up-delay mt-7 max-w-xl text-base font-light tracking-wide text-white/90 sm:text-lg">
              Keep every journey private by default — share the moments you choose.
            </p>
            <div className="animate-fade-up-delay-2 mt-11 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="bg-white px-7 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-[#10161c] uppercase shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition hover:bg-white/92"
              >
                Start your journal
              </Link>
              <a
                href="#private-by-default"
                className="border border-white/55 bg-white/8 px-7 py-3.5 text-[11px] font-medium tracking-[0.2em] text-white uppercase backdrop-blur-[2px] transition hover:border-white hover:bg-white/16"
              >
                Discover
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="private-by-default"
        className="mx-auto grid max-w-6xl gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:px-14 lg:py-32"
      >
        <div>
          <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
            The idea
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
            Private by default
          </h2>
          <p className="mt-6 max-w-md text-base font-light leading-relaxed text-[var(--color-stone)] sm:text-lg">
            TravelLog is built for personal notes on the road — your routes, stays, and stories stay yours
            until you decide otherwise.
          </p>
        </div>
        <div className="flex flex-col justify-center border-t border-[var(--color-line)] pt-10 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-16">
          <p className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-wide text-[var(--color-ink)] sm:text-3xl">
            One place for the trip
          </p>
          <p className="mt-5 text-base font-light leading-relaxed text-[var(--color-stone)]">
            Capture the path as you go, then return later to reread the journey without digging through
            camera rolls and chat threads.
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--color-line)] px-6 py-7 sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-stone)]">
          <p className="font-[family-name:var(--font-display)] text-lg tracking-[0.14em] text-[var(--color-ink)] uppercase">
            TravelLog
          </p>
          <p aria-live="polite" className="text-xs tracking-[0.16em] uppercase">
            API{' '}
            <span className="font-medium text-[var(--color-ink)]">
              {healthQuery.isLoading && 'checking'}
              {healthQuery.isError && 'offline'}
              {healthQuery.data?.status === 'UP' && 'UP'}
              {healthQuery.data && healthQuery.data.status !== 'UP' && healthQuery.data.status}
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}
