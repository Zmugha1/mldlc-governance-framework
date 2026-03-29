import { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { dbExecute } from '@/services/db';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const FEEDBACK_TYPES = [
  { id: 'working_well', label: 'Working well', className: 'bg-green-100 text-green-900 border-green-200 hover:bg-green-200/80' },
  { id: 'confusing', label: 'Confusing', className: 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200/80' },
  { id: 'missing', label: 'Missing something', className: 'bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200/80' },
  { id: 'broken', label: 'Broken', className: 'bg-red-100 text-red-900 border-red-200 hover:bg-red-200/80' },
] as const;

function localCalendarDateYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type FeedbackTypeId = (typeof FEEDBACK_TYPES)[number]['id'];

interface FeedbackButtonProps {
  pageName: string;
}

export default function FeedbackButton({ pageName }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackTypeId | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!thanks) return;
    const t = window.setTimeout(() => {
      setOpen(false);
      setThanks(false);
      setSelectedType(null);
      setFeedbackText('');
      setError(null);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [thanks]);

  const resetPanel = () => {
    setSelectedType(null);
    setFeedbackText('');
    setError(null);
    setThanks(false);
  };

  const toggleOpen = () => {
    setOpen((v) => {
      if (v) resetPanel();
      else {
        setError(null);
        setThanks(false);
      }
      return !v;
    });
  };

  const handleSend = async () => {
    if (!selectedType) return;
    const typeRow = FEEDBACK_TYPES.find((t) => t.id === selectedType);
    const feedbackTypeLabel = typeRow?.label ?? selectedType;
    setSending(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const sessionDate = localCalendarDateYyyyMmDd();
      const createdAt = new Date().toISOString();
      const textTrimmed = feedbackText.trim();
      await dbExecute(
        `INSERT INTO user_feedback
         (id, page_name, feedback_type, rating, feedback_text, feature_name, thumbs_up, session_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          pageName,
          feedbackTypeLabel,
          null,
          textTrimmed || null,
          null,
          null,
          sessionDate,
          createdAt,
        ]
      );
      setThanks(true);
    } catch (e) {
      console.error('user_feedback insert failed:', e);
      setError('Could not save feedback');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed top-4 right-4 z-[200] flex justify-end"
    >
      <div className="pointer-events-auto relative">
        <button
          type="button"
          title="Share feedback"
          aria-label="Share feedback"
          onClick={toggleOpen}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md bg-transparent',
            'text-slate-400 transition-colors hover:text-slate-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300'
          )}
        >
          <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-[201] mt-2 w-[280px] rounded-lg border border-[#e2e8f0] bg-white py-3 px-[14px] shadow-md"
            role="dialog"
            aria-label="Feedback"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {thanks ? (
              <p className="text-sm font-medium text-green-600">
                Thanks for the feedback
              </p>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-900">How is this page?</p>

                <div className="mt-3 grid grid-cols-4 gap-1">
                  {FEEDBACK_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.id)}
                      className={cn(
                        'rounded-md border px-0.5 py-1.5 text-center text-[9px] font-medium leading-tight transition-colors',
                        t.className,
                        selectedType === t.id
                          ? 'ring-2 ring-slate-400 ring-offset-1'
                          : 'opacity-90'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <Textarea
                  rows={2}
                  className="mt-3 w-full resize-y text-sm"
                  placeholder="Tell us more (optional)"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />

                {error ? (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                ) : null}

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full bg-teal-600 text-white hover:bg-teal-700"
                    disabled={!selectedType || sending}
                    onClick={() => {
                      void handleSend();
                    }}
                  >
                    {sending ? 'Sending…' : 'Send Feedback'}
                  </Button>
                  <button
                    type="button"
                    className="text-center text-sm text-slate-500 underline hover:text-slate-800"
                    onClick={() => {
                      setOpen(false);
                      resetPanel();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
