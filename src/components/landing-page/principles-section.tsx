import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function PrinciplesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const principlesRef = useRef<HTMLDivElement>(null)

  const principles = [
    {
      number: "01",
      label: "ACCESS",
      titleParts: [
        { text: "SEAMLESS", highlight: true },
        { text: " ENTRY", highlight: false },
      ],
      description: "Security without friction. Onboarding that disappears into the experience.",
      align: "left",
    },
    {
      number: "02",
      label: "LINK",
      titleParts: [
        { text: "SOCIAL", highlight: true },
        { text: " BRIDGE", highlight: false },
      ],
      description: "Your online identity becomes your financial address. No new namespaces.",
      align: "right",
    },
    {
      number: "03",
      label: "SEND",
      titleParts: [
        { text: "DIRECT", highlight: true },
        { text: " INTENT", highlight: false },
      ],
      description: "Type a username, not a hash. Money flows to people, not addresses.",
      align: "left",
    },
    {
      number: "04",
      label: "VERIFY",
      titleParts: [
        { text: "ZERO-KNOWLEDGE", highlight: true },
        { text: " TRUST", highlight: false },
      ],
      description: "Prove control without revealing data. Privacy preserved, certainty absolute.",
      align: "right",
    },
  ]

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !principlesRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        x: -60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      })

      const articles = principlesRef.current?.querySelectorAll("article")
      articles?.forEach((article, index) => {
        const isRight = principles[index].align === "right"
        gsap.from(article, {
          x: isRight ? 80 : -80,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: article,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="principles" className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24">
      <div ref={headerRef} className="mb-16 md:mb-24">
        <h2 className="font-jakarta font-bold text-3xl md:text-5xl text-gray-900 tracking-tight">
          Sendly
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent mt-2">
          Dispatch funds by nickname on any social network.
        </p>
      </div>

      <div ref={principlesRef} className="space-y-16 md:space-y-24">
        {principles.map((principle, index) => (
          <article
            key={index}
            className={`flex flex-col ${
              principle.align === "right" ? "items-end text-right" : "items-start text-left"
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4">
              {principle.number} / {principle.label}
            </span>

            <h3 className="font-jakarta font-bold text-4xl md:text-6xl lg:text-7xl tracking-tight leading-none">
              {principle.titleParts.map((part, i) =>
                part.highlight ? (
                  <span key={i} className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">
                    {part.text}
                  </span>
                ) : (
                  <span key={i} className="text-gray-900">{part.text}</span>
                )
              )}
            </h3>

            <p className="mt-6 max-w-md font-mono text-sm text-gray-600 leading-relaxed">
              {principle.description}
            </p>

            <div className={`mt-8 h-[1px] bg-gradient-to-r from-[#6366f1]/50 to-transparent w-24 md:w-48 ${principle.align === "right" ? "mr-0" : "ml-0"}`} />
          </article>
        ))}
      </div>
    </section>
  )
}
