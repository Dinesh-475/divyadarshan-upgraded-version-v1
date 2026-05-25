import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock3, Download, ExternalLink, Hotel, Link2, MapPinned, PiggyBank, Sparkles, Star } from 'lucide-react';
import type { GeneratedPlan } from '../lib/types';
import { formatINR } from '../lib/utils';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';

export function PlanResults({
  plan,
  isGenerating,
  onDownloadJson,
  onShare,
}: {
  plan: GeneratedPlan | null;
  isGenerating: boolean;
  onDownloadJson: () => void;
  onShare: () => void;
}) {
  if (isGenerating) return <GeneratingSkeleton />;
  if (!plan) return <EmptyState />;
  return (
    <div className="space-y-4">
      <SummaryCard plan={plan} onDownloadJson={onDownloadJson} onShare={onShare} />
      <CostSavingsCard plan={plan} />
      <ItineraryTimelineCard plan={plan} />
      <StaysCard plan={plan} />
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="text-[13px] font-medium text-neutral-500">Your results</div>
        <div className="mt-1 text-[16px] font-semibold text-neutral-950">Generate a plan to see itinerary, route, and cost insights</div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/70">
          <div className="text-[13px] text-neutral-600">
            The planner will show a simple itinerary, route, estimated cost, savings tips, and nearby stay options.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GeneratingSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Skeleton className="h-4 w-28" />
              <div className="mt-2">
                <Skeleton className="h-6 w-[min(520px,90%)]" />
              </div>
              <div className="mt-2">
                <Skeleton className="h-4 w-[min(640px,95%)]" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px]" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px]" />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <Skeleton className="h-5 w-52" />
          <Skeleton className="mt-2 h-4 w-[min(520px,90%)]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ plan, onDownloadJson, onShare }: { plan: GeneratedPlan; onDownloadJson: () => void; onShare: () => void }) {
  const summaryWithoutCost = plan.summary.replace(/Estimated cost:.*$/i, '').trim();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-neutral-500">AI plan</div>
            <div className="mt-1 text-[16px] font-semibold text-neutral-950">Premium itinerary summary</div>
            <div className="mt-2 text-[13px] leading-relaxed text-neutral-700">{summaryWithoutCost || plan.summary}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onShare}>
              <Link2 className="h-4 w-4" />
              Shareable link
            </Button>
            <Button variant="secondary" onClick={onDownloadJson}>
              <Download className="h-4 w-4" />
              Download JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Kpi icon={<MapPinned className="h-4 w-4" />} label="Distance" value={`${plan.route.distanceKm} km`} />
          <Kpi icon={<Clock3 className="h-4 w-4" />} label="Duration" value={plan.route.durationText} />
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/70 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] font-medium text-neutral-500">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-neutral-50 ring-1 ring-neutral-200/70">
            {icon}
          </span>
          {label}
        </div>
        <div className="text-[14px] font-semibold text-neutral-950">{value}</div>
      </div>
    </div>
  );
}

