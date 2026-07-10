import type { ReactNode } from 'react';

type BlogStepFrameProps = {
  compact?: boolean;
  children: ReactNode;
};

export function BlogStepFrame({ compact, children }: BlogStepFrameProps) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-violet-200/80 via-fuchsia-100 to-purple-200/70 shadow-sm transition-all duration-200 ease-out group-hover:bg-transparent group-hover:p-0 group-hover:shadow-none ${
        compact ? 'p-3' : 'p-4 md:p-5'
      }`}
    >
      <div className="rounded-xl border border-white/60 bg-white shadow-md overflow-hidden transition-all duration-200 ease-out group-hover:border-gray-200 group-hover:shadow-sm">
        {children}
      </div>
    </div>
  );
}
