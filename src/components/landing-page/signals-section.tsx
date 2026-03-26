import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const signals = [
  { title: "Customize", note: "Design your own gift card with a custom amount and design." },
  { title: "Send", note: "Send the gift card to your recipient with main social networks." },
  { title: "Claim", note: "Claim the gift card with your recipient's address." },
  { title: "Redeem", note: "Redeem the gift card with your recipient's address." },
]

export function SignalsSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !containerRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none play reverse",
          },
        },
      )

      const cards = containerRef.current?.querySelectorAll("article")
      if (cards) {
        gsap.fromTo(
          cards,
          { x: -100, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 90%",
              toggleActions: "play none play reverse",
            },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section id="signals" ref={sectionRef} className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24">
      <div ref={headerRef} className="mb-16 md:mb-24">
        <h2 className="font-jakarta font-bold text-3xl md:text-5xl text-gray-900 tracking-tight">
          NFT Gift Cards
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent mt-2">
          Spendable gift card with custom amount and design.
        </p>
      </div>

      <div
        ref={containerRef}
        className="flex gap-6 md:gap-8 overflow-x-auto pb-8 no-scrollbar"
      >
        {signals.map((signal, index) => (
          <SignalCard key={index} signal={signal} index={index} />
        ))}
      </div>
    </section>
  )
}

function SignalCard({
  signal,
  index,
}: {
  signal: { title: string; note: string }
  index: number
}) {
  return (
    <article
      className={cn(
        "group relative flex-shrink-0 w-72 md:w-80",
        "transition-transform duration-500 ease-out",
        "hover:-translate-y-2"
      )}
    >
      <div className="relative bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 overflow-hidden shadow-circle-card">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#6366f1]/10 to-[#8b5cf6]/10 rounded-full blur-2xl" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            No. {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <h3 className="font-jakarta font-bold text-2xl md:text-3xl text-gray-900 mb-3 group-hover:text-[#6366f1] transition-colors duration-300">
          {signal.title}
        </h3>

        <div className="w-12 h-0.5 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] mb-4 group-hover:w-full transition-all duration-500" />

        <p className="font-mono text-xs text-gray-600 leading-relaxed">{signal.note}</p>
      </div>
    </article>
  )
}
