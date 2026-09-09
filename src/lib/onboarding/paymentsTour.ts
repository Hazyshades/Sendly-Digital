import { driver, type DriveStep, type Driver, type PopoverDOM } from 'driver.js';

import { writePaymentsOnboardingState } from './paymentsOnboardingStorage';

const SENDLY_POPOVER_CLASS = 'sendly-driver-popover';
const STEP_PROGRESS_TEXT = 'Step {{current}} of {{total}}';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export type PaymentsTourMode = 'auto' | 'replay';

export type CreatePaymentsTourOptions = {
  mode?: PaymentsTourMode;
};
type ElementResolver = () => Element | null;

function isVisibleElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  return Boolean(
    element.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0',
  );
}

function findVisibleElement(selector: string): Element | null {
  return (
    Array.from(document.querySelectorAll(selector)).find((element) => isVisibleElement(element)) ?? null
  );
}

function targetStep(
  selector: string,
  title: string,
  description: string,
  resolveElement: ElementResolver = () => findVisibleElement(selector),
): DriveStep | null {
  const element = resolveElement();
  if (!element) return null;

  return {
    element: () => resolveElement() as Element,
    skipMissingElement: true,
    popover: {
      title,
      description,
    },
  };
}

function getWalletSourceDescription(): string {
  const sourceElement = findVisibleElement(
    '[data-tour="wallet-source"][data-tour-state="available"]',
  );
  const sources = sourceElement?.getAttribute('data-tour-sources');

  if (sources === 'browser') {
    return 'Use your connected browser wallet before sending or claiming.';
  }
  if (sources === 'internal') {
    return 'Use Internal Wallet before sending or claiming.';
  }
  return 'When available, choose your browser wallet or Internal Wallet before sending or claiming.';
}

function addSkipButton(popover: PopoverDOM, onSkip: () => void): void {
  if (popover.footerButtons.querySelector('.sendly-driver-skip-btn')) return;
  const skipButton = document.createElement('button');
  skipButton.type = 'button';
  skipButton.className = 'driver-popover-footer-btn sendly-driver-skip-btn';
  skipButton.textContent = 'Skip tour';
  skipButton.setAttribute('aria-label', 'Skip Payments guide');
  skipButton.addEventListener('click', onSkip);
  popover.footerButtons.prepend(skipButton);
}

export function createPaymentsTour({ mode = 'auto' }: CreatePaymentsTourOptions = {}): Driver {
  let completed = false;
  let dismissed = false;
  let tour: Driver;

  const markDismissed = () => {
    if (completed || dismissed) return;
    dismissed = true;
    if (mode === 'auto') writePaymentsOnboardingState('dismissed');
  };
  let removeOutsideClickListener: (() => void) | null = null;
  let outsideClickScheduled = false;

  const installOutsideClickListener = () => {
    if (removeOutsideClickListener) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!tour.isActive()) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(`.${SENDLY_POPOVER_CLASS}`) ||
        target.closest('.driver-active-element')
      ) {
        return;
      }

      if (outsideClickScheduled) return;
      outsideClickScheduled = true;
      markDismissed();
      window.setTimeout(() => {
        outsideClickScheduled = false;
        if (tour.isActive()) tour.destroy();
      }, 0);
    };

    document.addEventListener('click', handleOutsideClick, true);
    removeOutsideClickListener = () => {
      document.removeEventListener('click', handleOutsideClick, true);
      removeOutsideClickListener = null;
    };
  };

  const resolveIdentitiesTrigger: ElementResolver = () =>
    findVisibleElement(
      window.matchMedia('(max-width: 1023px)').matches
        ? '[data-tour="identities-trigger-mobile"]'
        : '[data-tour="identities-trigger-desktop"]',
    );
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'A quick tour of Payments',
        description:
          'See where to send, receive, and manage payment identities. This guide will not connect anything or submit a transaction.',
      },
    },
    targetStep(
      '[data-tour="payments-tabs"]',
      'Send or Receive',
      'Use Send to create a payment. Use Receive to find payments waiting for you.',
    ),
    targetStep(
      '#to-input',
      'Choose who gets paid',
      'Select a platform, then enter a username, email address, or wallet address.',
    ),
    targetStep(
      '#amount-input',
      'Set the amount',
      'Enter an amount and choose a token. The balance beside the field follows the selected wallet source.',
    ),
    targetStep(
      '[data-tour="wallet-source"][data-tour-state="available"]',
      'Choose a wallet source',
      getWalletSourceDescription(),
    ),
    targetStep(
      '[data-tour="identities-trigger-desktop"], [data-tour="identities-trigger-mobile"]',
      'Connect payment identities',
      'Link social accounts here so people can pay you by username or email.',
      resolveIdentitiesTrigger,
    ),
    targetStep(
      '[data-tour="payments-receive-tab"]',
      'Find incoming payments',
      'Open Receive to review pending payments and claim them to the selected wallet.',
    ),
  ].filter((step): step is DriveStep => step !== null);

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

  tour = driver({
    steps,
    animate: !reducedMotion,
    duration: reducedMotion ? 0 : 220,
    smoothScroll: !reducedMotion,
    allowClose: true,
    allowScroll: true,
    overlayClickBehavior: 'close',
    allowKeyboardControl: true,
    overlayColor: '#111827',
    overlayOpacity: 0.36,
    stagePadding: 8,
    stageRadius: 14,
    popoverClass: SENDLY_POPOVER_CLASS,
    showProgress: true,
    progressText: STEP_PROGRESS_TEXT,
    showButtons: ['next', 'previous', 'close'],
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    onPopoverRender: (popover) => {
      installOutsideClickListener();
      addSkipButton(popover, () => {
        markDismissed();
        tour.destroy();
      });
    },
    onDoneClick: () => {
      completed = true;
      if (mode === 'auto') writePaymentsOnboardingState('completed');
      tour.destroy();
    },
    onDestroyed: () => {
      removeOutsideClickListener?.();
      markDismissed();
    },
  });

  return tour;
}
