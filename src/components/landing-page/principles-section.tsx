import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionHeader } from "./section-header"
import { landingAccent, landingBody, landingSection } from "./landing-styles"
import { scrollRevealOnce, useMotionSafe } from "@/hooks/useMotionSafe"

gsap.registerPlugin(ScrollTrigger)

export function PrinciplesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const principlesRef = useRef<HTMLDivElement>(null)

  const principles = [
    {
      label: "Access",
      titleParts: [
        { text: "Use accounts", highlight: true },
        { text: " you already have", highlight: false },
      ],
      description: "Sign in with X, GitHub, Twitch, or Gmail. No new username to remember.",
      align: "left",
    },
    {
      label: "Link",
      titleParts: [
        { text: "Your @handle", highlight: true },
        { text: " is the address", highlight: false },
      ],
      description: "Sendly maps social identities to wallets. Senders type a handle, not a 0x string.",
      align: "right",
    },
    {
      label: "Send",
      titleParts: [
        { text: "Pay people", highlight: true },
        { text: ", not hashes", highlight: false },
      ],
      description: "Tips, gifts, and agent payouts go to the person behind the profile.",
      align: "left",
    },
    {
      label: "Verify",
      titleParts: [
        { text: "Prove ownership", highlight: true },
        { text: " privately", highlight: false },
      ],
      description: "zkTLS confirms you control the account without exposing session data or passwords.",
      align: "right",
    },
  ]

  const motionSafe = useMotionSafe()

  useEffect(() => {
    if (!motionSafe || !sectionRef.current || !headerRef.current || !principlesRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          ...scrollRevealOnce,
        },
      })

      const articles = principlesRef.current?.querySelectorAll("article")
      articles?.forEach((article, index) => {
        const isRight = principles[index].align === "right"
        gsap.from(article, {
          x: isRight ? 16 : -16,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: article,
            start: "top 85%",
            ...scrollRevealOnce,
          },
        })
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section
      ref={sectionRef}
      id="principles"
      className={landingSection}
      aria-labelledby="principles-heading"
    >
      <div ref={headerRef} className="max-w-2xl">
        <SectionHeader
          titleId="principles-heading"
          title="Why social payments"
          description="Wallets are hard to share. Usernames are not."
          className="mb-16 md:mb-24"
        />
      </div>

      <div ref={principlesRef} className="space-y-16 md:space-y-20">
        {principles.map((principle) => (
          <article
            key={principle.label}
            className={`flex flex-col ${
              principle.align === "right" ? "items-end text-right" : "items-start text-left"
            }`}
          >
            <span className="font-mono text-xs text-gray-500 mb-3">
              {principle.label}
            </span>

            <h3 className="font-jakarta font-semibold text-3xl md:text-5xl lg:text-[3.5rem] tracking-[-0.03em] leading-tight text-balance">
              {principle.titleParts.map((part, i) =>
                part.highlight ? (
                  <span key={i} className={landingAccent}>
                    {part.text}
                  </span>
                ) : (
                  <span key={i} className="text-gray-900">{part.text}</span>
                )
              )}
            </h3>

            <p className={`mt-5 max-w-md ${landingBody}`}>
              {principle.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
