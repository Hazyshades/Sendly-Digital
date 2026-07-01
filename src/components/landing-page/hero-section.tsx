import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useMotionSafe } from "@/hooks/useMotionSafe"
import { useLenisScroll } from "@/components/landing-page/smooth-scroll"
import { GetStartedDialog } from "@/components/landing-page/get-started-dialog"
import {
  landingAccent,
  landingBtnPrimary,
  landingBtnSecondary,
  landingDemoChip,
} from "@/components/landing-page/landing-styles"

const ADDRESSES = [
  '100 USDC on X → @ZachXBT',
  'Tips on GitHub → @steipete',
  '$15 donation on Twitch → @Trainwreckstv',
  '50 USDC through Gmail DM → caroline@gmail.com',
]

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [typedAddress, setTypedAddress] = useState('')
  const [getStartedOpen, setGetStartedOpen] = useState(false)
  const motionSafe = useMotionSafe()
  const lenisScrollTo = useLenisScroll()

  useEffect(() => {
    if (!motionSafe) {
      setTypedAddress(ADDRESSES[0])
      return
    }

    let charIndex = 0
    let lineIndex = 0
    let isDeleting = false
    let currentText = ''
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      timeouts.push(id)
    }

    schedule(() => {
      const typeLine = () => {
        const targetLine = ADDRESSES[lineIndex % ADDRESSES.length]

        if (!isDeleting) {
          if (charIndex < targetLine.length) {
            currentText = targetLine.slice(0, charIndex + 1)
            setTypedAddress(currentText)
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
            currentText = targetLine.slice(0, charIndex - 1)
            setTypedAddress(currentText)
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

  useEffect(() => {
    if (!motionSafe) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 })

      tl.from('.hero-headline', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
      })
      .from('.hero-typed', {
        y: 16,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
      }, '-=0.35')
      .from('.hero-actions', {
        y: 12,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.out',
      }, '-=0.25')
    }, containerRef)

    return () => ctx.revert()
  }, [motionSafe])

  const scrollToWork = () => {
    if (lenisScrollTo) {
      lenisScrollTo('work')
    } else {
      document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative h-[100dvh] w-full overflow-hidden flex items-center"
      aria-label="Sendly introduction"
    >
      <div className="relative z-10 w-full p-8 md:p-16 lg:p-24">
        <div className="max-w-5xl">
          <div className="hero-headline mb-6 max-w-3xl">
            <h1
              className="font-jakarta font-semibold text-[clamp(2.75rem,9vw,5.5rem)] leading-[1.05] tracking-[-0.03em] text-gray-900 text-balance"
            >
              Money is{' '}
              <span className={landingAccent}>social.</span>
            </h1>
            <p className="mt-4 font-jakarta text-lg md:text-xl text-gray-700 leading-relaxed text-pretty">
              Send USDC on Arc to @handles on X, GitHub, Twitch, and Gmail — not wallet addresses.
            </p>
          </div>

          <div className="hero-typed mb-8">
            <div
              className={landingDemoChip}
              aria-live="polite"
              aria-label="Example payment to a social handle"
            >
              {typedAddress}
              {motionSafe ? (
                <span className="animate-cursor-blink inline-block w-0.5 h-4 ml-1 bg-[var(--sendly-indigo)] align-middle" aria-hidden />
              ) : null}
            </div>
          </div>

          <div className="hero-actions flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setGetStartedOpen(true)}
              className={landingBtnPrimary}
            >
              Get started
            </button>
            <button
              type="button"
              onClick={scrollToWork}
              className={landingBtnSecondary}
            >
              See how it works
            </button>
          </div>

          <GetStartedDialog open={getStartedOpen} onOpenChange={setGetStartedOpen} />

          <div className="absolute bottom-8 right-8 md:right-16 lg:right-24 hidden sm:flex flex-col items-center gap-2" aria-hidden>
            <span className="font-mono text-xs text-gray-400">Scroll</span>
            <div className="w-px h-8 bg-gray-300" />
          </div>
        </div>
      </div>
    </section>
  )
}
