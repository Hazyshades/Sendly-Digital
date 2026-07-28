import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { scrollRevealOnce, useMotionSafe } from "@/hooks/useMotionSafe"

gsap.registerPlugin(ScrollTrigger)

const steps = [
  { number: "01", title: "Customize", note: "Pick an amount and a design — make the gift yours." },
  { number: "02", title: "Send", note: "Deliver it as a link on X, GitHub, Twitch, or Gmail." },
  { number: "03", title: "Claim", note: "Your recipient proves the account is theirs. No wallet needed." },
  { number: "04", title: "Redeem", note: "USDC settles on-chain, gas covered by Sendly." },
]

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const motionSafe = useMotionSafe()

  useEffect(() => {
    if (!motionSafe || !sectionRef.current || !gridRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(gridRef.current!.children, {
        y: 24,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 82%',
          ...scrollRevealOnce,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section id="how-it-works" ref={sectionRef} className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[600px] text-center">
        <h2 className="font-serif-display text-4xl leading-[1.05] text-ink md:text-5xl">
          Security without friction.
        </h2>
        <p className="mt-4 text-sm leading-[1.5] tracking-[-0.02em] text-graphite md:text-base">
          Onboarding that disappears into the experience — four steps from
          “thinking of you” to USDC on-chain.
        </p>
      </div>

      <div ref={gridRef} className="mx-auto mt-14 grid max-w-[1200px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <article
            key={step.number}
            className="glow-ring rounded-[26px] border border-black/5 bg-white p-6"
          >
            <span className="font-mono text-[10px] tracking-[0.2em] text-smoke">{step.number}</span>
            <h3 className="mt-6 text-lg font-semibold tracking-[-0.02em] text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-[1.45] tracking-[-0.02em] text-graphite">{step.note}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
