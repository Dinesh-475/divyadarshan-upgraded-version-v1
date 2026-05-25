import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LocateFixed } from 'lucide-react';
import type { PlanFormState } from '../lib/types';
import { cn } from '../lib/utils';
import { Card, CardContent } from './ui/Card';
import { Input, Label, Select, Textarea } from './ui/Field';

const temples = [
  'Dharmasthala Manjunatha',
  'Tirumala Tirupati',
  'Kollur Mookambika',
  'Udupi Sri Krishna',
  'Gokarna Mahabaleshwar',
  'Kukke Subramanya',
  'Sringeri Sharada Peetham',
];

export function defaultForm(): PlanFormState {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return {
    temple: 'Dharmasthala Manjunatha',
    date: `${yyyy}-${mm}-${dd}`,
    pilgrims: 2,
    budget: 'Mid-range',
    travelMode: 'Car',
    timePreference: 'Morning',
    nights: 1,
    startLocation: '',
    useLiveLocation: false,
    extraStops: '',
    foodPreference: 'Vegetarian',
    elderlyFriendly: true,
    wheelchairAccessible: false,
    childFriendly: true,
    vipDarshan: false,
    crowdPreference: 'Least crowded',
    weatherAware: true,
    festivalAware: true,
  };
}

export function PlanGenerator({
  value,
  onChange,
  onGenerate,
  isGenerating,
  t,
}: {
  value: PlanFormState;
  onChange: (next: PlanFormState) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  t: (key: string) => string;
}) {
  const [locStatus, setLocStatus] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const canGeo = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const budgetOptions = useMemo(() => ['Budget', 'Mid-range', 'Premium', 'Luxury'] as const, []);
  const travelModes = useMemo(() => ['Car', 'Bus', 'Train', 'Flight'] as const, []);
  const timePrefs = useMemo(() => ['Morning', 'Afternoon', 'Evening'] as const, []);
  const foodPrefs = useMemo(() => ['Vegetarian', 'Jain', 'South Indian meals', 'No onion/garlic'] as const, []);
  const crowdPrefs = useMemo(() => ['Least crowded', 'Festival timings', 'Peak spiritual hours'] as const, []);

  useEffect(() => {
    if (!value.useLiveLocation) return;
    if (!canGeo) return;
    setLocStatus('busy');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lon = pos.coords.longitude.toFixed(5);
        onChange({ ...value, startLocation: `Current location (${lat}, ${lon})` });
        setLocStatus('ok');
      },
      () => setLocStatus('err'),
      { enableHighAccuracy: true, timeout: 9000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.useLiveLocation]);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="text-[16px] font-bold text-neutral-900">{t('planGenerator')}</div>
        <div className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
          {t('realData')}
        </div>
      </div>

      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="temple">{t('temple')}</Label>
            <Select
              id="temple"
              value={value.temple}
              onChange={(e) => onChange({ ...value, temple: e.target.value })}
            >
              {temples.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">{t('date')}</Label>
            <Input
              id="date"
              type="date"
              value={value.date}
              onChange={(e) => onChange({ ...value, date: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pilgrims">{t('pilgrims')}</Label>
            <Input
              id="pilgrims"
              type="number"
              min={1}
              max={20}
              value={value.pilgrims}
              onChange={(e) => onChange({ ...value, pilgrims: Math.max(1, Number(e.target.value || 1)) })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget">{t('budget')}</Label>
            <Select
              id="budget"
              value={value.budget}
              onChange={(e) => onChange({ ...value, budget: e.target.value as any })}
            >
              {budgetOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="travelMode">{t('travelMode')}</Label>
            <Select
              id="travelMode"
              value={value.travelMode}
              onChange={(e) => onChange({ ...value, travelMode: e.target.value as any })}
            >
              {travelModes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timePreference">{t('timePreference')}</Label>
            <Select
              id="timePreference"
              value={value.timePreference}
              onChange={(e) => onChange({ ...value, timePreference: e.target.value as any })}
            >
              {timePrefs.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nights">{t('nights')}</Label>
            <Input
              id="nights"
              type="number"
              min={0}
              max={10}
              value={value.nights}
              onChange={(e) => onChange({ ...value, nights: Math.max(0, Number(e.target.value || 0)) })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startLocation">{t('startLocation')}</Label>
            <div className="relative">
              <Input
                id="startLocation"
                placeholder={t('startPlaceholder')}
                value={value.startLocation}
                onChange={(e) => onChange({ ...value, startLocation: e.target.value })}
              />
              <button
                type="button"
                onClick={() => onChange({ ...value, useLiveLocation: true })}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2.5 py-1.5 text-[12px] font-medium ring-1 shadow-sm transition',
                  canGeo
                    ? 'bg-white text-neutral-800 ring-neutral-200/80 hover:bg-neutral-50 focus:outline-none focus-visible:shadow-ring'
                    : 'bg-neutral-100 text-neutral-400 ring-neutral-200/70 cursor-not-allowed'
                )}
                disabled={!canGeo}
              >
                <span className="inline-flex items-center gap-1.5">
                  <LocateFixed className="h-3.5 w-3.5" />
                  {t('detect')}
                </span>
              </button>
            </div>
            {value.useLiveLocation ? (
              <div className="text-[12px] text-neutral-500">
                {t('liveLocation')}: {locStatus === 'busy' ? t('detecting') : locStatus === 'ok' ? t('attached') : t('unavailable')}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="extraStops">{t('extraStops')}</Label>
            <Input
              id="extraStops"
              placeholder={t('extraStopsPlaceholder')}
              value={value.extraStops}
              onChange={(e) => onChange({ ...value, extraStops: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="foodPreference">{t('foodPreference')}</Label>
            <Select
              id="foodPreference"
              value={value.foodPreference}
              onChange={(e) => onChange({ ...value, foodPreference: e.target.value as any })}
            >
              {foodPrefs.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crowdPreference">{t('crowdPreference')}</Label>
            <Select
              id="crowdPreference"
              value={value.crowdPreference}
              onChange={(e) => onChange({ ...value, crowdPreference: e.target.value as any })}
            >
              {crowdPrefs.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('notesPlaceholder')}
              value={''}
              onChange={() => {}}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mt-6"
        >
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-[200px] h-11 rounded-lg bg-[#f05e16] text-white font-semibold text-[14px] hover:bg-[#db5210] transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            {isGenerating ? t('generating') : t('generate')}
          </button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
