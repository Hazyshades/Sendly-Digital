import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { scrollRevealOnce, useMotionSafe } from "@/hooks/useMotionSafe"

gsap.registerPlugin(ScrollTrigger)

export function AgentsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const motionSafe = useMotionSafe()

  useEffect(() => {
    if (!motionSafe || !sectionRef.current || !cardRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(cardRef.current, {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: cardRef.current,
          start: 'top 82%',
          ...scrollRevealOnce,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section id="agents" ref={sectionRef} className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[600px] text-center">
        <h2 className="font-serif-display text-4xl leading-[1.05] text-ink md:text-5xl">
          Built for agents.
        </h2>
        <p className="mt-4 text-sm leading-[1.5] tracking-[-0.02em] text-graphite md:text-base">
          When an endpoint answers 402 Payment Required, an agent settles it in
          USDC on Arc and retries — no API keys, no invoices. Sendly is the
          settlement layer behind the paywall.
        </p>
      </div>

      <div ref={cardRef} className="mx-auto mt-12 max-w-[760px]">
        <div className="glow-ring overflow-hidden rounded-[26px] bg-ink">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 md:px-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              agent · settlement
            </span>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
            </div>
          </div>
          <pre className="overflow-x-auto px-5 pb-6 pt-4 font-mono text-[12px] leading-[1.8] text-white/75 md:px-6 md:text-[13px]">
{`$ curl sendly.digital/paywall/premium
`}<span className="text-signal">← HTTP 402 Payment Required</span>{`
  { "platform": "github", "amount": "1.00", "identityHash": "0x8f2…c41" }

$ sendly pay github:steipete 1 USDC  `}<span className="text-white/40"># ZkSend.createPayment on Arc</span>{`
`}<span className="text-white">✓ settled · tx 0x3ab…9e7</span>{`

$ curl sendly.digital/paywall/premium
`}<span className="text-signal">← HTTP 200 OK</span>
          </pre>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/llms.txt"
            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold tracking-[-0.02em] text-ink transition-colors hover:border-black/25"
          >
            llms.txt
          </a>
          <Link
            to="/architecture"
            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold tracking-[-0.02em] text-ink transition-colors hover:border-black/25"
          >
            Architecture
          </Link>
        </div>
      </div>
    </section>
  )
}
