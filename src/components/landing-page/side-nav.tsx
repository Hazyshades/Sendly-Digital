import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLenisScroll } from '@/components/landing-page/smooth-scroll'

gsap.registerPlugin(ScrollTrigger)

const navItems = [
  { id: "signals", label: "Gift Cards" },
  { id: "work", label: "Payments" },
  { id: "blog", label: "Blog", href: "/blog" },
]

export function SideNav() {
  const navRef = useRef<HTMLDivElement>(null)
  const [launchAppOpen, setLaunchAppOpen] = useState(false)
  const lenisScrollTo = useLenisScroll()

  useEffect(() => {
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
            boxShadow: scrolled ? '0 8px 32px rgba(0, 0, 0, 0.08)' : '0 4px 16px rgba(0, 0, 0, 0.05)',
            duration: 0.4,
            ease: 'power2.out',
          })

          const textElements = nav.querySelectorAll('.nav-text')
          textElements.forEach((el) => {
            gsap.to(el, {
              color: scrolled ? '#1e293b' : '#475569',
              duration: 0.3,
            })
          })
        },
      })
    }, navRef)

    return () => ctx.revert()
  }, [])

  const scrollToSection = (id: string) => {
    if (lenisScrollTo) {
      lenisScrollTo(id)
    } else {
      const element = document.getElementById(id)
      if (element) element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none">
      <nav
        ref={navRef}
        className="pointer-events-auto flex items-center gap-2 px-2 py-3 rounded-2xl border border-white/30 transition-all duration-500"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-1">
          {navItems.map(({ id, label, href }) =>
            href ? (
              <Link
                key={id}
                to={href}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] font-medium text-sm hover:shadow-lg hover:shadow-[#6366f1]/25 transition-all duration-300 !text-white hover:!text-white"
              >
                {label}
              </Link>
            ) : (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="nav-text px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/90 backdrop-blur-sm transition-all duration-300"
              >
                {label}
              </button>
            )
          )}
        </div>

        <Dialog open={launchAppOpen} onOpenChange={setLaunchAppOpen}>
          <button
            onClick={() => setLaunchAppOpen(true)}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-medium text-sm hover:shadow-lg hover:shadow-[#6366f1]/25 transition-all duration-300"
          >
            Launch App
          </button>
          <DialogContent
            className="rounded-2xl border-white/30 bg-white/90 backdrop-blur-xl p-6 sm:max-w-md"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-800">
                Launch App
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                type="button"
                disabled
                className="relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-white/60 backdrop-blur-sm border-2 border-[#6366f1]/40 shadow-circle-card cursor-not-allowed opacity-60 transition-all duration-300"
                aria-disabled="true"
              >
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-[10px] font-semibold text-white uppercase tracking-wide">
                  Soon
                </span>
                <span className="font-medium text-gray-800">Payments</span>
              </button>
              <Link
                to="/create"
                className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-circle-card hover:shadow-lg hover:shadow-[#6366f1]/20 hover:scale-[1.02] transition-all duration-300"
              >
                <span className="font-medium text-gray-800">NFT</span>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  )
}
