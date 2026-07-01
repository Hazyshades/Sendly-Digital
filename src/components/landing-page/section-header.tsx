import { cn } from "@/lib/utils"
import { landingH2, landingLead } from "@/components/landing-page/landing-styles"

type SectionHeaderProps = {
  title: string
  description: React.ReactNode
  className?: string
  titleId?: string
}

export function SectionHeader({
  title,
  description,
  className,
  titleId,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-16 md:mb-24", className)}>
      <h2 id={titleId} className={landingH2}>
        {title}
      </h2>
      <p className={landingLead}>{description}</p>
    </div>
  )
}
