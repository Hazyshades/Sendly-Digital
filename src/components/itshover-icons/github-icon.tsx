import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { Github } from 'lucide-react';
import { motion, useAnimate } from 'motion/react';

import type { AnimatedIconHandle, AnimatedIconProps } from './types';

const GithubIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = 'currentColor', className = '', active }, ref) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(
        scope.current,
        { scale: [1, 1.08, 1], rotate: [0, -8, 8, 0] },
        { duration: 0.5, ease: 'easeInOut' },
      );
    }, [animate, scope]);

    const stop = useCallback(() => {
      animate(scope.current, { scale: 1, rotate: 0 }, { duration: 0.2, ease: 'easeOut' });
    }, [animate, scope]);

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
    }));

    return (
      <motion.div ref={scope} className={`inline-flex items-center justify-center ${className}`} style={{ color }}>
        <Github size={size} strokeWidth={1.9} style={{ width: '100%', height: '100%' }} />
      </motion.div>
    );
  },
);

GithubIcon.displayName = 'GithubIcon';

export default GithubIcon;
