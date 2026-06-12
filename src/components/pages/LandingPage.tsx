import { QuillIcon, EnvelopeIcon, CandleIcon } from '@/components/icons/SvgIcons';
import { OrnamentDivider, HeartSigilIcon, RoseIcon } from '@/components/icons/SvgIcons';
import DustParticles from '@/components/effects/DustParticles';
import CandleGlow from '@/components/effects/CandleGlow';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import { RoseFlower, IvyVine, CherryBlossomFlower } from '@/components/icons/FlowerSvgs';

interface LandingPageProps { onCompose: () => void; onMyLetters: () => void; }

export default function LandingPage({ onCompose, onMyLetters }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden parchment-bg">
      <DustParticles /><CandleGlow />

      <div className="absolute top-20 left-8 opacity-25 pointer-events-none hidden md:block"><RoseFlower size={60} color="#6B1025" /></div>
      <div className="absolute bottom-32 right-12 opacity-20 pointer-events-none hidden md:block"><IvyVine size={70} color="#264D3A" /></div>
      <div className="absolute top-1/2 left-4 opacity-15 pointer-events-none hidden lg:block"><CherryBlossomFlower size={55} color="#9a5060" /></div>

      <nav className="no-print relative z-20 flex items-center justify-between px-6 py-5 md:px-12 md:py-6">
        <div className="flex items-center gap-2.5">
          <HeartSigilIcon size={20} color="#6B1025" />
          <span className="font-heading text-[10px] md:text-[11px] tracking-[0.2em] text-ink/70 uppercase">Courier of Hearts</span>
        </div>
        <button onClick={onMyLetters} className="font-heading text-[10px] tracking-[0.15em] text-ink/45 uppercase hover:text-ink/75 transition-colors duration-700">My Letters</button>
      </nav>

      <main className="relative z-20 flex flex-col items-center justify-center px-6 pt-10 pb-16 md:pt-20 md:pb-24 min-h-[calc(100vh-180px)]">
        <div className="mb-10 opacity-35"><OrnamentDivider className="w-36 md:w-48" color="#8b7340" /></div>
        <div className="mb-10 animate-float"><WaxSealIcon sealType="heart" sealColor="burgundy" size={68} /></div>

        <h1 className="text-center mb-2">
          <span className="font-display text-4xl md:text-[3.5rem] lg:text-[4.2rem] font-light text-ink leading-[1.1] tracking-wide block">Send a letter</span>
        </h1>
        <h2 className="text-center mb-10">
          <span className="font-display text-3xl md:text-[2.8rem] lg:text-[3.2rem] font-light text-ink/65 italic leading-[1.15] block">worth keeping.</span>
        </h2>

        <p className="font-body text-center text-[16px] md:text-[17px] text-ink/50 max-w-md mb-12 leading-[1.8]">
          Write your heart on parchment. Seal it with wax.<br className="hidden md:block" />Send it to the one who matters most.
        </p>

        <button onClick={onCompose} className="group font-heading text-[11px] md:text-xs tracking-[0.2em] uppercase px-10 py-4 bg-ink text-parchment-light rounded-sm transition-all duration-700 hover:bg-ink-light pulse-glow" style={{ boxShadow: '0 3px 15px rgba(0,0,0,0.25)' }}>
          <span className="flex items-center gap-3"><QuillIcon size={16} color="#d4c5a0" />Write a Letter</span>
        </button>

        <div className="mt-16 opacity-20"><OrnamentDivider className="w-48 md:w-72" color="#8b7340" /></div>
      </main>

      <section className="relative z-20 px-6 pb-16 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 max-w-3xl mx-auto">
          <FeatureCard icon={<QuillIcon size={28} color="#6B1025" />} title="Compose" description="Write on aged parchment with real ink" />
          <FeatureCard icon={<EnvelopeIcon size={28} color="#6B1025" />} title="Seal & Send" description="Choose your wax seal, send a private link" />
          <FeatureCard icon={<CandleIcon size={28} color="#6B1025" />} title="Experience" description="Your beloved opens a ceremonial letter" />
        </div>
      </section>

      <footer className="relative z-20 py-6 text-center" style={{ borderTop: '1px solid rgba(139,115,64,0.1)' }}>
        <div className="flex items-center justify-center mb-1.5 opacity-25"><RoseIcon size={12} color="#6B1025" /></div>
        <p className="font-body text-[11px] text-ink/45 tracking-wider">Crafted with devotion</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-5 rounded-sm transition-all duration-700 hover:bg-ink/[0.04]">
      <div className="mb-3 opacity-75">{icon}</div>
      <h3 className="font-heading text-[10px] tracking-[0.18em] uppercase text-ink/65 mb-1.5">{title}</h3>
      <p className="font-body text-[14px] text-ink/45 leading-relaxed">{description}</p>
    </div>
  );
}
