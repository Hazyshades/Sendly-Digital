import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenisScroll } from '@/components/landing-page/smooth-scroll'
import { GetStartedDialog } from '@/components/landing-page/get-started-dialog'
import {
  landingBtnPrimary,
  landingNavLink,
  landingNavLinkActive,
  landingNavLinkIdle,
} from '@/components/landing-page/landing-styles'
import { useActiveLandingSection } from '@/components/landing-page/use-active-section'
import { useMotionSafe } from '@/hooks/useMotionSafe'

gsap.registerPlugin(ScrollTrigger)

const navItems = [
  { id: "work", label: "Payments" },
  { id: "signals", label: "Gift cards" },
  { id: "principles", label: "Why Sendly" },
  { id: "blog", label: "Blog", href: "/blog" },
] as const

export function SideNav() {
  const navRef = useRef<HTMLDivElement>(null)
  const [getStartedOpen, setGetStartedOpen] = useState(false)
  const lenisScrollTo = useLenisScroll()
  const motionSafe = useMotionSafe()
  const activeSection = useActiveLandingSection()

  useEffect(() => {
    if (!motionSafe) return

    const ctx = gsap.context(() => {
      const nav = navRef.current
      if (!nav) return

      ScrollTrigger.create({
        start: 'top -80',
        onUpdate: (self) => {
          const scrolled = self.scroll() > 10

          gsap.to(nav, {
            backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            borderColor: scrolled ? 'rgba(200, 200, 200, 0.5)' : 'rgba(255, 255, 255, 0.3)',
            boxShadow: scrolled ? '0 2px 12px rgba(0, 0, 0, 0.06)' : 'none',
            duration: 0.4,
            ease: 'power2.out',
          })
        },
      })
    }, navRef)

    return () => ctx.revert()
  }, [motionSafe])

  const scrollToSection = (id: string) => {
    if (lenisScrollTo) {
      lenisScrollTo(id)
    } else {
      const element = document.getElementById(id)
      if (element) element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 pointer-events-none px-4">
      <nav
        ref={navRef}
        aria-label="Landing page"
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-2 py-2 md:py-3 rounded-2xl border border-white/30 transition-[box-shadow,border-color] duration-200 ease-[var(--ease-out)] max-w-full"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-1">
          {navItems.map((item) =>
            "href" in item ? (
              <Link
                key={item.id}
                to={item.href}
                className={cn(landingNavLink, landingNavLinkIdle)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                aria-current={activeSection === item.id ? 'true' : undefined}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  landingNavLink,
                  activeSection === item.id ? landingNavLinkActive : landingNavLinkIdle,
                )}
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => setGetStartedOpen(true)}
          className={cn(landingBtnPrimary, "text-sm py-2.5")}
        >
          Get started
        </button>

        <GetStartedDialog open={getStartedOpen} onOpenChange={setGetStartedOpen} />
      </nav>
    </div>
  )
}
