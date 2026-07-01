import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SocialLogos } from "./SocialLogos"
import { SectionHeader } from "./section-header"
import { landingAccent, landingBody } from "./landing-styles"
import { scrollRevealOnce, useMotionSafe } from "@/hooks/useMotionSafe"

gsap.registerPlugin(ScrollTrigger)

const experiments = [
  {
    title: "Connect",
    medium: "Step 1",
    description: "Link the social account you already use to your Sendly wallet.",
    span: "col-span-2 row-span-2",
  },
  {
    title: "Verify session",
    medium: "Step 2",
    description: "An attestor confirms your login to X, GitHub, or Twitch — without sharing your password.",
    span: "col-span-1 row-span-1",
  },
  {
    title: "Prove ownership",
    medium: "Step 3",
    description: "zkTLS turns that session into a private proof — you control the account, nothing else leaks.",
    span: "col-span-1 row-span-1",
  },
  {
    title: "Receive",
    medium: "Step 4",
    description: "USDC settles on Arc once Sendly confirms you own the account.",
    span: "col-span-1 row-span-2",
    typedAddresses: [
      "100 USDC on X → @ZachXBT",
      "Tips on GitHub → @steipete",
      "$15 on Twitch → @Trainwreckstv",
      "50 USDC via Gmail → caroline@gmail.com",
    ],
  },
]

export function WorkSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const motionSafe = useMotionSafe()

  useEffect(() => {
    if (!motionSafe || !sectionRef.current || !headerRef.current || !gridRef.current) return

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
            start: "top 90%",
            ...scrollRevealOnce,
          },
        },
      )

      const cards = gridRef.current?.querySelectorAll("article")
      if (cards && cards.length > 0) {
        gsap.set(cards, { y: 16, opacity: 0 })
        gsap.to(cards, {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 90%",
            ...scrollRevealOnce,
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section
      ref={sectionRef}
      id="work"
      className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24"
      aria-labelledby="work-heading"
    >
      <div ref={headerRef}>
        <SectionHeader
          titleId="work-heading"
          title="Send to social accounts"
          description={
            <>
              Type a @handle or email. Sendly resolves the wallet, verifies ownership with{' '}
              <span className={landingAccent}>zkTLS</span>, and settles in USDC on Arc.
            </>
          }
        />
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(160px,auto)] md:auto-rows-[minmax(180px,auto)]"
      >
        {experiments.map((experiment, index) => (
          <WorkCard
            key={experiment.title}
            experiment={experiment}
            persistHover={index === 0}
          >
            {index === 0 && <SocialLogos />}
          </WorkCard>
        ))}
      </div>
    </section>
  )
}

function WorkCard({
  experiment,
  persistHover = false,
  children,
}: {
  experiment: {
    title: string
    medium: string
    description: string
    span: string
    typedAddresses?: string[]
  }
  persistHover?: boolean
  children?: React.ReactNode
}) {
  const motionSafe = useMotionSafe()
  const [isHovered, setIsHovered] = useState(false)
  const [typedText, setTypedText] = useState("")
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRef = useRef<HTMLElement>(null)
  const [isScrollActive, setIsScrollActive] = useState(false)

  useEffect(() => {
    if (!experiment.typedAddresses) {
      setTypedText("")
      return
    }
    if (!motionSafe) {
      setTypedText(experiment.typedAddresses[0])
      return
    }
    if (!isHovered) {
      setTypedText(experiment.typedAddresses[0])
      if (typingRef.current) {
        clearTimeout(typingRef.current)
      }
      return
    }
    let charIndex = 0
    let lineIndex = 0
    let isDeleting = false
    const addresses = experiment.typedAddresses

    const typeLine = () => {
      if (!isHovered) return
      const targetLine = addresses[lineIndex % addresses.length]

      if (!isDeleting) {
        if (charIndex < targetLine.length) {
          setTypedText(targetLine.slice(0, charIndex + 1))
          charIndex++
          typingRef.current = setTimeout(typeLine, 50 + Math.random() * 50)
        } else {
          typingRef.current = setTimeout(() => {
            isDeleting = true
            typeLine()
          }, 2000)
        }
      } else {
        if (charIndex > 0) {
          setTypedText(targetLine.slice(0, charIndex - 1))
          charIndex--
          typingRef.current = setTimeout(typeLine, 25)
        } else {
          isDeleting = false
          lineIndex++
          typingRef.current = setTimeout(typeLine, 500)
        }
      }
    }
    typeLine()
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current)
    }
  }, [experiment.typedAddresses, isHovered, motionSafe])

  useEffect(() => {
    if (!motionSafe || !persistHover || !cardRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: cardRef.current,
        start: "top 80%",
        onEnter: () => setIsScrollActive(true),
      })
    }, cardRef)

    return () => ctx.revert()
  }, [persistHover, motionSafe])

  const isActive = isHovered || isScrollActive

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative rounded-xl p-5 flex flex-col justify-between gap-3 transition-[border-color] duration-200 ease-[var(--ease-out)] overflow-hidden",
        experiment.span,
        children ? "bg-[#f5f4ff]" : "bg-white",
        "border border-gray-200",
        isActive && "border-[color:var(--sendly-indigo)]/40",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative z-10">
        <span className="font-mono text-xs text-gray-500">{experiment.medium}</span>
        <h3
          className={cn(
            "mt-2 font-jakarta font-semibold text-xl md:text-2xl tracking-tight transition-colors duration-200",
            isActive ? landingAccent : "text-gray-900",
          )}
        >
          {experiment.title}
        </h3>
      </div>

      {children && (
        <div className="relative z-10 flex flex-1 items-center justify-center min-h-[4rem] w-full -mt-2">
          {children}
        </div>
      )}

      {experiment.typedAddresses && (
        <div className="relative z-10 flex justify-center">
          <div className="font-mono text-xs text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200 max-w-[280px]">
            {typedText || experiment.typedAddresses[0]}
            {isHovered && motionSafe ? (
              <span className="animate-cursor-blink inline-block w-0.5 h-3.5 ml-0.5 bg-[var(--sendly-indigo)] align-middle" aria-hidden />
            ) : null}
          </div>
        </div>
      )}

      <p className={cn("relative z-10", landingBody, "text-xs md:text-sm max-w-[280px]")}>
        {experiment.description}
      </p>
    </article>
  )
}
