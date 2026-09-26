import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useMotionSafe } from "@/hooks/useMotionSafe"
import { HeroBuySellShell } from "@/components/landing-page/HeroBuySellShell"

const ADDRESSES = [
  '100 USDC on X → @ZachXBT',
  'Tips on GitHub → @steipete',
  '$15 donation on Twitch → @Trainwreckstv',
  '50 EURC through Gmail DM → caroline@gmail.com',
]

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [typedAddress, setTypedAddress] = useState('')
  const motionSafe = useMotionSafe()

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

      tl.from('.hero-money', {
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
      })
      .from('.hero-social', {
        y: 50,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
      }, '-=0.4')
      .fromTo(
        '.hero-typed',
        { opacity: 0, x: -16 },
        {
          opacity: 1,
          x: 0,
          duration: 0.4,
          ease: 'power2.out',
        },
        '-=0.5'
      )
      .fromTo(
        '.hero-buy-sell-shell',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: 'power3.out',
        },
        '-=0.35'
      )
    }, containerRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative flex min-h-[100dvh] w-full items-center overflow-x-hidden py-20 md:py-24"
    >
      <div className="relative z-10 w-full px-8 md:px-16 lg:px-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <div className="hero-money mb-4">
              <span className="font-jakarta text-lg font-bold uppercase tracking-[0.3em] text-gray-800 md:text-xl">
                Money is
              </span>
            </div>

            <div className="hero-social mb-8">
              <h1
                className="font-cormorant text-[4.5rem] font-bold italic leading-none md:text-[6.5rem] lg:text-[7.5rem]"
                style={{
                  lineHeight: 0.9,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Social.
              </h1>
            </div>

            <div className="hero-typed flex items-center gap-4">
              <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2 font-mono text-sm text-gray-600 shadow-circle-card backdrop-blur-sm md:text-base">
                {typedAddress}
                {motionSafe ? (
                  <span className="animate-cursor-blink ml-1 inline-block h-4 w-0.5 bg-[#6366f1] align-middle" />
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroBuySellShell />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-gray-400 md:bottom-6">
          <span className="font-mono text-xs uppercase tracking-widest">Scroll</span>
          <div className="h-10 w-px bg-gradient-to-b from-gray-400 to-transparent md:h-12" />
        </div>
      </div>
    </section>
  )
}
