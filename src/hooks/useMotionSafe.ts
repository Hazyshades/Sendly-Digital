import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Sync check - use in effects before GSAP/Lenis init. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** `true` when transform/scroll motion is allowed. */
export function useMotionSafe(): boolean {
  const [motionSafe, setMotionSafe] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setMotionSafe(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return motionSafe;
}

/** ScrollTrigger config: play once on enter, no reverse on scroll-up. */
export const scrollRevealOnce = {
  once: true as const,
};
