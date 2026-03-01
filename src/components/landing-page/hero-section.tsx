import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [typedAddress, setTypedAddress] = useState('')

  const addresses = [
    '100 USDC on X → @ZachXBT',
    'Tips on GitHub → @steipete',
    '$15 donation on Twitch → @Trainwreckstv',
    '50 EURC through Gmail DM → caroline@gmail.com',
  ]
  useEffect(() => {
    let charIndex = 0
    let lineIndex = 0
    let isDeleting = false
    let currentText = ''

    const startTimeout = setTimeout(() => {
      const typeLine = () => {
        const targetLine = addresses[lineIndex % addresses.length]

        if (!isDeleting) {
          if (charIndex < targetLine.length) {
            currentText = targetLine.slice(0, charIndex + 1)
            setTypedAddress(currentText)
            charIndex++
            setTimeout(typeLine, 50 + Math.random() * 50)
          } else {
            setTimeout(() => {
              isDeleting = true
              typeLine()
            }, 2000)
          }
        } else {
          if (charIndex > 0) {
            currentText = targetLine.slice(0, charIndex - 1)
            setTypedAddress(currentText)
            charIndex--
            setTimeout(typeLine, 25)
          } else {
            isDeleting = false
            lineIndex++
            setTimeout(typeLine, 500)
          }
        }
      }

      typeLine()
    }, 800)

    return () => clearTimeout(startTimeout)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.5 })

      tl.from('.hero-money', {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      })
      .from('.hero-social', {
        y: 80,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
      }, '-=0.6')
      .fromTo(
        '.hero-typed',
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
        },
        '-=0.8'
      )
      .from('.hero-metrics', {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
      }, '-=0.4')
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative h-[100dvh] w-full overflow-hidden flex items-center"
    >
      <div className="relative z-10 w-full p-8 md:p-16 lg:p-24">
        <div className="max-w-5xl">
          <div className="hero-money mb-4">
            <span className="font-jakarta font-bold text-gray-800 text-lg md:text-xl uppercase tracking-[0.3em]">
              Money is
            </span>
          </div>

          <div className="hero-social mb-8">
            <h1
              className="font-cormorant italic text-[5rem] md:text-[7rem] lg:text-[9rem] leading-none font-bold"
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
            <div className="font-mono text-sm md:text-base text-gray-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200 shadow-circle-card">
              {typedAddress}
              <span className="animate-cursor-blink inline-block w-0.5 h-4 ml-1 bg-[#6366f1]" />
            </div>
          </div>

          <div className="absolute bottom-8 right-8 md:right-16 lg:right-24 flex flex-col items-center gap-2 text-gray-400">
            <span className="font-mono text-xs uppercase tracking-widest">Scroll</span>
            <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  )
}
