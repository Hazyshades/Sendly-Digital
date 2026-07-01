import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { landingBody } from '@/components/landing-page/landing-styles'

type GetStartedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GetStartedDialog({ open, onOpenChange }: GetStartedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-xl border border-gray-200 bg-white p-6 sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Get started
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Pick how you want to send USDC through social accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <button
            type="button"
            disabled
            className="relative flex flex-col items-start gap-2 p-5 rounded-xl bg-gray-50 border border-gray-200 cursor-not-allowed opacity-60 text-left"
            aria-disabled="true"
          >
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
              Soon
            </span>
            <span className="font-semibold text-gray-900">Direct payments</span>
            <span className="text-sm text-gray-600">Send USDC to @handles with zkTLS verification.</span>
          </button>
          <Link
            to="/create"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex flex-col items-start gap-2 p-5 rounded-xl bg-white border border-gray-200",
              "hover:border-[color:var(--sendly-indigo)]/40 transition-colors duration-200 ease-[var(--ease-out)]",
              "active:scale-[0.98] motion-reduce:active:scale-100 text-left min-h-[5.5rem]",
              "outline-none focus-visible:ring-2 focus-visible:ring-[var(--sendly-indigo)] focus-visible:ring-offset-2",
            )}
          >
            <span className="font-semibold text-gray-900">Create gift card</span>
            <span className={cn(landingBody, "text-sm")}>Design a card and send it to someone's @handle.</span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
