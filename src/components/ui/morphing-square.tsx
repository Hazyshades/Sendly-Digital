import { cva } from 'class-variance-authority';
import { type HTMLMotionProps, motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

const morphingSquareVariants = cva('flex items-center justify-center gap-2', {
  variants: {
    messagePlacement: {
      bottom: 'flex-col',
      top: 'flex-col-reverse',
      right: 'flex-row',
      left: 'flex-row-reverse',
    },
  },
  defaultVariants: {
    messagePlacement: 'bottom',
  },
});

export interface MorphingSquareProps {
  message?: string;
  /**
   * Position of the message relative to the spinner.
   * @default bottom
   */
  messagePlacement?: 'top' | 'bottom' | 'left' | 'right';
}

export function MorphingSquare({
  className,
  message,
  messagePlacement = 'bottom',
  ...props
}: HTMLMotionProps<'div'> & MorphingSquareProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn(morphingSquareVariants({ messagePlacement }))}>
      <motion.div
        className={cn('h-10 w-10 bg-primary', className)}
        animate={
          reduceMotion
            ? undefined
            : {
                borderRadius: ['6%', '50%', '6%'],
                rotate: [0, 180, 360],
              }
        }
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={reduceMotion ? { borderRadius: '20%' } : undefined}
        aria-hidden="true"
        {...props}
      />
      {message ? (
        <div className="text-sm font-medium text-[#5c626b]">{message}</div>
      ) : null}
    </div>
  );
}
