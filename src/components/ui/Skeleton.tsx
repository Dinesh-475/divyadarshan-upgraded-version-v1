import React from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-neutral-100',
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.65)_50%,rgba(255,255,255,0)_100%)] bg-[length:1200px_100%] animate-shimmer"
        aria-hidden="true"
      />
    </div>
  );
}

