import { Link } from 'react-router-dom'
import { useLenisScroll } from '@/components/landing-page/smooth-scroll'

const sectionLinks = [
  { id: 'how-it-works', label: 'Product' },
  { id: 'agents', label: 'Agents' },
]

export function CapsuleNav() {
  const scrollToSection = useLenisScroll()

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        aria-label="Main"
        className="flex items-center gap-0.5 rounded-full border border-black/5 bg-white/95 py-1.5 pl-4 pr-1.5 backdrop-blur-md glow-ring-soft"
      >
        <Link to="/" className="flex items-center pr-2" aria-label="Sendly home">
          <img src="/sendly-wordmark.svg" alt="Sendly" className="h-6 w-auto" />
        </Link>

        <div className="hidden items-center md:flex">
          {sectionLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection?.(link.id)}
              className="px-3 py-1.5 text-sm font-medium tracking-[-0.02em] text-graphite transition-colors hover:text-ink"
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/blog"
            className="px-3 py-1.5 text-sm font-medium tracking-[-0.02em] text-graphite transition-colors hover:text-ink"
          >
            Blog
          </Link>
        </div>

        <Link
          to="/create"
          className="ml-1.5 rounded-full bg-signal px-4 py-2 text-sm font-semibold tracking-[-0.02em] text-white transition-colors hover:bg-[#0068d6]"
        >
          Start sending
        </Link>
      </nav>
    </header>
  )
}
