import { useState, useEffect, useCallback, useRef } from 'react';
import { dbExecute } from '@/services/db';

const CORAL = '#F05F57';
const TEAL = '#3BBFBF';
const HEADER = '#2D4459';
const MUTED = '#7A8F95';
const BORDER = '#C8E8E5';
const STAR_OFF = '#C8E8E5';

export const UAT_PAGE_OPTIONS = [
  'Morning Brief',
  'Business Goals',
  'Client Intelligence',
  'Coaching Actions',
  'My Practice',
  'General',
] as const;

export type UATFeedbackPage = (typeof UAT_PAGE_OPTIONS)[number];

function localCalendarDateYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildFeedbackText(
  workingWell: boolean,
  confusing: boolean,
  missingSomething: boolean,
  userText: string
): string {
  const lines = [
    `Working well: ${workingWell ? 'yes' : 'no'}`,
    `Confusing: ${confusing ? 'yes' : 'no'}`,
    `Missing something: ${missingSomething ? 'yes' : 'no'}`,
  ];
  const t = userText.trim();
  if (t) lines.push('', t);
  return lines.join('\n');
}

export interface UATFeedbackProps {
  currentPage: UATFeedbackPage;
}

export default function UATFeedback({ currentPage }: UATFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<UATFeedbackPage>(currentPage);
  const [starRating, setStarRating] = useState(0);
  const [workingWell, setWorkingWell] = useState(false);
  const [confusing, setConfusing] = useState(false);
  const [missingSomething, setMissingSomething] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelectedPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const resetForm = useCallback(() => {
    setStarRating(0);
    setWorkingWell(false);
    setConfusing(false);
    setMissingSomething(false);
    setFeedbackText('');
    setMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const id = crypto.randomUUID();
      const sessionDate = localCalendarDateYyyyMmDd();
      const createdAt = new Date().toISOString();
      const textBody = buildFeedbackText(workingWell, confusing, missingSomething, feedbackText);
      /** Schema: id, page_name, feedback_type, rating, feedback_text, feature_name, thumbs_up, session_date, created_at */
      await dbExecute(
        `INSERT INTO user_feedback
         (id, page_name, feedback_type, rating, feedback_text, feature_name, thumbs_up, session_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          selectedPage,
          'uat_feedback',
          starRating > 0 ? String(starRating) : null,
          textBody || null,
          null,
          workingWell ? 1 : null,
          sessionDate,
          createdAt,
        ]
      );
      setMessage({
        kind: 'success',
        text: 'Thank you! Your feedback helps improve Coach Bot.',
      });
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        handleClose();
      }, 2000);
    } catch (e) {
      console.error('UAT user_feedback insert failed:', e);
      setMessage({
        kind: 'error',
        text: 'Could not save feedback. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[1000] cursor-pointer border-0 font-bold text-white shadow-md"
        style={{
          bottom: 24,
          right: 24,
          background: CORAL,
          borderRadius: 50,
          padding: '10px 18px',
          fontSize: 13,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        📋 Feedback
      </button>
    );
  }

  return (
    <div
      className="fixed z-[1000] flex flex-col"
      style={{
        bottom: 24,
        right: 24,
        width: 320,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: `1px solid ${BORDER}`,
        padding: '20px 24px',
      }}
    >
      <div className="relative mb-3 pr-8">
        <h2 className="font-bold" style={{ color: HEADER, fontSize: 15 }}>
          Share Feedback
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-0 top-0 border-0 bg-transparent leading-none"
          style={{ color: MUTED, fontSize: 18 }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label className="mb-1 block" style={{ color: MUTED, fontSize: 11 }}>
        Which page are you on?
      </label>
      <select
        value={selectedPage}
        onChange={(e) => setSelectedPage(e.target.value as UATFeedbackPage)}
        className="mb-4 w-full rounded-lg border bg-white px-2 py-2"
        style={{ borderColor: BORDER, fontSize: 13, color: HEADER }}
      >
        {UAT_PAGE_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <p className="mb-2 font-medium" style={{ color: HEADER, fontSize: 13 }}>
        How useful is this page?
      </p>
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStarRating(n)}
            className="border-0 bg-transparent p-0 leading-none"
            style={{
              fontSize: 22,
              color: n <= starRating ? CORAL : STAR_OFF,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ⭐
          </button>
        ))}
      </div>

      <label className="mb-2 flex cursor-pointer items-center gap-2" style={{ fontSize: 13, color: HEADER }}>
        <input
          type="checkbox"
          checked={workingWell}
          onChange={(e) => setWorkingWell(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border"
          style={{ borderColor: BORDER }}
        />
        ✅ Working well
      </label>
      <label className="mb-2 flex cursor-pointer items-center gap-2" style={{ fontSize: 13, color: HEADER }}>
        <input
          type="checkbox"
          checked={confusing}
          onChange={(e) => setConfusing(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border"
          style={{ borderColor: BORDER }}
        />
        😕 Something is confusing
      </label>
      <label className="mb-3 flex cursor-pointer items-center gap-2" style={{ fontSize: 13, color: HEADER }}>
        <input
          type="checkbox"
          checked={missingSomething}
          onChange={(e) => setMissingSomething(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border"
          style={{ borderColor: BORDER }}
        />
        🔍 Something is missing
      </label>

      <textarea
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        placeholder="Tell us more — what works, what confuses you, what is missing..."
        rows={4}
        className="w-full resize-y"
        style={{
          minHeight: 80,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 13,
          color: HEADER,
        }}
      />

      {message ? (
        <p
          className="mt-3 text-center"
          style={{
            fontSize: 13,
            color: message.kind === 'success' ? TEAL : CORAL,
          }}
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleSubmit()}
        className="mt-3 w-full border-0 font-bold text-white disabled:opacity-60"
        style={{
          background: TEAL,
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
        }}
      >
        {submitting ? 'Sending…' : 'Submit Feedback'}
      </button>
    </div>
  );
}
