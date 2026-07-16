import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MorphingSquare } from '@/components/ui/morphing-square';
import { useMotionSafe } from '@/hooks/useMotionSafe';

const SHOW_LOADER_MS = 200;
const SHOW_MESSAGE_MS = 800;

/**
 * Lightweight loading fallback (Privy Suspense + ZkHostRedirect).
 * Delays the loader so fast navigations never flash UI.
 */
export function SplashScreen() {
  const [showLoader, setShowLoader] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const motionSafe = useMotionSafe();

  useEffect(() => {
    const loaderTimer = window.setTimeout(() => setShowLoader(true), SHOW_LOADER_MS);
    const messageTimer = window.setTimeout(() => setShowMessage(true), SHOW_MESSAGE_MS);

    return () => {
      window.clearTimeout(loaderTimer);
      window.clearTimeout(messageTimer);
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
              className="h-8 w-8 bg-[#AC8EF5] shadow-[0_0_0_6px_rgba(172,142,245,0.2)]"
              message={showMessage ? 'Connecting securely…' : undefined}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
