import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionHeader } from "./section-header"
import { landingBody, landingSection } from "./landing-styles"
import { scrollRevealOnce, useMotionSafe } from "@/hooks/useMotionSafe"

gsap.registerPlugin(ScrollTrigger)

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const motionSafe = useMotionSafe()

  useEffect(() => {
    if (!motionSafe || !sectionRef.current) return

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            ...scrollRevealOnce,
          },
        })
      }

      if (gridRef.current) {
        const columns = gridRef.current.querySelectorAll(":scope > div")
        gsap.from(columns, {
          y: 20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            ...scrollRevealOnce,
          },
        })
      }

      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 16,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            ...scrollRevealOnce,
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section
      ref={sectionRef}
      id="colophon"
      className={`${landingSection} border-t border-gray-200`}
      aria-labelledby="colophon-heading"
    >
      <div ref={headerRef}>
        <SectionHeader
          titleId="colophon-heading"
          title="Sendly"
          description="Social payment identity on Arc. Settled in USDC."
          className="mb-16 max-w-2xl"
        />
      </div>

      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        <div>
          <h3 className="font-jakarta text-sm font-medium text-gray-900 mb-3">Built by</h3>
          <p className={landingBody}>Sendly Digital</p>
        </div>

        <div>
          <h3 className="font-jakarta text-sm font-medium text-gray-900 mb-3">Verification</h3>
          <p className={landingBody}>Reclaim Protocol (zkTLS)</p>
        </div>

        <div>
          <h3 className="font-jakarta text-sm font-medium text-gray-900 mb-3">Network</h3>
          <p className={landingBody}>Arc — USDC native gas</p>
        </div>

        <div>
          <h3 className="font-jakarta text-sm font-medium text-gray-900 mb-3">Contact</h3>
          <a
            href="https://x.com/SendlyDigital"
            target="_blank"
            rel="noopener noreferrer"
            className={`${landingBody} hover:text-[color:var(--sendly-indigo)] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--sendly-indigo)] focus-visible:ring-offset-2 rounded-sm`}
          >
            @SendlyDigital on X
          </a>
        </div>
      </div>

      <div
        ref={footerRef}
        className="mt-20 pt-8 border-t border-gray-200"
      >
        <p className="font-mono text-xs text-gray-500">
          © 2026 Sendly. All rights reserved.
        </p>
      </div>
    </section>
  )
}
