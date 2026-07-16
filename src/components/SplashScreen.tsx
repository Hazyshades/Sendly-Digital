import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MorphingSquare } from '@/components/ui/morphing-square';
import { useMotionSafe } from '@/hooks/useMotionSafe';

/** DEBUG: force splash to stay visible. Set to 0 to restore production. */
export const DEBUG_SPLASH_HOLD_MS = 3000;

const SHOW_LOADER_MS = 0;
const SHOW_MESSAGE_MS = 0;

/**
 * Lightweight loading fallback (Privy Suspense + ZkHostRedirect).
 * Delays the loader so fast navigations never flash UI.
 */
export function SplashScreen() {
  const [showLoader, setShowLoader] = useState(SHOW_LOADER_MS === 0);
  const [showMessage, setShowMessage] = useState(SHOW_MESSAGE_MS === 0);
  const motionSafe = useMotionSafe();

  useEffect(() => {
    const loaderTimer =
      SHOW_LOADER_MS > 0
        ? window.setTimeout(() => setShowLoader(true), SHOW_LOADER_MS)
        : undefined;
    const messageTimer =
      SHOW_MESSAGE_MS > 0
        ? window.setTimeout(() => setShowMessage(true), SHOW_MESSAGE_MS)
        : undefined;

    return () => {
      if (loaderTimer !== undefined) window.clearTimeout(loaderTimer);
      if (messageTimer !== undefined) window.clearTimeout(messageTimer);
    };
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#fafaf8]"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Connecting securely"
    >
      <AnimatePresence>
        {showLoader ? (
          <motion.div
            key="splash-loader"
            initial={motionSafe ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: motionSafe ? 0.35 : 0, ease: 'easeOut' }}
          >
            <MorphingSquare
              className="h-8 w-8 bg-[#303a80] shadow-[0_0_0_6px_rgba(238,240,250,0.9)]"
              message={showMessage ? 'Connecting securely…' : undefined}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
