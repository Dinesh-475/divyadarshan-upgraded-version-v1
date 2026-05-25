import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BusFront, CalendarDays, MapPinned, Navigation, Route } from 'lucide-react';
import type { AssistantMessage, GeneratedPlan, Language, PlanFormState } from './lib/types';
import { readJson, writeJson } from './lib/storage';
import { generateMockPlan } from './lib/mockPlan';
import { useTranslator } from './lib/i18n';
import { Header } from './components/Header';
import { AssistantPanel, makeAssistantReply, pushMessage } from './components/AssistantPanel';
import { PlanGenerator, defaultForm } from './components/PlanGenerator';
import { PlanResults } from './components/PlanResults';
import { Button } from './components/ui/Button';
import { Card, CardContent, CardHeader } from './components/ui/Card';

const LS_KEYS = {
  language: 'dd.planner.language.v1',
  form: 'dd.planner.form.v1',
  autosave: 'dd.planner.autosave.v1',
  favorites: 'dd.planner.favorites.v1',
  recent: 'dd.planner.recent.v1',
  assistant: 'dd.planner.assistant.v1',
} as const;

export function App() {
  const [language, setLanguage] = useState<Language>(() => readJson(LS_KEYS.language, 'English'));
  const [form, setForm] = useState<PlanFormState>(() => readJson(LS_KEYS.form, defaultForm()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<GeneratedPlan | null>(() => readJson(LS_KEYS.autosave, null));
  const [favorites, setFavorites] = useState<string[]>(() => readJson(LS_KEYS.favorites, []));
  const [recent, setRecent] = useState<Array<{ id: string; createdAt: number; temple: string }>>(() => readJson(LS_KEYS.recent, []));
  const [assistant, setAssistant] = useState<AssistantMessage[]>(() => readJson(LS_KEYS.assistant, []));
  const t = useMemo(() => useTranslator(language), [language]);

  useEffect(() => writeJson(LS_KEYS.language, language), [language]);
  useEffect(() => writeJson(LS_KEYS.form, form), [form]);
  useEffect(() => writeJson(LS_KEYS.favorites, favorites), [favorites]);
  useEffect(() => writeJson(LS_KEYS.recent, recent), [recent]);
  useEffect(() => writeJson(LS_KEYS.assistant, assistant), [assistant]);

  const favoriteTemples = useMemo(() => new Set(favorites), [favorites]);

  const generate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/travel/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templeKey: form.temple.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          templeName: form.temple,
          date: form.date,
          timeOfDay: form.timePreference,
          pilgrims: form.pilgrims,
          budget: form.budget,
          nights: form.nights,
          origin: form.startLocation,
          extraStops: form.extraStops,
          special: `Elderly friendly: ${form.elderlyFriendly}. Wheelchair: ${form.wheelchairAccessible}. VIP Darshan: ${form.vipDarshan}. Food: ${form.foodPreference}. Crowd: ${form.crowdPreference}.`
        })
      });

      if (!response.ok) throw new Error('Failed to generate plan');
      const raw = await response.json();
      
      // Use mock structural framework so frontend components don't crash
      const basePlan = generateMockPlan(form);
      
      // Merge Real Data
      if (raw.summary) basePlan.summary = raw.summary;
      
      if (raw.itinerary && Array.isArray(raw.itinerary)) {
        basePlan.itinerary = raw.itinerary.map((item: any, i: number) => ({
          day: 1,
          time: item.time || 'Flexible',
          title: item.activity || 'Activity',
          detail: item.reason || '',
          tag: 'spiritual'
        }));
      }

      if (raw.templeFacts && Array.isArray(raw.templeFacts)) {
        basePlan.devotee.historyCards = raw.templeFacts.map((fact: string) => ({
          title: 'Temple Fact',
          body: fact
        }));
      }
      
      if (raw.routeInfo) {
        const distText = raw.routeInfo.distance_text || '';
        const distKm = parseFloat(distText.replace(/[^0-9.]/g, '')) || 300;
        
        // Simple real fuel calc
        const fuel = Math.round((distKm / 15) * 100 * 2);
        const tolls = Math.round(distKm * 1.5 * 2);
        
        basePlan.money.fuel = fuel;
        basePlan.money.tolls = tolls;
        basePlan.money.total = fuel + tolls + basePlan.money.stay + basePlan.money.food + basePlan.money.localTransport + basePlan.money.hidden;
        basePlan.money.perPerson = Math.round(basePlan.money.total / Math.max(1, form.pilgrims));
        basePlan.money.savings.unshift(`Calculated fuel/tolls based on real distance: ${distText}`);
      }

      setPlan(basePlan);
      writeJson(LS_KEYS.autosave, basePlan);
      setRecent((r) => [{ id: basePlan.id, createdAt: basePlan.createdAt, temple: form.temple }, ...r].slice(0, 8));
      
      // Auto-scroll to results
      setTimeout(() => {
        document.getElementById('itinerary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e) {
      console.error(e);
      alert('AI Generation failed. Falling back to local mock for demonstration.');
      const p = generateMockPlan(form);
      setPlan(p);
      writeJson(LS_KEYS.autosave, p);
      setRecent((r) => [{ id: p.id, createdAt: p.createdAt, temple: form.temple }, ...r].slice(0, 8));
      
      // Auto-scroll to results
      setTimeout(() => {
        document.getElementById('itinerary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendAssistant = async (text: string) => {
    setAssistant((m) => pushMessage(m, 'user', text));
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: { temple: form.temple, date: form.date, budget: form.budget },
          history: assistant
        })
      });
      const data = await response.json();
      setAssistant((m) => pushMessage(m, 'assistant', data.reply || 'Sorry, I encountered an error.'));
    } catch (e) {
      setAssistant((m) => pushMessage(m, 'assistant', 'Sorry, I am currently offline.'));
    }
  };

  const downloadJson = () => {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `temple-travel-plan-${plan.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const share = async () => {
    if (!plan) return;
    const url = new URL(window.location.href);
    url.searchParams.set('plan', plan.id);
    const shareUrl = url.toString();
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Shareable link copied to clipboard.');
    } catch {
      prompt('Copy shareable link:', shareUrl);
    }
  };

  const toggleFavorite = () => {
    const t = form.temple;
    setFavorites((f) => (f.includes(t) ? f.filter((x) => x !== t) : [t, ...f]));
  };

  return (
    <div className="min-h-screen bg-[#fcfaf8] text-neutral-900 font-sans">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        t={t}
        onBackToDashboard={() => {
          window.location.href = '/dashboard/index.html';
        }}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_420px] items-start">
          
          {/* Left Column: Form */}
          <div className="space-y-6">
            <PlanGenerator value={form} onChange={setForm} onGenerate={generate} isGenerating={isGenerating} t={t} />
          </div>

          {/* Right Column: Assistant & Utilities */}
          <div className="space-y-6">
            <TravelGuidePanel form={form} plan={plan} t={t} />
            <AssistantPanel messages={assistant} onSend={sendAssistant} t={t} />
          </div>

        </div>

        {/* Full width Results Area below form & assistant */}
        <div className="mt-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <PlanResults plan={plan} isGenerating={isGenerating} onDownloadJson={downloadJson} onShare={share} />
          </motion.div>
        </div>
      </main>


    </div>
  );
}

const templeMapLabels: Record<string, string> = {
  'Dharmasthala Manjunatha': 'Dharmasthala Manjunatha Temple Karnataka',
  'Tirumala Tirupati': 'Tirumala Tirupati Balaji Temple Andhra Pradesh',
  'Kollur Mookambika': 'Kollur Mookambika Temple Karnataka',
  'Udupi Sri Krishna': 'Udupi Sri Krishna Matha Karnataka',
  'Gokarna Mahabaleshwar': 'Gokarna Mahabaleshwar Temple Karnataka',
  'Kukke Subramanya': 'Kukke Subramanya Temple Karnataka',
  'Sringeri Sharada Peetham': 'Sringeri Sharada Peetham Karnataka',
};

function TravelGuidePanel({ form, plan, t }: { form: PlanFormState; plan: GeneratedPlan | null; t: (key: string) => string }) {
  const destination = templeMapLabels[form.temple] || form.temple;
  const origin = form.startLocation.trim();
  const mapQuery = origin ? `${origin} to ${destination}` : destination;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const mapsUrl = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${form.travelMode === 'Car' ? 'driving' : 'transit'}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

  const guideSteps = [
    { label: t('start'), value: origin || t('startCity'), icon: <Navigation className="h-4 w-4" /> },
    { label: t('travel'), value: form.travelMode, icon: <BusFront className="h-4 w-4" /> },
    { label: t('darshan'), value: form.timePreference, icon: <CalendarDays className="h-4 w-4" /> },
    { label: t('temple'), value: form.temple.replace('Dharmasthala ', ''), icon: <MapPinned className="h-4 w-4" /> },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-neutral-500">{t('travelGuide')}</div>
            <div className="mt-1 text-[15px] font-semibold text-neutral-950">{t('guideTitle')}</div>
            <div className="mt-1 text-[12.5px] text-neutral-500">{t('guideSubtitle')}</div>
          </div>
          <span className="rounded-full bg-saffron-50 px-3 py-1 text-[12px] font-medium text-saffron-800 ring-1 ring-saffron-200/60">
            {t('liveGuide')}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {guideSteps.map((step, index) => (
            <div key={step.label} className="relative rounded-2xl bg-white p-2.5 ring-1 ring-neutral-200/70 shadow-sm">
              {index < guideSteps.length - 1 ? <div className="absolute left-[calc(100%-2px)] top-1/2 hidden h-px w-2 bg-neutral-200 xl:block" /> : null}
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50 text-neutral-700 ring-1 ring-neutral-200/70">
                {step.icon}
              </div>
              <div className="mt-2 truncate text-center text-[10.5px] font-medium uppercase tracking-wide text-neutral-400">{step.label}</div>
              <div className="mt-0.5 truncate text-center text-[12px] font-semibold text-neutral-900" title={step.value}>
                {step.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-neutral-50 ring-1 ring-neutral-200/70">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200/70 bg-white px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Route className="h-4 w-4 text-saffron-700" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-neutral-900">{t('easyRouteMap')}</div>
                <div className="truncate text-[11px] text-neutral-500">{mapQuery}</div>
              </div>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-lg bg-neutral-950 px-3 py-2 text-[11.5px] font-semibold text-white transition hover:bg-neutral-800"
            >
              {t('open')}
            </a>
          </div>
          <div className="relative h-[210px] overflow-hidden bg-[#f3f6f4]">
            <div className="absolute inset-0 opacity-80">
              <div className="absolute left-8 top-8 h-20 w-28 rounded-full border border-emerald-200 bg-emerald-50" />
              <div className="absolute bottom-8 right-8 h-24 w-32 rounded-full border border-sky-200 bg-sky-50" />
              <div className="absolute inset-x-8 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white shadow-sm" />
              <div className="absolute left-10 top-[42%] h-2 w-[68%] rotate-[-8deg] rounded-full bg-saffron-500 shadow-sm" />
              <div className="absolute left-9 top-[40%] h-5 w-5 rounded-full bg-white p-1 ring-2 ring-saffron-500">
                <div className="h-full w-full rounded-full bg-saffron-600" />
              </div>
              <div className="absolute right-12 top-[33%] h-6 w-6 rounded-full bg-neutral-950 p-1.5 shadow-card">
                <div className="h-full w-full rounded-full bg-white" />
              </div>
            </div>
            <iframe
              title="Google route map"
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0 opacity-90"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 p-3 shadow-sm ring-1 ring-neutral-200/80">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-neutral-950">{origin || t('startCity')} to {form.temple}</div>
                  <div className="truncate text-[11.5px] text-neutral-500">{t('routeCaption')}</div>
                </div>
                <div className="shrink-0 rounded-full bg-saffron-50 px-2.5 py-1 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-200/60">
                  {form.travelMode}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
