import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionHeader } from "./section-header"
import { landingBody, landingCard, landingSection } from "./landing-styles"
import { scrollRevealOnce, useMotionSafe } from "@/hooks/useMotionSafe"

gsap.registerPlugin(ScrollTrigger)

const signals = [
  { title: "Customize", note: "Pick an amount and design. The card holds USDC on Arc." },
  { title: "Send", note: "Deliver it to their @handle on X, Twitch, GitHub, or Gmail." },
  { title: "Claim", note: "They sign in with that social account to claim — no address to copy." },
  { title: "Redeem", note: "USDC moves to their wallet after Sendly verifies they own the account." },
]

export function SignalsSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const motionSafe = useMotionSafe()

  useEffect(() => {
    if (!motionSafe || !sectionRef.current || !headerRef.current || !containerRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            ...scrollRevealOnce,
          },
        },
      )

      const cards = containerRef.current?.querySelectorAll("article")
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 90%",
              ...scrollRevealOnce,
            },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section
      id="signals"
      ref={sectionRef}
      className={landingSection}
      aria-labelledby="signals-heading"
    >
      <div ref={headerRef}>
        <SectionHeader
          titleId="signals-heading"
          title="NFT gift cards"
          description="Another way to send: wrap USDC in a custom card and route it to someone's @handle — same identity layer as direct payments."
        />
      </div>

      <p className="sr-only">Swipe horizontally to see all steps.</p>

      <div
        ref={containerRef}
        className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-pl-6 md:scroll-pl-16 [-webkit-overflow-scrolling:touch]"
      >
        {signals.map((signal) => (
          <SignalCard key={signal.title} signal={signal} />
        ))}
      </div>
    </section>
  )
}

function SignalCard({
  signal,
}: {
  signal: { title: string; note: string }
}) {
  return (
    <article
      className={cn(
        "snap-start shrink-0 w-[min(100%,18rem)] md:w-80",
      )}
    >
      <div className={cn(landingCard, "p-6 h-full")}>
        <h3 className="font-jakarta font-semibold text-xl text-gray-900 mb-2">
          {signal.title}
        </h3>
        <p className={cn(landingBody, "text-sm")}>{signal.note}</p>
      </div>
    </article>
  )
}