function CostSavingsCard({ plan }: { plan: GeneratedPlan }) {
  const rows = useMemo(() => {
    const total = Math.max(1, plan.money.total);
    const items = [
      { label: 'Stay', value: plan.money.stay },
      { label: 'Food', value: plan.money.food },
      { label: 'Local', value: plan.money.localTransport },
      { label: 'Extra buffer', value: plan.money.hidden },
    ];
    return items.map((i) => ({ ...i, pct: Math.round((i.value / total) * 100) }));
  }, [plan.money]);
  const savingIdeas = plan.money.savingIdeas?.length
    ? plan.money.savingIdeas
    : [
        {
          title: 'Train + local bus instead of private cab',
          detail: 'Use train till the nearest major station, then take a bus/shared transfer for the temple stretch.',
          saveAmount: Math.round(plan.money.total * 0.12),
        },
        {
          title: 'Pick dharmashala or simple family room',
          detail: 'Stay closer to the temple in a trust/family room instead of a premium hotel to reduce stay and local travel cost.',
          saveAmount: Math.round(plan.money.total * 0.08),
        },
        {
          title: 'Use prasadam/annadana for one meal',
          detail: 'Replace one restaurant meal per day with temple prasadam or annadana and keep one clean backup restaurant.',
          saveAmount: Math.round(plan.money.total * 0.05),
        },
      ];
  const totalPossibleSaving = savingIdeas.reduce((sum, item) => sum + item.saveAmount, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-neutral-500">Cost & savings</div>
            <div className="mt-1 text-[17px] font-semibold text-neutral-950">Estimated cost and smart ways to reduce it</div>
            <div className="mt-1 text-[12.5px] text-neutral-500">Cost is shown once here, with clear saving options.</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right ring-1 ring-emerald-200">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Can save up to</div>
            <div className="text-[20px] font-bold text-emerald-800">{formatINR(totalPossibleSaving)}</div>
          </div>
          <PiggyBank className="h-5 w-5 text-neutral-400" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-neutral-950 p-4 text-white shadow-sm">
            <div className="text-[12px] font-medium text-neutral-500">Total cost</div>
            <div className="mt-1 text-[22px] font-semibold">{formatINR(plan.money.total)}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/70 shadow-sm">
            <div className="text-[12px] font-medium text-neutral-500">Per pilgrim</div>
            <div className="mt-1 text-[20px] font-semibold text-neutral-950">{formatINR(plan.money.perPerson)}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/70 shadow-sm">
            <div className="text-[12px] font-medium text-neutral-500">Fuel + toll</div>
            <div className="mt-1 text-[20px] font-semibold text-neutral-950">{formatINR(plan.money.fuel + plan.money.tolls)}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/70 shadow-sm">
            <div className="text-[12px] font-medium text-neutral-500">Stay + food</div>
            <div className="mt-1 text-[20px] font-semibold text-neutral-950">{formatINR(plan.money.stay + plan.money.food)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plan.money.surgeAlert ? (
          <div className="mb-3 flex items-start gap-2 rounded-2xl bg-saffron-50 p-3 text-[12.5px] text-neutral-700 ring-1 ring-saffron-200/60">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-saffron-700" />
            <div>
              <div className="font-semibold text-neutral-900">Festival surge alert</div>
              <div className="mt-0.5 text-neutral-600">{plan.money.surgeAlert}</div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {rows.map((b) => (
            <div key={b.label} className="rounded-xl bg-white p-3 ring-1 ring-neutral-200/70 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12.5px] font-medium text-neutral-700">{b.label}</div>
                <div className="text-[12.5px] font-semibold text-neutral-900">{formatINR(b.value)}</div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-saffron-600" style={{ width: `${Math.max(3, Math.min(100, b.pct))}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-saffron-50 p-4 ring-1 ring-emerald-200/80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-neutral-950">How to save money</div>
              <div className="mt-0.5 text-[12px] text-neutral-600">Practical route/stay/food switches with estimated savings.</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {savingIdeas.map((item, i) => (
              <div key={`${item.title}-${i}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/70">
                <div className="text-[12px] font-semibold text-emerald-700">Save {formatINR(item.saveAmount)}</div>
                <div className="mt-1 text-[13.5px] font-semibold text-neutral-950">{item.title}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-neutral-600">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ItineraryTimelineCard({ plan }: { plan: GeneratedPlan }) {
  const visibleItems = plan.itinerary.slice(0, 7);
  return (
    <Card className="overflow-hidden" id="itinerary">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-neutral-500">Easy itinerary graph</div>
            <div className="mt-1 text-[15px] font-semibold text-neutral-950">Your day at a glance</div>
            <div className="mt-1 text-[12.5px] text-neutral-500">A simple visual flow so devotees can understand what happens next.</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => alert('Offline save is automatic for generated plans.')}>
              Offline save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          {visibleItems.map((it, idx) => (
            <div key={`${it.time}-graph-${idx}`} className="relative rounded-2xl bg-white p-3 text-center ring-1 ring-neutral-200/70 shadow-sm">
              {idx < visibleItems.length - 1 ? <div className="absolute left-[calc(100%-2px)] top-1/2 hidden h-px w-2 bg-neutral-200 lg:block" /> : null}
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-saffron-50 text-[12px] font-bold text-saffron-800 ring-1 ring-saffron-200/60">
                {idx + 1}
              </div>
              <div className="mt-2 text-[11px] font-semibold text-neutral-500">{it.time}</div>
              <div className="mt-1 line-clamp-2 text-[12px] font-semibold text-neutral-950">{it.title}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {plan.itinerary.map((it, idx) => (
            <motion.div
              key={`${it.day}-${it.time}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(0.2, idx * 0.03) }}
              className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/70 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[12px] font-medium text-neutral-500">Day {it.day}</div>
                    <div className="h-1 w-1 rounded-full bg-neutral-300" />
                    <div className="text-[12px] font-medium text-neutral-700">{it.time}</div>
                    {it.tag ? (
                      <span className="rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-medium text-saffron-800 ring-1 ring-saffron-200/60">
                        {it.tag}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-neutral-950">{it.title}</div>
                  <div className="mt-1 text-[12.5px] text-neutral-600">{it.detail}</div>
                </div>
                {it.durationMins ? (
                  <div className="rounded-2xl bg-neutral-50 px-3 py-2 text-[12px] font-medium text-neutral-700 ring-1 ring-neutral-200/70">
                    ~{it.durationMins} min
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StaysCard({ plan }: { plan: GeneratedPlan }) {
  const stayLocation = plan.templeName || 'temple';

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-neutral-500">Nearby hotels & stays</div>
            <div className="mt-1 text-[15px] font-semibold text-neutral-950">Dharmashalas, family rooms, and hotels</div>
            <div className="mt-1 text-[12.5px] text-neutral-500">Use the map links for live availability, reviews, and current prices.</div>
          </div>
          <Hotel className="h-5 w-5 text-neutral-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {plan.stays.map((s, idx) => (
            <div key={idx} className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/70 shadow-sm">
              <div className="grid grid-cols-[120px_1fr]">
                <img
                  src={s.photoUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=520&q=80'}
                  alt={s.name}
                  className="h-full min-h-[250px] w-full object-cover"
                />
                <div className="min-w-0 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 ring-1 ring-neutral-200/70">
                          {s.category}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-200/60">
                          <Star className="h-3 w-3 fill-current" />
                          {(s.rating || 4.1).toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-2 text-[14px] font-semibold text-neutral-950">{s.name}</div>
                    </div>
                    {idx === 0 ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <Sparkles className="h-3 w-3" />
                        Smart pick
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-[12.5px] leading-relaxed text-neutral-600">
                    {s.recommendation || 'Smart nearby stay option. Check live reviews and availability before booking.'}
                  </div>
                  <div className="mt-2 text-[12px] text-neutral-500">
                    ~{s.walkingMins} min walk · {s.priceHint || 'Check live price'} · {s.cleanliness}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} near ${stayLocation}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-neutral-950 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-neutral-800"
                    >
                      Map
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <a
                      href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${s.category} ${s.name} near ${stayLocation}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-md transition hover:bg-orange-700"
                    >
                      Book Now
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

          ))}
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hotels and dharmashala near ${stayLocation}`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-saffron-600 px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-saffron-700"
        >
          Search live hotels on Google Maps
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}
