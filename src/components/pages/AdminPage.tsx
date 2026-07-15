import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Letter } from '@/types/letter';
import type { AdminStats } from '@/types/admin';
import { clearStoredAdminKey, getAdminStats, getStoredAdminKey, listAdminLetters, storeAdminKey } from '@/services/admin';
import { HeartSigilIcon, OrnamentDivider } from '@/components/icons/SvgIcons';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import { usePageMeta } from '@/hooks/usePageMeta';

interface AdminPageProps {
  onBack: () => void;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function AdminPage({ onBack }: AdminPageProps) {
  const [adminKey, setAdminKey] = useState(getStoredAdminKey());
  const [draftKey, setDraftKey] = useState(getStoredAdminKey());
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  usePageMeta({
    title: 'Steward’s Desk — Courier of Hearts',
    description: 'Private steward dashboard for service health, letters, traces, and archive review.',
    robots: 'noindex,nofollow',
  });

  const loadAdminData = useCallback(async (key: string) => {
    setLoading(true);
    setError('');
    const [statsRes, lettersRes] = await Promise.all([
      getAdminStats(key),
      listAdminLetters(key),
    ]);

    if (!statsRes.success || !lettersRes.success || !statsRes.data || !lettersRes.data) {
      setError(statsRes.error || lettersRes.error || 'Unable to open the steward’s desk.');
      setLoading(false);
      return false;
    }

    setStats(statsRes.data);
    setLetters(lettersRes.data);
    setLoading(false);
    return true;
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    void loadAdminData(adminKey);
  }, [adminKey, loadAdminData]);

  const handleUnlock = useCallback(async () => {
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
    setStats(null);
    setLetters([]);
    setError('');
  }, []);

  const filteredLetters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return letters;
    return letters.filter((letter) => {
      const body = stripHtml(letter.content || '').toLowerCase();
      return [letter.recipient, letter.slug, letter.customInitials || '', letter.signature || '', body]
        .some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [letters, query]);

  if (!adminKey) {
    return (
      <div className="min-h-screen parchment-bg flex items-center justify-center px-6">
        <div className="relative z-20 letter-paper rounded-sm p-8 md:p-12 max-w-lg w-full text-center">
          <HeartSigilIcon size={34} color="#6B1025" className="mx-auto mb-5 opacity-50" />
          <h1 className="font-display text-2xl text-ink/90 mb-2">Steward’s Desk</h1>
          <p className="font-body text-[15px] text-ink/58 italic mb-6">For the keeper of the archive only.</p>
          <OrnamentDivider className="w-40 mx-auto mb-6" color="#8b7340" />
          <input
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Admin key"
            className="parchment-input w-full text-center font-body text-base py-3 mb-4"
          />
          {error && <p className="font-body text-[14px] text-burgundy italic mb-4">{error}</p>}
          <div className="flex items-center justify-center gap-3">
            <button onClick={onBack} className="font-heading text-[10px] tracking-[0.15em] uppercase py-3 px-6 border border-gold/20 text-ink/50 rounded-sm hover:text-ink/80 transition-all duration-500">Back</button>
            <button onClick={handleUnlock} className="font-heading text-[10px] tracking-[0.18em] uppercase py-3 px-8 bg-ink text-parchment-light rounded-sm hover:bg-ink-light transition-all duration-500">Open Desk</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parchment-bg">
      <nav className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4" style={{ borderBottom: '1px solid rgba(139,115,64,0.1)' }}>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.12em] text-ink/50 uppercase hover:text-ink/80 transition-colors duration-500">&larr; Home</button>
        <div className="flex items-center gap-2">
          <HeartSigilIcon size={18} color="#6B1025" />
          <span className="font-heading text-[10px] tracking-[0.2em] text-ink/55 uppercase hidden md:inline">Steward’s Desk</span>
        </div>
        <button onClick={handleLogout} className="font-heading text-[11px] tracking-[0.12em] text-ink/50 uppercase hover:text-ink/80 transition-colors duration-500">Close</button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative z-10 space-y-8">
        <header className="text-center">
          <h1 className="font-display text-3xl md:text-4xl text-ink/88 mb-2">Steward’s Desk</h1>
          <p className="font-body text-[15px] md:text-[16px] text-ink/55 italic">A quiet ledger of the letters, their health, and the small life of the server.</p>
          <OrnamentDivider className="w-44 mx-auto mt-5" color="#8b7340" />
        </header>

        {loading && !stats ? (
          <div className="text-center py-12"><p className="font-body italic text-ink/45">Opening the archive…</p></div>
        ) : error ? (
          <div className="text-center py-12"><p className="font-body italic text-burgundy">{error}</p></div>
        ) : stats ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="All letters" value={String(stats.letters.total)} note={`${stats.letters.private} private · ${stats.letters.public} open`} />
              <StatCard label="Views" value={String(stats.letters.totalViews)} note={`${stats.letters.createdToday} written today`} />
              <StatCard label="Storage" value={formatBytes(stats.storage.dbSizeBytes)} note={`${stats.storage.cacheFiles} cache files`} />
              <StatCard label="Uptime" value={`${Math.floor(stats.app.uptimeSeconds / 3600)}h`} note={`${stats.system.cpus} vCPU · ${stats.app.environment}`} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
              <Panel title="Recent letters">
                <div className="space-y-3">
                  {stats.recentLetters.map((item) => (
                    <div key={item.id} className="real-paper rounded-sm px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-lg text-ink/85">To {item.recipient}</p>
                        <p className="font-body text-[12px] text-ink/45">{formatDate(item.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-[9px] tracking-[0.15em] uppercase text-ink/45">{item.isPrivate ? 'Private' : 'Open'}</p>
                        <p className="font-body text-[12px] text-ink/45">{item.views} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Server ledger">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 font-body text-[14px] text-ink/62">
                  <Fact label="Node" value={stats.app.nodeVersion} />
                  <Fact label="PID" value={String(stats.app.pid)} />
                  <Fact label="Host" value={`${stats.app.host}:${stats.app.port}`} />
                  <Fact label="Platform" value={`${stats.system.platform} · ${stats.system.arch}`} />
                  <Fact label="Memory free" value={formatBytes(stats.system.freeMemBytes)} />
                  <Fact label="Memory total" value={formatBytes(stats.system.totalMemBytes)} />
                  <Fact label="Average flowers" value={stats.letters.averageFlowers.toFixed(1)} />
                  <Fact label="Average length" value={`${Math.round(stats.letters.averageContentLength)} chars`} />
                  <Fact label="Expiring soon" value={String(stats.letters.expiringSoon)} />
                  <Fact label="Load avg" value={stats.system.loadAverage.map((v) => v.toFixed(2)).join(' · ')} />
                </dl>
              </Panel>
            </section>

            <Panel title="All letters">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by recipient, slug, initials, signature, or line…"
                  className="parchment-input flex-1 font-body text-[15px] py-2"
                />
                <button onClick={() => loadAdminData(adminKey)} className="font-heading text-[10px] tracking-[0.15em] uppercase py-3 px-6 bg-ink text-parchment-light rounded-sm hover:bg-ink-light transition-all duration-500">Refresh</button>
              </div>

              <div className="space-y-4">
                {filteredLetters.map((letter) => {
                  const plain = stripHtml(letter.content || '');
                  const expanded = expandedSlug === letter.slug;
                  return (
                    <article key={letter.id} className="letter-paper rounded-sm p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-display text-xl text-ink/85">To {letter.recipient}</p>
                          <p className="font-body text-[12px] text-ink/45">{formatDate(letter.createdAt)} · {letter.isPrivate ? 'Private' : 'Open'} · {letter.views || 0} views</p>
                        </div>
                        <div className="text-right">
                          <WaxSealIcon sealType={letter.sealType} sealColor={letter.sealColor} customInitials={letter.customInitials} size={42} />
                          <p className="font-heading text-[8px] tracking-[0.15em] uppercase text-ink/38 mt-1">{letter.slug}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <MiniFact label="Date line" value={letter.letterDate || '—'} />
                        <MiniFact label="Flowers" value={String(letter.flowers?.length || 0)} />
                      </div>

                      <p className="font-body text-[15px] text-ink/68 leading-relaxed italic">
                        {expanded ? plain : `${plain.slice(0, 220)}${plain.length > 220 ? '…' : ''}`}
                      </p>

                      <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
                        <p className="font-body text-[13px] text-ink/45">Signed {letter.signature || '—'}</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { window.location.hash = `#/letter/${letter.slug}/info`; }} className="font-heading text-[9px] tracking-[0.16em] uppercase py-2 px-4 border border-gold/20 text-ink/48 rounded-sm hover:text-ink/72 transition-all duration-500">Info</button>
                          <button onClick={() => setExpandedSlug(expanded ? null : letter.slug)} className="font-heading text-[9px] tracking-[0.16em] uppercase py-2 px-4 border border-gold/20 text-ink/48 rounded-sm hover:text-ink/72 transition-all duration-500">{expanded ? 'Hide' : 'Reveal'}</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="real-paper rounded-sm p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-heading text-[11px] tracking-[0.18em] uppercase text-ink/65">{title}</h2>
        <div className="h-px flex-1 bg-gold/10" />
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="real-paper rounded-sm p-4 text-center">
      <p className="font-heading text-[9px] tracking-[0.18em] uppercase text-ink/42 mb-2">{label}</p>
      <p className="font-display text-3xl text-ink/88 leading-none mb-2">{value}</p>
      <p className="font-body text-[12px] text-ink/45 italic">{note}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-heading text-[9px] tracking-[0.16em] uppercase text-ink/38 mb-1">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-gold/10 px-3 py-2">
      <p className="font-heading text-[8px] tracking-[0.16em] uppercase text-ink/38 mb-1">{label}</p>
      <p className="font-body text-[13px] text-ink/62">{value}</p>
    </div>
  );
}
