import { useEffect, useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type ShellMode = "buy" | "sell"
type MethodId = "circle-onramp" | "paypal" | "wise" | "revolut"
type QuoteSpeed = "fast" | "best"
type SocialPlatform = "twitter" | "github" | "twitch" | "gmail"

type MethodOption = {
  id: MethodId
  label: string
  icon: string
}

const METHODS: MethodOption[] = [
  {
    id: "circle-onramp",
    label: "Circle",
    icon: "/circle-avatar.svg",
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: "/hero-quote/platforms/paypal.svg",
  },
  {
    id: "wise",
    label: "Wise",
    icon: "/hero-quote/platforms/wise.png",
  },
  {
    id: "revolut",
    label: "Revolut",
    icon: "/hero-quote/platforms/revolut.png",
  },
]

const SOCIAL_PLATFORMS: {
  id: SocialPlatform
  label: string
  handlePrefix: string
  placeholder: string
}[] = [
  {
    id: "twitter",
    label: "X",
    handlePrefix: "twitter",
    placeholder: "alice",
  },
  {
    id: "github",
    label: "GitHub",
    handlePrefix: "github",
    placeholder: "steipete",
  },
  {
    id: "twitch",
    label: "Twitch",
    handlePrefix: "twitch",
    placeholder: "trainwreckstv",
  },
  {
    id: "gmail",
    label: "Gmail",
    handlePrefix: "gmail",
    placeholder: "alice@gmail.com",
  },
]

const USDC_ICON = "/hero-quote/usdc-relay.png"
const FAST_RATE = 0.992
const BEST_RATE = 0.997

function formatMoney(value: number, currency: "USD" | "USDC") {
  if (!Number.isFinite(value) || value <= 0) return currency === "USD" ? "$0" : "0"
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency === "USD" ? `$${formatted}` : formatted
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M7 14l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Crisp Arc chain badge as inline SVG (avoids soft Relay PNG at tiny sizes). */
function ArcMark({ size = 11, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="#0B1220" />
      <path
        fill="#FFFFFF"
        d="M9.2 23.2V11.4c0-3.7 2.9-6.6 6.8-6.6 3.9 0 6.9 2.8 6.9 6.5 0 3.1-1.9 5.5-4.9 6.3l2.9 5.6h-3.5l-2.5-5.1H12.7v5.1H9.2zm3.5-8.4h2.9c1.6 0 2.6-1 2.6-2.4s-1-2.4-2.6-2.4h-2.9v4.8z"
      />
    </svg>
  )
}

function UsdcArcStack({
  className,
  size = 20,
  badgeSize = 11,
}: {
  className?: string
  size?: number
  badgeSize?: number
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={USDC_ICON}
        alt=""
        width={size}
        height={size}
        className="h-full w-full rounded-full object-cover"
      />
      <ArcMark
        size={badgeSize}
        className="absolute -bottom-0.5 -right-0.5 rounded-full outline outline-1 outline-white"
      />
    </span>
  )
}

function MethodMenu({
  options,
  method,
  onSelect,
  label,
}: {
  options: MethodOption[]
  method: MethodId
  onSelect: (id: MethodId) => void
  label: string
}) {
  return (
    <ul
      role="listbox"
      aria-label={label}
      className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[12.5rem] overflow-hidden rounded-xl border border-[#D8D8D4] bg-white p-1 shadow-lg"
    >
      {options.map((option) => {
        const active = option.id === method
        return (
          <li key={option.id} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onSelect(option.id)}
              className={cn(
                "flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-jakarta text-sm",
                active
                  ? "bg-[#6366F1]/10 font-semibold text-[#4F46E5]"
                  : "text-[#0D0D0C] hover:bg-[#F5F5F4]"
              )}
            >
              <img
                src={option.icon}
                alt=""
                width={16}
                height={16}
                className="h-4 w-4 rounded object-contain"
              />
              {option.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function PlatformMenu({
  platform,
  onSelect,
}: {
  platform: SocialPlatform
  onSelect: (id: SocialPlatform) => void
}) {
  return (
    <ul
      role="listbox"
      aria-label="Social platform"
      className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[9rem] overflow-hidden rounded-xl border border-[#D8D8D4] bg-white p-1 shadow-lg"
    >
      {SOCIAL_PLATFORMS.map((option) => {
        const active = option.id === platform
        return (
          <li key={option.id} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onSelect(option.id)}
              className={cn(
                "flex min-h-10 w-full items-center rounded-lg px-2.5 py-2 text-left font-jakarta text-sm",
                active
                  ? "bg-[#6366F1]/10 font-semibold text-[#4F46E5]"
                  : "text-[#0D0D0C] hover:bg-[#F5F5F4]"
              )}
            >
              {option.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function HeroBuySellShell({ className }: { className?: string }) {
  const amountId = useId()
  const socialId = useId()
  const cardRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<ShellMode>("buy")
  const [amount, setAmount] = useState("100")
  const [method, setMethod] = useState<MethodId>("circle-onramp")
  const [methodOpen, setMethodOpen] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(false)
  const [speed, setSpeed] = useState<QuoteSpeed>("best")
  const [socialUser, setSocialUser] = useState("alice")
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>("twitter")

  const modeMethods = METHODS
  const selected =
    modeMethods.find((m) => m.id === method) ?? modeMethods[0]
  const social = SOCIAL_PLATFORMS.find((p) => p.id === socialPlatform) ?? SOCIAL_PLATFORMS[0]
  const isBuy = mode === "buy"
  const numericAmount = Number.parseFloat(amount || "0")
  const hasAmount = Number.isFinite(numericAmount) && numericAmount > 0
  const rate = speed === "fast" ? FAST_RATE : BEST_RATE

  const receiveDisplay = useMemo(() => {
    if (!hasAmount) return isBuy ? "0" : "$0"
    if (isBuy) return formatMoney(numericAmount * rate, "USDC")
    return formatMoney(numericAmount * rate, "USD")
  }, [hasAmount, isBuy, numericAmount, rate])

  const socialHandle = useMemo(() => {
    const raw = socialUser.trim().replace(/^@/, "")
    if (!raw) return `${social.handlePrefix}:…`
    if (socialPlatform === "gmail") return `gmail:${raw}`
    return `${social.handlePrefix}:@${raw}`
  }, [social.handlePrefix, socialPlatform, socialUser])

  useEffect(() => {
    if (!methodOpen && !platformOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) {
        setMethodOpen(false)
        setPlatformOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMethodOpen(false)
        setPlatformOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [methodOpen, platformOpen])

  const setNumericAmount = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "")
    const parts = cleaned.split(".")
    const next =
      parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`
    setAmount(next)
  }

  const switchMode = (value: ShellMode) => {
    setMode(value)
    setMethodOpen(false)
    setPlatformOpen(false)
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "hero-buy-sell-shell relative w-full max-w-[400px] rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-circle-card sm:p-6",
        className
      )}
    >
      <div
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-[#F3F4F6] p-1"
        role="tablist"
        aria-label="Buy or sell"
      >
        {(["buy", "sell"] as const).map((value) => {
          const active = mode === value
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchMode(value)}
              className={cn(
                "min-h-11 rounded-lg px-3 font-jakarta text-sm font-semibold capitalize transition-colors",
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {value}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <div className="h-[116px] rounded-[20px] bg-[#F5F5F4] p-4">
          <label htmlFor={amountId} className="block h-4 font-jakarta text-xs text-[#3C3C38]">
            {isBuy ? "You pay" : "You deposit"}
          </label>
          <div className="mt-3 flex h-14 items-center gap-3">
            <span
              className={cn(
                "w-5 shrink-0 font-jakarta text-3xl font-bold tracking-tight text-[#9CA3AF]",
                !isBuy && "invisible"
              )}
              aria-hidden={!isBuy}
            >
              $
            </span>
            <input
              id={amountId}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setNumericAmount(e.target.value)}
              placeholder="0"
              className="min-w-0 w-full bg-transparent font-jakarta text-4xl font-bold tracking-tight text-[#0D0D0C] outline-none placeholder:text-[#9CA3AF]"
              aria-label={isBuy ? "USD amount to pay" : "USDC amount to deposit"}
            />
            {isBuy ? (
              <div className="relative w-[7.75rem] shrink-0">
                <button
                  type="button"
                  aria-expanded={methodOpen}
                  aria-haspopup="listbox"
                  onClick={() => {
                    setMethodOpen((open) => !open)
                    setPlatformOpen(false)
                  }}
                  className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#D8D8D4] bg-white px-2.5 font-jakarta text-[13px] font-semibold text-[#0D0D0C]"
                >
                  <img
                    src={selected.icon}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 rounded object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate text-left">{selected.label}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#6B6B66]" />
                </button>
                {methodOpen ? (
                  <MethodMenu
                    options={modeMethods}
                    method={selected.id}
                    label="Pay with"
                    onSelect={(id) => {
                      setMethod(id)
                      setMethodOpen(false)
                    }}
                  />
                ) : null}
              </div>
            ) : (
              <span className="inline-flex h-11 w-[7.75rem] shrink-0 items-center gap-2 rounded-xl border border-[#D8D8D4] bg-white px-2.5 font-jakarta text-[13px] font-semibold text-[#0D0D0C]">
                <UsdcArcStack size={20} badgeSize={11} />
                USDC
              </span>
            )}
          </div>
        </div>

        <div
          className="absolute left-1/2 top-[116px] z-[2] grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] border-white bg-[#F5F5F4] text-[#0D0D0C]"
          aria-hidden="true"
        >
          <ArrowDown className="h-4 w-4" />
        </div>

        <div className="mt-1 h-[260px] rounded-[20px] bg-[#F5F5F4] px-4 pb-4 pt-7">
          <div className="flex items-center justify-between gap-3">
            <p className="font-jakarta text-xs text-[#3C3C38]">You receive</p>
            <div
              className="inline-flex h-8 items-center gap-0.5 rounded-[9px] border border-[#D8D8D4] bg-white p-0.5"
              role="tablist"
              aria-label="Quote speed"
            >
              {(["fast", "best"] as const).map((value) => {
                const active = speed === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSpeed(value)}
                    className={cn(
                      "min-h-7 min-w-12 rounded-[7px] px-2.5 font-jakarta text-[11px] font-semibold capitalize",
                      active
                        ? "bg-[#6366F1]/12 text-[#4F46E5]"
                        : "text-[#3C3C38] hover:text-[#0D0D0C]"
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-4 mt-1 flex h-[4.75rem] items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate font-jakarta text-4xl font-bold tracking-tight",
                  hasAmount ? "text-[#0D0D0C]" : "text-[#9CA3AF]"
                )}
              >
                {isBuy ? (
                  <>
                    {receiveDisplay}
                    <span className="ml-1 text-sm font-semibold text-[#6B7280]">USDC</span>
                  </>
                ) : (
                  receiveDisplay
                )}
              </p>
              <p className="mt-1 flex h-5 items-center gap-1.5 font-jakarta text-xs font-medium text-[#6B7280]">
                {isBuy ? (
                  <>
                    <UsdcArcStack size={18} badgeSize={11} />
                    <span className="sr-only">USDC on Arc</span>
                  </>
                ) : (
                  "USD"
                )}
              </p>
            </div>

            <div className={cn("relative w-[7.75rem] shrink-0", isBuy && "invisible")} aria-hidden={isBuy}>
              <button
                type="button"
                aria-expanded={methodOpen}
                aria-haspopup="listbox"
                tabIndex={isBuy ? -1 : 0}
                disabled={isBuy}
                onClick={() => {
                  if (isBuy) return
                  setMethodOpen((open) => !open)
                  setPlatformOpen(false)
                }}
                className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#D8D8D4] bg-white px-2.5 font-jakarta text-[13px] font-semibold text-[#0D0D0C] disabled:cursor-default"
              >
                <img
                  src={selected.icon}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0 rounded object-contain"
                />
                <span className="min-w-0 flex-1 truncate text-left">{selected.label}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#6B6B66]" />
              </button>
              {!isBuy && methodOpen ? (
                <MethodMenu
                  options={modeMethods}
                  method={selected.id}
                  label="Receive to"
                  onSelect={(id) => {
                    setMethod(id)
                    setMethodOpen(false)
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative shrink-0">
              <button
                type="button"
                aria-expanded={platformOpen}
                aria-haspopup="listbox"
                onClick={() => {
                  setPlatformOpen((open) => !open)
                  setMethodOpen(false)
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-[#D8D8D4] bg-white px-3 font-jakarta text-[13px] font-semibold text-[#0D0D0C]"
              >
                {social.label}
                <ChevronDown className="h-4 w-4 text-[#6B6B66]" />
              </button>
              {platformOpen ? (
                <PlatformMenu
                  platform={socialPlatform}
                  onSelect={(id) => {
                    setSocialPlatform(id)
                    setPlatformOpen(false)
                  }}
                />
              ) : null}
            </div>
            <label htmlFor={socialId} className="sr-only">
              Social username
            </label>
            <input
              id={socialId}
              type="text"
              autoComplete="off"
              value={socialUser}
              onChange={(e) => setSocialUser(e.target.value)}
              placeholder={social.placeholder}
              className="block h-11 min-w-0 flex-1 rounded-2xl border border-[#D8D8D4] bg-white px-[18px] font-jakarta text-[13px] text-[#0D0D0C] outline-none placeholder:text-[#91918B] focus:border-[#6366F1]"
            />
          </div>
          <p className="mt-1.5 h-8 overflow-hidden font-jakarta text-[11px] leading-4 text-[#6B6B66]">
            {isBuy ? (
              <>
                Send to <span className="font-medium text-[#374151]">{socialHandle}</span> on Arc
              </>
            ) : (
              <>
                Cash out for <span className="font-medium text-[#374151]">{socialHandle}</span> on
                Arc to {selected.label}
              </>
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-4 flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-[#E5E7EB] font-jakarta text-sm font-semibold text-[#6B7280]"
      >
        Coming soon
      </button>
    </div>
  )
}
