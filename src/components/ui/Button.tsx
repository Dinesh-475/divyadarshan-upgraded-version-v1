import React from 'react';
import { cn } from '../../lib/utils';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
};

export function Button({ className, variant = 'primary', size = 'md', isLoading, disabled, ...props }: Props) {
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-saffron-600 via-orange-600 to-red-700 text-white shadow-[0_8px_20px_rgba(230,81,0,0.3)] hover:shadow-[0_12px_25px_rgba(230,81,0,0.4)] hover:-translate-y-0.5 transition-all'
      : variant === 'secondary'
        ? 'bg-white text-neutral-900 shadow-soft hover:bg-neutral-50 active:bg-neutral-100 ring-1 ring-neutral-200'
        : 'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200';

  const sizes =
    size === 'sm' ? 'h-9 px-3 text-sm rounded-xl' : size === 'lg' ? 'h-12 px-5 text-[15px] rounded-2xl' : 'h-10 px-4 text-sm rounded-2xl';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:shadow-ring disabled:opacity-55 disabled:pointer-events-none',
        styles,
        sizes,
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          <span>Generating…</span>
        </>
      ) : (
        props.children
      )}
    </button>
  );
}

