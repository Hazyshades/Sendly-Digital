import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SocialLogos } from "./SocialLogos"

gsap.registerPlugin(ScrollTrigger)

const experiments = [
  {
    title: "Connect",
    medium: "Social layer",
    description: "A witness layer attests the session, deriving only the necessary identity.",
    span: "col-span-2 row-span-2",
  },
  {
    title: "Attestor",
    medium: "Proxy layer",
    description: "Proxy stands between the device and the platform, attests the TLS session",
    span: "col-span-1 row-span-1",
  },
  {
    title: "Receive",
    medium: "Payment layer",
    description: "Contract verifies your proof and pays you.",
    span: "col-span-1 row-span-2",
    number: 4,
    typedAddresses: [
      "100 USDC on X",
      "20$ tips on GitHub",
      "$15 donation on Twitch",
      "50 EURC on Gmail",
    ],
  },
  {
    title: "Prove",
    medium: "zkTLS layer",
    description: "Create a ZK proof from the attested session - asserting account ownership.",
    span: "col-span-1 row-span-1",
    number: 3,
  },
]

export function WorkSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !gridRef.current) return

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
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      )

      const cards = gridRef.current?.querySelectorAll("article")
      if (cards && cards.length > 0) {
        gsap.set(cards, { y: 60, opacity: 0 })
        gsap.to(cards, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="work" className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24">
      <div ref={headerRef} className="mb-16 md:mb-24">
        <h2 className="font-jakarta font-bold text-3xl md:text-5xl text-gray-900 tracking-tight">
          zkTLS-powered payments
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent mt-2">
          Seamless and secure.
        </p>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[160px] md:auto-rows-[180px]"
      >
        {experiments.map((experiment, index) => (
          <WorkCard
            key={index}
            experiment={experiment}
            index={index}
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
  index,
  persistHover = false,
  children,
}: {
  experiment: {
    title: string
    medium: string
    description: string
    span: string
    number?: number
    typedAddresses?: string[]
  }
  index: number
  persistHover?: boolean
  children?: React.ReactNode
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [typedText, setTypedText] = useState("")
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRef = useRef<HTMLElement>(null)
  const [isScrollActive, setIsScrollActive] = useState(false)

  useEffect(() => {
    if (!experiment.typedAddresses || !isHovered) {
      setTypedText("")
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
  }, [experiment.typedAddresses, isHovered])

  useEffect(() => {
    if (!persistHover || !cardRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: cardRef.current,
        start: "top 80%",
        onEnter: () => setIsScrollActive(true),
      })
    }, cardRef)

    return () => ctx.revert()
  }, [persistHover])

  const isActive = isHovered || isScrollActive

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-500 cursor-pointer overflow-hidden",
        experiment.span,
        children ? "bg-[#F4F2FD]" : "bg-white/90 backdrop-blur-sm",
        "border border-gray-200 shadow-circle-card",
        isActive && "border-[#6366f1]/60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#6366f1]/10 to-[#8b5cf6]/10 rounded-full blur-2xl transition-opacity duration-500",
          isActive ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        className={cn(
          "absolute inset-0 bg-[#6366f1]/5 transition-opacity duration-500",
          isActive && !children ? "opacity-100" : "opacity-0"
        )}
      />

      <div className="relative z-10">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          {experiment.medium}
        </span>
        <h3
          className={cn(
            "mt-3 font-jakarta font-bold text-2xl md:text-3xl tracking-tight transition-colors duration-300",
            isActive ? "text-[#6366f1]" : "text-gray-900"
          )}
        >
          {experiment.title}
        </h3>
      </div>

      {children && (
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 w-full" style={{ top: -27 }}>
          {children}
        </div>
      )}

      {experiment.typedAddresses && (
        <div className={cn("relative z-10 flex-1 flex items-center justify-center")}>
          <div
            className={cn(
              "transition-all duration-500 flex justify-center",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
          >
            <div className="font-mono text-xs text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-200 shadow-sm max-w-[240px]">
              {typedText}
              {isHovered && (
                <span className="animate-cursor-blink inline-block w-0.5 h-3.5 ml-0.5 bg-[#6366f1] align-middle" />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10">
        <p
          className={cn(
            "font-mono text-xs text-gray-600 leading-relaxed transition-all duration-500 max-w-[280px]",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          {experiment.description}
        </p>
      </div>

      <span
        className={cn(
          "absolute bottom-4 right-4 font-mono text-[10px] transition-colors duration-300",
          isActive ? "text-[#6366f1]" : "text-gray-400"
        )}
      >
        {String(experiment.number ?? index + 1).padStart(2, "0")}
      </span>
    </article>
  )
}
