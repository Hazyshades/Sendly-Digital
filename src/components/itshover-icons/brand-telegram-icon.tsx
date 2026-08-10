import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { motion, useAnimate } from 'motion/react';

import type { AnimatedIconHandle, AnimatedIconProps } from './types';

const BrandTelegramIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', active }, ref) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      animate(
        '.plane',
        { x: [0, 10, -10, 0], y: [0, -10, 10, 0], opacity: [1, 0, 0, 1] },
        { duration: 1, times: [0, 0.4, 0.5, 1], ease: 'easeInOut' },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate('.plane', { x: 0, y: 0, opacity: 1 });
    }, [animate]);

    useEffect(() => {
      if (typeof active !== 'boolean') return;
      if (active) {
        void start();
      } else {
        stop();
      }
    }, [active, start, stop]);

    useImperativeHandle(ref, () => ({
      startAnimation: start,
      stopAnimation: stop,
    }), [start, stop]);

    return (
      <motion.svg
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`cursor-pointer ${className}`}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <motion.path className="plane" d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" />
      </motion.svg>
    );
  },
);

BrandTelegramIcon.displayName = 'BrandTelegramIcon';

export default BrandTelegramIcon;
