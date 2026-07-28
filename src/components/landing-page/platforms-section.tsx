import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { scrollRevealOnce, useMotionSafe } from "@/hooks/useMotionSafe"
import { GitHubIcon, GmailIcon, TwitchIcon, XIcon } from "./platform-icons"

gsap.registerPlugin(ScrollTrigger)

interface Platform {
  name: string
  handle: string
  description: string
  icon: (props: { className?: string }) => React.ReactNode
  iconClassName: string
  iconWrapClassName: string
}

const platforms: Platform[] = [
  {
    name: "X",
    handle: "@ZachXBT",
    description: "Tip a thread, pay a bounty, or drop a gift card in a DM.",
    icon: XIcon,
    iconClassName: "h-5 w-5 text-white",
    iconWrapClassName: "bg-ink",
  },
  {
    name: "GitHub",
    handle: "@steipete",
    description: "Reward a maintainer or settle a PR bounty on the repo.",
    icon: GitHubIcon,
    iconClassName: "h-5 w-5 text-white",
    iconWrapClassName: "bg-[#24292f]",
  },
  {
    name: "Twitch",
    handle: "@Trainwreckstv",
    description: "Donations that land as USDC, not platform credit.",
    icon: TwitchIcon,
    iconClassName: "h-5 w-5 text-white",
    iconWrapClassName: "bg-[#9146ff]",
  },
  {
    name: "Gmail",
    handle: "caroline@gmail.com",
    description: "Send money to any inbox, claimable with an email proof.",
    icon: GmailIcon,
    iconClassName: "h-5 w-5",
    iconWrapClassName: "border border-black/10 bg-white",
  },
]

function PlatformCard({ platform }: { platform: Platform }) {
  const motionSafe = useMotionSafe()
  const [typedHandle, setTypedHandle] = useState(platform.handle)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => timeouts.forEach(clearTimeout)
  }, [])

  const retypeHandle = () => {
    if (!motionSafe) return
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    let charIndex = 0
    const tick = () => {
      setTypedHandle(platform.handle.slice(0, charIndex))
      if (charIndex < platform.handle.length) {
        charIndex++
        timeoutsRef.current.push(window.setTimeout(tick, 35))
      }
    }
    tick()
  }

  const Icon = platform.icon

  return (
    <article
      onMouseEnter={retypeHandle}
      className="glow-ring group rounded-[26px] border border-black/5 bg-white p-6 transition-transform duration-300 hover:-translate-y-1"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${platform.iconWrapClassName}`}>
        <Icon className={platform.iconClassName} />
      </span>
      <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-ink">{platform.name}</h3>
      <p className="mt-1.5 text-sm leading-[1.45] tracking-[-0.02em] text-graphite">
        {platform.description}
      </p>
      <span className="mt-4 inline-block min-h-[30px] rounded-full bg-mist px-3 py-1.5 font-mono text-xs text-graphite">
        {typedHandle || '\u00A0'}
      </span>
    </article>
  )
}

export function PlatformsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const motionSafe = useMotionSafe()

  useEffect(() => {
    if (!motionSafe || !sectionRef.current || !gridRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(gridRef.current!.children, {
        y: 24,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 82%',
          ...scrollRevealOnce,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [motionSafe])

  return (
    <section id="platforms" ref={sectionRef} className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[600px] text-center">
        <h2 className="font-serif-display text-4xl leading-[1.05] text-ink md:text-5xl">
          Anywhere they are.
        </h2>
        <p className="mt-4 text-sm leading-[1.5] tracking-[-0.02em] text-graphite md:text-base">
          One link works across the platforms your people already live on.
          The username is the address.
        </p>
      </div>

      <div ref={gridRef} className="mx-auto mt-14 grid max-w-[1200px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {platforms.map((platform) => (
          <PlatformCard key={platform.name} platform={platform} />
        ))}
      </div>
    </section>
  )
}
