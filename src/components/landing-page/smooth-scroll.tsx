import { useEffect, useRef } from "react"
import Lenis from "lenis"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const rafRef = useRef<((time: number) => void) | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    })

    lenisRef.current = lenis

    lenis.on("scroll", ScrollTrigger.update)

    rafRef.current = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(rafRef.current)
    gsap.ticker.lagSmoothing(0)

    return () => {
      if (rafRef.current) {
        gsap.ticker.remove(rafRef.current)
      }
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
