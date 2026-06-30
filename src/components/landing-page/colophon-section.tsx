import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          x: -60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      if (gridRef.current) {
        const columns = gridRef.current.querySelectorAll(":scope > div")
        gsap.from(columns, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="colophon"
      className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24 border-t border-gray-200"
    >
      <div ref={headerRef} className="mb-16">
        <h2 className="font-jakarta font-bold text-3xl md:text-5xl text-gray-900 tracking-tight">
          Sendly
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent mt-2">
          Tranfers to anyone.
        </p>
      </div>

      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500 mb-4">Design</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-gray-600">Sendly Digital</li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500 mb-4">Stack</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-gray-600">Reclaim Protocol</li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500 mb-4">Location</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-gray-600">Arc Network</li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500 mb-4">Contact</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-gray-600">
              <a
                href="https://x.com/SendlyDigital"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#6366f1] transition-colors duration-200"
              >
                Twitter/X
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div
        ref={footerRef}
        className="mt-24 pt-8 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
          © 2026 Sendly. All rights reserved.
        </p>
      </div>
    </section>
  )
}
