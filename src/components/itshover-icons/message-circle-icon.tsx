import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { motion, useAnimate, useReducedMotion } from 'motion/react';

import type { AnimatedIconHandle, AnimatedIconProps } from './types';

const MessageCircleIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', active }, ref) => {
    const [scope, animate] = useAnimate();
    const reduceMotion = useReducedMotion();

    const stop = useCallback(() => {
      animate(
        '.message-path',
        { pathLength: 1, opacity: 1, scale: 1 },
        { duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' },
      );
    }, [animate, reduceMotion]);

    const start = useCallback(async () => {
      if (reduceMotion) {
        stop();
        return;
      }

      animate('.message-path', { pathLength: 0, opacity: 0 }, { duration: 0 });

      await animate(
        '.message-path',
        { pathLength: [0, 1], opacity: [0, 1] },
        { duration: 0.45, ease: 'easeInOut' },
      );

      animate(
        '.message-path',
        { scale: [1, 1.05, 1] },
        { duration: 0.22, ease: 'easeOut' },
      );
    }, [animate, reduceMotion, stop]);

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
        onHoverStart={() => void start()}
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
        className={className}
        focusable="false"
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        <motion.path
          className="message-path"
          d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
          initial={{ pathLength: 1, opacity: 1 }}
          style={{ transformOrigin: 'center' }}
        />
      </motion.svg>
    );
  },
);

MessageCircleIcon.displayName = 'MessageCircleIcon';

export default MessageCircleIcon;
