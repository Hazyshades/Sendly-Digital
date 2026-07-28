import { Link } from "react-router-dom"

const linkColumns = [
  {
    heading: "Product",
    links: [
      { label: "Create a gift card", to: "/create" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    heading: "Protocol",
    links: [
      { label: "Architecture", to: "/architecture" },
      { label: "Litepaper", href: "/llms.txt" },
    ],
  },
  {
    heading: "Network",
    links: [
      { label: "Arc Network", href: "https://www.arc.network" },
      { label: "Reclaim Protocol", href: "https://reclaimprotocol.org" },
    ],
  },
  {
    heading: "Contact",
    links: [{ label: "Twitter / X", href: "https://x.com/SendlyDigital" }],
  },
]

export function FooterSection() {
  return (
    <footer id="colophon" className="relative">
      <div className="px-6 pb-16 pt-8 md:pb-20">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <img src="/sendly-wordmark.svg" alt="Sendly" className="h-8 w-auto" />
            <p className="mt-3 max-w-[280px] text-sm leading-[1.5] tracking-[-0.02em] text-graphite">
              Transfers to anyone — no wallet, just a username.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:gap-12">
            {linkColumns.map((column) => (
              <div key={column.heading}>
                <h4 className="text-xs font-medium uppercase tracking-[0.16em] text-smoke">
                  {column.heading}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {'to' in link && link.to ? (
                        <Link
                          to={link.to}
                          className="text-sm tracking-[-0.02em] text-graphite transition-colors hover:text-signal"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          target={link.href?.startsWith('http') ? '_blank' : undefined}
                          rel={link.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="text-sm tracking-[-0.02em] text-graphite transition-colors hover:text-signal"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-14 flex max-w-[1200px] flex-col gap-3 border-t border-black/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs tracking-[-0.02em] text-smoke">© 2026 Sendly. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/terms" className="text-xs tracking-[-0.02em] text-smoke transition-colors hover:text-ink">
              Terms
            </Link>
            <Link to="/privacy" className="text-xs tracking-[-0.02em] text-smoke transition-colors hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </div>

      <div className="dusk-footer relative h-[240px] overflow-hidden md:h-[300px]">
        <img
          src="/images/landing/footer-scenery.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full select-none"
        />
        <div className="relative z-10 flex h-full items-start justify-center pt-10 md:pt-14">
          <span className="font-serif-display text-6xl text-white/90 md:text-8xl">Sendly</span>
        </div>
      </div>
    </footer>
  )
}
