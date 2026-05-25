import React, { useMemo } from 'react';
import { Globe } from 'lucide-react';
import type { Language } from '../lib/types';

export function Header({
  language,
  onLanguageChange,
  onBackToDashboard,
  t,
}: {
  language: Language;
  onLanguageChange: (l: Language) => void;
  onBackToDashboard?: () => void;
  t: (key: string) => string;
}) {
  const languages = useMemo<Language[]>(() => ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu'], []);

  return (
    <div className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        {/* Left: Brand */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{t('brand')}</div>
          <div className="text-[26px] font-bold tracking-tight text-neutral-900 leading-tight">{t('title')}</div>
          <div className="text-[13px] text-neutral-500">{t('subtitle')}</div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-neutral-400" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className="bg-transparent text-[13px] font-medium text-neutral-700 focus:outline-none cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="text-[13px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
            >
              {t('backDashboard')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
