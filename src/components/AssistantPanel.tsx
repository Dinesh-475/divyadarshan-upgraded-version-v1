import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Sparkles } from 'lucide-react';
import type { AssistantMessage } from '../lib/types';
import { uid } from '../lib/utils';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Input } from './ui/Field';

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  onresult?: (e: any) => void;
  onerror?: () => void;
  onend?: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function AssistantPanel({
  messages,
  onSend,
  t,
}: {
  messages: AssistantMessage[];
  onSend: (text: string) => void;
  t: (key: string) => string;
}) {
  const suggestions = useMemo(
    () => [t('bestDarshan'), t('cheapestRoute'), t('prasadamPlaces'), t('seniorAssistance')],
    [t]
  );
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const canVoice = typeof window !== 'undefined' && !!getSpeechRecognition();

  const startVoice = () => {
    if (!canVoice || listening) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    (rec as any).lang = 'en-IN';
    (rec as any).interimResults = true;
    (rec as any).continuous = false;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results || [])
        .map((r: any) => r?.[0]?.transcript || '')
        .join(' ')
        .trim();
      if (t) setText(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="xl:sticky xl:top-[88px]">
      <Card className="overflow-hidden">
        <CardHeader className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium text-neutral-500">{t('assistant')}</div>
              <div className="mt-1 text-[14.5px] font-semibold text-neutral-950">{t('assistantTitle')}</div>
            </div>
            <div className="rounded-full bg-neutral-100 px-3 py-1 text-[12px] font-medium text-neutral-600 ring-1 ring-neutral-200/70">
              Groq-backed
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSend(s)}
                className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 ring-1 ring-neutral-200/80 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:shadow-ring"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <div className="max-h-[260px] space-y-2 overflow-auto rounded-xl bg-neutral-50 p-2 ring-1 ring-neutral-200/70">
              {messages.length === 0 ? (
                <div className="rounded-xl bg-white p-3 text-[13px] text-neutral-600 ring-1 ring-neutral-200/70">
                  <div className="flex items-center gap-2 text-neutral-900">
                    <Sparkles className="h-4 w-4 text-saffron-700" />
                    <div className="text-[13.5px] font-semibold">{t('calmAssistant')}</div>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className={[
                      'max-w-[95%] rounded-2xl p-3 text-[13px] ring-1 shadow-sm',
                      m.role === 'user'
                        ? 'ml-auto bg-white text-neutral-900 ring-neutral-200/70'
                        : 'bg-saffron-50 text-neutral-900 ring-saffron-200/60',
                    ].join(' ')}
                  >
                    {m.content}
                  </motion.div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('askPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send();
                  }}
                />
              </div>
              <Button
                variant="secondary"
                className="h-11 w-11 px-0"
                onClick={startVoice}
                disabled={!canVoice}
                aria-label="Voice input"
                title={!canVoice ? 'Voice input not available in this browser' : 'Voice input'}
              >
                <Mic className={listening ? 'h-4 w-4 text-saffron-700' : 'h-4 w-4'} />
              </Button>
              <Button className="h-11 w-11 px-0" onClick={send} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function makeAssistantReply(userText: string): string {
  const t = userText.toLowerCase();
  if (t.includes('darshan') || t.includes('timing') || t.includes('time')) {
    return 'For calmer darshan, aim for early arrival with a 45–60 min buffer for parking + counters. On festival days, avoid peak entry windows and plan a backup slot.';
  }
  if (t.includes('cheapest') || t.includes('budget')) {
    return 'To reduce cost: choose early travel windows, prioritize dharmashalas, keep meals simple near the temple, and avoid last-minute stays during festival surges.';
  }
  if (t.includes('prasadam') || t.includes('food')) {
    return 'Prefer temple prasadam/annadana when available for reliable, sattvic meals. Keep one clean backup restaurant stop for elderly/children comfort.';
  }
  if (t.includes('senior') || t.includes('elderly') || t.includes('wheelchair')) {
    return 'For seniors: keep shorter walking distance stays, minimize stairs, add frequent rest points, and prioritize calm queue windows. Keep ID/medicines/water accessible.';
  }
  return 'Tell me your start city and preferred arrival time. I’ll suggest a calm route plan with buffers, safe breaks, and stay options aligned to your budget.';
}

export function pushMessage(list: AssistantMessage[], role: 'user' | 'assistant', content: string): AssistantMessage[] {
  return [...list, { id: uid('msg'), role, content, createdAt: Date.now() }];
}
