import { useCallback, useEffect, useRef, useState } from 'react';
import type { Driver } from 'driver.js';

import { Button } from '@/components/ui/button';
import QuestionMark from '@/components/itshover-icons/question-mark';
import { createPaymentsTour, type PaymentsTourMode } from '@/lib/onboarding/paymentsTour';
import { readPaymentsOnboardingState } from '@/lib/onboarding/paymentsOnboardingStorage';

type PaymentsOnboardingProps = {
  activeTab: 'send' | 'receive';
  preview: boolean;
  claimFlow: boolean;
};

function isVisible(selector: string): boolean {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  return Boolean(
    element.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0',
  );
}

function waitForSendTargets(onReady: () => void): () => void {
  let cancelled = false;
  let frameId = 0;

  const stop = () => {
    cancelled = true;
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(timeoutId);
  };

  const check = () => {
    if (cancelled) return;

    if (
      isVisible('[data-tour="payments-tabs"]') &&
      isVisible('#to-input') &&
      isVisible('#amount-input')
    ) {
      stop();
      onReady();
      return;
    }

    frameId = window.requestAnimationFrame(check);
  };

  const timeoutId = window.setTimeout(stop, 4000);
  frameId = window.requestAnimationFrame(check);

  return stop;
}

export function PaymentsOnboarding({
  activeTab,
  preview,
  claimFlow,
}: PaymentsOnboardingProps) {
  const [isGuideFocused, setIsGuideFocused] = useState(false);
  const automaticStartRef = useRef(false);
  const tourRef = useRef<Driver | null>(null);

  const startTour = useCallback((mode: PaymentsTourMode) => {
    tourRef.current?.destroy();

    const tour = createPaymentsTour({ mode });
    tourRef.current = tour;
    tour.drive();
  }, []);

  useEffect(() => {
    if (
      preview ||
      claimFlow ||
      activeTab !== 'send' ||
      automaticStartRef.current ||
      readPaymentsOnboardingState() !== null
    ) {
      return undefined;
    }

    const stopWaiting = waitForSendTargets(() => {
      if (
        preview ||
        claimFlow ||
        automaticStartRef.current ||
        readPaymentsOnboardingState() !== null
      ) {
        return;
      }

      automaticStartRef.current = true;
      startTour('auto');
    });

    return () => {
      stopWaiting();
      tourRef.current?.destroy();
      tourRef.current = null;
    };
  }, [activeTab, claimFlow, preview, startTour]);

  if (preview || claimFlow) return null;

  return (
    <div className="fixed right-2 bottom-[4.5rem] z-40 md:right-4 md:bottom-[5.5rem]">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Show Payments guide"
        title="Show Payments guide"
        onFocus={() => setIsGuideFocused(true)}
        onBlur={() => setIsGuideFocused(false)}
        onClick={() => startTour('replay')}
        className="min-h-[44px] min-w-[44px] rounded-full border border-indigo-100/70 bg-white/75 p-2 text-indigo-600 hover:bg-white/95 hover:text-indigo-700"
      >
        <QuestionMark
          size={24}
          active={isGuideFocused}
          className="size-6"
        />
      </Button>
    </div>
  );
}
