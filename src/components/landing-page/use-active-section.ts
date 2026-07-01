import { useEffect, useState } from "react"

const SECTION_IDS = ["work", "signals", "principles"] as const

export type LandingSectionId = (typeof SECTION_IDS)[number]

export function useActiveLandingSection() {
  const [activeId, setActiveId] = useState<LandingSectionId | null>(null)

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )

    if (sections.length === 0) return

    const visible = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.intersectionRatio)
        }

        let bestId: LandingSectionId | null = null
        let bestRatio = 0

        for (const id of SECTION_IDS) {
          const ratio = visible.get(id) ?? 0
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        }

        if (bestRatio > 0) {
          setActiveId(bestId)
        }
      },
      {
        rootMargin: "-42% 0px -42% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  return activeId
}
