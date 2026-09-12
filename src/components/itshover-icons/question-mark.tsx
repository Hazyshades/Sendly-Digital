import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { motion, useAnimate, useReducedMotion } from 'motion/react';

import type { AnimatedIconHandle, AnimatedIconProps } from './types';

const QuestionMark = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', active }, ref) => {
    const [scope, animate] = useAnimate();
    const reduceMotion = useReducedMotion();

    const stop = useCallback(() => {
      animate(
        '.question-mark, .question-mark-dot, .question-group',
        { pathLength: 1, y: 0, scale: 1 },
        { duration: reduceMotion ? 0 : 0.2, ease: 'easeInOut' },
      );
    }, [animate, reduceMotion]);

    const start = useCallback(async () => {
      if (reduceMotion) {
        stop();
        return;
      }

      await animate(
        '.question-mark',
        { pathLength: [0, 1] },
        { duration: 0.4, ease: 'easeInOut' },
      );

      await animate(
        '.question-mark-dot',
        { pathLength: [0, 1], y: [0, -3, 0] },
        { duration: 0.3, ease: 'easeOut' },
      );

      animate(
        '.question-group',
        { scale: [1, 1.05, 1] },
        { duration: 0.2, ease: 'easeOut' },
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
      <motion.span
        ref={scope}
        className="inline-flex"
        onHoverStart={() => void start()}
        onHoverEnd={stop}
        aria-hidden="true"
      >
        <motion.svg
          className={`question-group ${className}`}
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
          style={{ overflow: 'visible' }}
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <motion.path
            className="question-mark"
            d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"
          />
          <motion.path className="question-mark-dot" d="M12 19l0 .01" />
        </motion.svg>
      </motion.span>
    );
  },
);

QuestionMark.displayName = 'QuestionMark';

export default QuestionMark;
