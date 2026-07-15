import { useCallback, useEffect, useState } from 'react';
import type { AdminLetterInfo } from '@/types/admin';
import { clearStoredAdminKey, getAdminLetterInfo, getStoredAdminKey, storeAdminKey } from '@/services/admin';
import { OrnamentDivider, HeartSigilIcon } from '@/components/icons/SvgIcons';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import { usePageMeta } from '@/hooks/usePageMeta';

interface AdminLetterInfoPageProps {
  slug: string;
  onBack: () => void;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminLetterInfoPage({ slug, onBack }: AdminLetterInfoPageProps) {
  const [adminKey, setAdminKey] = useState(getStoredAdminKey());
  const [draftKey, setDraftKey] = useState(getStoredAdminKey());
  const [data, setData] = useState<AdminLetterInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  usePageMeta({
    title: `Letter Ledger — ${slug} — Courier of Hearts`,
    description: 'Private steward view of a single letter, its traces, and its delivery history.',
    robots: 'noindex,nofollow',
  });

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError('');
    const result = await getAdminLetterInfo(slug, key);
    if (!result.success || !result.data) {
      setError(result.error || 'Unable to open the letter ledger.');
      setLoading(false);
      return false;
    }
    setData(result.data);
    setLoading(false);
    return true;
  }, [slug]);

  useEffect(() => {
    if (adminKey) void load(adminKey);
  }, [adminKey, load]);

  const handleUnlock = useCallback(() => {
    if (!draftKey.trim()) {
      setError('Enter the admin key.');
      return;
    }
    storeAdminKey(draftKey.trim());
    setAdminKey(draftKey.trim());
  }, [draftKey]);

  const handleLogout = useCallback(() => {
    clearStoredAdminKey();
    setAdminKey('');
    setDraftKey('');
    setData(null);
  }, []);

  if (!adminKey) {
    return (
      <div className="min-h-screen parchment-bg flex items-center justify-center px-6">
        <div className="relative z-20 letter-paper rounded-sm p-8 md:p-12 max-w-lg w-full text-center">
          <HeartSigilIcon size={34} color="#6B1025" className="mx-auto mb-5 opacity-50" />
          <h1 className="font-display text-2xl text-ink/90 mb-2">Letter Ledger</h1>
          <p className="font-body text-[15px] text-ink/58 italic mb-6">Admin key required for letter-side information.</p>
          <OrnamentDivider className="w-40 mx-auto mb-6" color="#8b7340" />
          <input type="password" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} placeholder="Admin key" className="parchment-input w-full text-center font-body text-base py-3 mb-4" />
          {error && <p className="font-body text-[14px] text-burgundy italic mb-4">{error}</p>}
          <div className="flex items-center justify-center gap-3">
            <button onClick={onBack} className="font-heading text-[10px] tracking-[0.15em] uppercase py-3 px-6 border border-gold/20 text-ink/50 rounded-sm hover:text-ink/80 transition-all duration-500">Back</button>
            <button onClick={handleUnlock} className="font-heading text-[10px] tracking-[0.18em] uppercase py-3 px-8 bg-ink text-parchment-light rounded-sm hover:bg-ink-light transition-all duration-500">Open</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parchment-bg">
      <nav className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4" style={{ borderBottom: '1px solid rgba(139,115,64,0.1)' }}>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.12em] text-ink/50 uppercase hover:text-ink/80 transition-colors duration-500">&larr; Back</button>
        <div className="flex items-center gap-2">
          <HeartSigilIcon size={18} color="#6B1025" />
          <span className="font-heading text-[10px] tracking-[0.2em] text-ink/55 uppercase hidden md:inline">Letter Info</span>
        </div>
        <button onClick={handleLogout} className="font-heading text-[11px] tracking-[0.12em] text-ink/50 uppercase hover:text-ink/80 transition-colors duration-500">Close</button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 relative z-10 space-y-6">
        {loading && !data ? <p className="font-body italic text-ink/45 text-center">Opening the letter ledger…</p> : null}
        {error ? <p className="font-body italic text-burgundy text-center">{error}</p> : null}

        {data && (
          <>
            <section className="letter-paper rounded-sm p-5 md:p-7">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h1 className="font-display text-3xl text-ink/88">To {data.letter.recipient}</h1>
                  <p className="font-body text-[14px] text-ink/48">{data.letter.slug} · created {formatDate(data.letter.createdAt)}</p>
                </div>
                <WaxSealIcon sealType={data.letter.sealType} sealColor={data.letter.sealColor} customInitials={data.letter.customInitials} size={58} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <InfoBox label="Privacy" value={data.letter.isPrivate ? 'Private letter' : 'Open letter'} />
                <InfoBox label="Flowers" value={String(data.letter.flowers?.length || 0)} />
              </div>

              <div className="space-y-3">
                <p className="font-heading text-[10px] tracking-[0.18em] uppercase text-ink/50">Body</p>
                <div className="real-paper rounded-sm px-4 py-4 font-body text-[15px] text-ink/72 leading-[1.85] whitespace-pre-wrap">
                  {data.letter.content.replace(/<[^>]+>/g, ' ')}
                </div>
              </div>
            </section>

            <section className="real-paper rounded-sm p-5 md:p-6">
              <h2 className="font-heading text-[11px] tracking-[0.18em] uppercase text-ink/64 mb-4">Request & device traces</h2>
              <div className="space-y-4">
                {data.events.map((event) => (
                  <article key={event.id} className="rounded-sm border border-gold/12 px-4 py-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                      <div>
                        <p className="font-heading text-[9px] tracking-[0.18em] uppercase text-ink/45">{event.eventType}</p>
                        <p className="font-body text-[13px] text-ink/48">{formatDate(event.createdAt)}</p>
                      </div>
                      <p className="font-body text-[12px] text-ink/46 break-all">IP hash: {event.ipHash}</p>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 font-body text-[13px] text-ink/62 mb-3">
                      <Meta label="Language" value={event.acceptLanguage || '—'} />
                      <Meta label="Do Not Track" value={event.doNotTrack || '—'} />
                      <Meta label="Referer" value={event.referer || '—'} />
                      <Meta label="User agent" value={event.userAgent || '—'} />
                    </dl>
                    {event.clientContext && (
                      <div>
                        <p className="font-heading text-[8px] tracking-[0.16em] uppercase text-ink/40 mb-2">Client context</p>
                        <pre className="real-paper rounded-sm p-3 text-[12px] text-ink/58 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(event.clientContext, null, 2)}</pre>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-gold/10 px-3 py-3">
      <p className="font-heading text-[8px] tracking-[0.16em] uppercase text-ink/38 mb-1">{label}</p>
      <p className="font-body text-[13px] text-ink/64">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-heading text-[8px] tracking-[0.16em] uppercase text-ink/38 mb-1">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
