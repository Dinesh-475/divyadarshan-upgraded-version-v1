import React from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-[13px] font-medium text-neutral-700', className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-2xl bg-white px-3 text-[14px] text-neutral-900 ring-1 ring-neutral-200/80 shadow-sm placeholder:text-neutral-400 focus:outline-none focus-visible:shadow-ring',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-2xl bg-white px-3 text-[14px] text-neutral-900 ring-1 ring-neutral-200/80 shadow-sm focus:outline-none focus-visible:shadow-ring',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-[92px] w-full resize-none rounded-2xl bg-white px-3 py-2 text-[14px] text-neutral-900 ring-1 ring-neutral-200/80 shadow-sm placeholder:text-neutral-400 focus:outline-none focus-visible:shadow-ring',
        className
      )}
      {...props}
    />
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-start justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-neutral-50'
      )}
    >
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-neutral-900">{label}</div>
        {description ? <div className="mt-0.5 text-[12px] text-neutral-500">{description}</div> : null}
      </div>
      <div
        className={cn(
          'mt-0.5 h-6 w-11 rounded-full ring-1 ring-neutral-200/80 transition',
          checked ? 'bg-saffron-600' : 'bg-neutral-200'
        )}
      >
        <div
          className={cn(
            'h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </div>
    </button>
  );
}

