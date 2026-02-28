import { useEffect, useState } from 'react';

interface BlurTextProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function BlurText({ children, delay = 0, duration = 1000, className = '' }: BlurTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        filter: isVisible ? 'blur(0px)' : 'blur(10px)',
        opacity: isVisible ? 1 : 0,
        transition: `filter ${duration}ms ease-out, opacity ${duration}ms ease-out`,
      }}
    >
      {children}
    </span>
  );
}

