import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { useMotionSafe } from "@/hooks/useMotionSafe"
import { GitHubIcon, GmailIcon, TwitchIcon, XIcon } from "./platform-icons"

const SEND_EXAMPLES = [
  '100 USDC on X → @ZachXBT',
  'Tips on GitHub → @steipete',
  '$15 donation on Twitch → @Trainwreckstv',
  '50 EURC through Gmail DM → caroline@gmail.com',
]

/** Type-and-delete cycle over SEND_EXAMPLES; static first line under reduced motion. */
function useTypewriter(motionSafe: boolean): string {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!motionSafe) {
      setTyped(SEND_EXAMPLES[0])
      return
    }

    let charIndex = 0
    let lineIndex = 0
    let isDeleting = false
    const timeouts: number[] = []

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms)
      timeouts.push(id)
    }

    schedule(() => {
      const typeLine = () => {
        const targetLine = SEND_EXAMPLES[lineIndex % SEND_EXAMPLES.length]

        if (!isDeleting) {
          if (charIndex < targetLine.length) {
            setTyped(targetLine.slice(0, charIndex + 1))
            charIndex++
            schedule(typeLine, 50 + Math.random() * 50)
          } else {
            schedule(() => {
              isDeleting = true
              typeLine()
            }, 2000)
          }
        } else {
          if (charIndex > 0) {
            setTyped(targetLine.slice(0, charIndex - 1))
            charIndex--
            schedule(typeLine, 25)
          } else {
            isDeleting = false
            lineIndex++
            schedule(typeLine, 500)
          }
        }
      }

      typeLine()
    }, 800)

    return () => timeouts.forEach(clearTimeout)
  }, [motionSafe])

  return typed
}

function SendMockup({ typed, motionSafe }: { typed: string; motionSafe: boolean }) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/40 bg-white glow-ring-soft md:rounded-[36px]">
      <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5 md:px-7">
        <div className="flex items-center gap-2.5">
          <span className="hidden text-xs font-medium tracking-[-0.02em] text-smoke md:inline">
            New transfer
          </span>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e8e8e8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e8e8e8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e8e8e8]" />
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_260px]">
        <div className="px-5 py-6 md:px-7 md:py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-smoke">Recipient</p>
          <div className="mt-2 flex min-h-[44px] items-center rounded-2xl border border-black/10 bg-mist px-4 py-2.5">
            <span className="font-mono text-sm text-graphite md:text-base">
              {typed}
              {motionSafe ? (
                <span className="animate-cursor-blink ml-0.5 inline-block h-4 w-0.5 bg-signal align-middle" />
              ) : null}
            </span>
          </div>

          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-smoke">Platforms</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink">
              <XIcon className="h-4 w-4 text-white" />
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#24292f]">
              <GitHubIcon className="h-4 w-4 text-white" />
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9146ff]">
              <TwitchIcon className="h-4 w-4 text-white" />
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white">
              <GmailIcon className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="border-t border-black/5 px-5 py-6 md:border-l md:border-t-0 md:px-6 md:py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-smoke">Amount</p>
          <p className="mt-1 font-serif-display text-4xl leading-none text-ink">
            100 <span className="text-xl text-smoke">USDC</span>
          </p>
          <p className="mt-1.5 text-xs tracking-[-0.02em] text-smoke">≈ $100.00 · gas covered</p>
          <div className="mt-5 w-full rounded-full bg-signal py-2.5 text-center text-sm font-semibold text-white">
            Send 100 USDC
          </div>
          <p className="mt-2.5 text-center text-[10px] leading-[1.4] text-smoke">
            Recipient claims with an identity proof
          </p>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null)
  const motionSafe = useMotionSafe()
  const typed = useTypewriter(motionSafe)

  useEffect(() => {
    if (!motionSafe) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 })

      tl.from('.hero-copy > *', {
        y: 28,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out',
      }).from(
        '.hero-mockup',
        {
          y: 48,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        },
        '-=0.3'
      )
    }, containerRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section
      id="hero"
      ref={containerRef}
      className="dusk-hero relative flex min-h-[100dvh] w-full flex-col overflow-hidden"
    >
      <img
        src="/images/landing/hero-mountains.svg"
        alt=""
        aria-hidden="true"
        className="hero-stars pointer-events-none absolute inset-x-0 top-0 h-auto w-full select-none"
      />
      <img
        src="/images/landing/hero-scenery.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full select-none"
      />

      <div className="hero-copy relative z-10 mx-auto flex w-full max-w-[600px] flex-col items-center px-6 pt-32 text-center md:pt-40">
        <h1 className="font-serif-display text-[clamp(2.25rem,5.5vw,3.25rem)] leading-[1.04] text-white">
          Send money to anyone.
          <br />
          No wallet, just a username.
        </h1>
        <p className="mt-5 max-w-[480px] text-sm leading-[1.5] tracking-[-0.02em] text-white/85 md:text-base">
          Sendly delivers USDC to a social identity — an X handle, a GitHub account,
          a Twitch channel, or an email. Recipients claim with a proof of identity.
          No wallet address, no seed phrase, no gas.
        </p>
        <Link
          to="/create"
          className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-[-0.02em] text-ink transition-transform duration-200 hover:scale-[1.03]"
        >
          Start sending
        </Link>
      </div>

      <div className="hero-mockup relative z-10 mx-auto mt-12 w-full max-w-[900px] px-4 pb-16 md:mt-16 md:pb-20">
        <SendMockup typed={typed} motionSafe={motionSafe} />
      </div>
    </section>
  )
}
