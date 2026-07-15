import { QuillIcon, EnvelopeIcon, CandleIcon } from '@/components/icons/SvgIcons';
import { OrnamentDivider, HeartSigilIcon, RoseIcon } from '@/components/icons/SvgIcons';
import DustParticles from '@/components/effects/DustParticles';
import CandleGlow from '@/components/effects/CandleGlow';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  RoseFlower, HibiscusFlower, LilyFlower, TulipFlower,
  PeonyFlower, LavenderFlower, WildRoseFlower, IvyVine,
  CherryBlossomFlower, DaisyFlower, ForgetMeNotFlower, SunFlower, ALL_FLOWERS,
} from '@/components/icons/FlowerSvgs';

interface LandingPageProps {
  onCompose: () => void;
  onMyLetters: () => void;
  onAdmin?: () => void;
  onPrivacy: () => void;
  onCookies: () => void;
  onThanks: () => void;
}

const FLOWER_FIELD = Array.from({ length: 180 }, (_, i) => ({
  id: i,
  flower: ALL_FLOWERS[i % ALL_FLOWERS.length],
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 18 + ((i * 17) % 38),
  rotation: (i * 29) % 80 - 40,
  opacity: 0.05 + ((i % 7) * 0.018),
}));

export default function LandingPage({ onCompose, onMyLetters, onAdmin, onPrivacy, onCookies, onThanks }: LandingPageProps) {
  usePageMeta({
    title: 'Courier of Hearts — Send a Letter Worth Keeping',
    description: 'Write heartfelt digital letters on parchment, seal them with wax, and share them with a softer, more memorable reading experience.',
  });

  return (
    <div className="relative min-h-screen overflow-hidden parchment-bg">
      <DustParticles /><CandleGlow />

      {FLOWER_FIELD.map(({ id, flower, left, top, size, rotation, opacity }) => {
        const Flower = flower.Component;
        return (
          <div key={id} className="absolute pointer-events-none hidden sm:block"
            style={{ left: `${left}%`, top: `${top}%`, opacity, transform: `rotate(${rotation}deg) translate(-50%,-50%)`, zIndex: 1 }}>
            <Flower size={size} color={flower.defaultColor} />
          </div>
        );
      })}

      <div className="absolute top-16 right-4 opacity-20 pointer-events-none"><RoseFlower size={40} color="#6B1025" /></div>
      <div className="absolute top-24 left-4 opacity-16 pointer-events-none"><CherryBlossomFlower size={30} color="#9a5060" /></div>
      <div className="absolute top-[42%] left-5 opacity-14 pointer-events-none"><ForgetMeNotFlower size={28} color="#264D3A" /></div>
      <div className="absolute bottom-40 left-3 opacity-15 pointer-events-none"><LavenderFlower size={35} color="#5a3d6b" /></div>
      <div className="absolute bottom-24 right-5 opacity-16 pointer-events-none"><TulipFlower size={30} color="#8A1538" /></div>
      <div className="absolute top-[60%] right-6 opacity-12 pointer-events-none"><DaisyFlower size={32} color="#8b7340" /></div>
      <div className="absolute top-24 left-8 opacity-20 pointer-events-none hidden md:block"><RoseFlower size={55} color="#6B1025" /></div>
      <div className="absolute bottom-28 right-10 opacity-18 pointer-events-none hidden md:block"><IvyVine size={65} color="#264D3A" /></div>
      <div className="absolute top-[45%] left-3 opacity-14 pointer-events-none hidden md:block"><CherryBlossomFlower size={50} color="#9a5060" /></div>
      <div className="absolute top-36 right-[15%] opacity-12 pointer-events-none hidden md:block"><TulipFlower size={42} color="#8A1538" /></div>
      <div className="absolute bottom-[35%] left-[8%] opacity-10 pointer-events-none hidden md:block"><WildRoseFlower size={38} color="#8A1538" /></div>
      <div className="absolute top-20 left-[22%] opacity-18 pointer-events-none hidden lg:block"><PeonyFlower size={50} color="#6B1025" /></div>
      <div className="absolute bottom-20 left-[18%] opacity-15 pointer-events-none hidden lg:block"><HibiscusFlower size={48} color="#8A1538" /></div>
      <div className="absolute top-[30%] right-[5%] opacity-14 pointer-events-none hidden lg:block"><LilyFlower size={45} color="#8b7340" /></div>
      <div className="absolute bottom-[22%] right-[20%] opacity-16 pointer-events-none hidden lg:block"><ForgetMeNotFlower size={42} color="#264D3A" /></div>
      <div className="absolute top-[70%] left-[30%] opacity-12 pointer-events-none hidden lg:block"><SunFlower size={40} color="#8b7340" /></div>
      <div className="absolute top-[18%] left-[45%] opacity-12 pointer-events-none hidden lg:block"><RoseFlower size={38} color="#8A1538" /></div>
      <div className="absolute top-[62%] left-[48%] opacity-11 pointer-events-none hidden lg:block"><CherryBlossomFlower size={42} color="#9a5060" /></div>
      <div className="absolute bottom-[18%] right-[36%] opacity-12 pointer-events-none hidden lg:block"><LavenderFlower size={44} color="#5a3d6b" /></div>
      <div className="absolute top-12 right-[30%] opacity-13 pointer-events-none hidden xl:block"><LavenderFlower size={55} color="#5a3d6b" /></div>
      <div className="absolute bottom-12 left-[35%] opacity-11 pointer-events-none hidden xl:block"><DaisyFlower size={45} color="#8b7340" /></div>
      <div className="absolute top-[55%] right-[28%] opacity-10 pointer-events-none hidden xl:block"><CherryBlossomFlower size={38} color="#9a5060" /></div>
      <div className="absolute top-[40%] left-[18%] opacity-9 pointer-events-none hidden xl:block"><ForgetMeNotFlower size={36} color="#264D3A" /></div>

      <nav className="no-print relative z-20 flex items-center justify-between px-6 py-5 md:px-12 md:py-6">
        <div className="flex items-center gap-2.5">
          <HeartSigilIcon size={20} color="#6B1025" />
          <span className="font-heading text-[10px] md:text-[11px] tracking-[0.2em] text-ink/70 uppercase">Courier of Hearts</span>
        </div>
        <div className="flex items-center gap-4">
          {onAdmin && <button onClick={onAdmin} className="font-heading text-[10px] tracking-[0.15em] text-ink/46 uppercase hover:text-ink/72 transition-colors duration-700">Steward</button>}
          <button onClick={onMyLetters} className="font-heading text-[10px] tracking-[0.15em] text-ink/55 uppercase hover:text-ink/78 transition-colors duration-700">My Letters</button>
        </div>
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

        <p className="font-body text-center text-[16px] md:text-[17px] text-ink/60 max-w-md mb-12 leading-[1.8]">
          Write your heart on parchment. Seal it with wax. <br className="hidden md:block" />Send it to the one who matters most.
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

      <footer className="relative z-20 py-6 text-center px-6" style={{ borderTop: '1px solid rgba(139,115,64,0.1)' }}>
        <div className="flex items-center justify-center mb-1.5 opacity-30"><RoseIcon size={12} color="#6B1025" /></div>
        <p className="font-body text-[11px] text-ink/58 tracking-wider mb-3">Crafted with devotion</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={onPrivacy} className="font-heading text-[9px] tracking-[0.15em] uppercase text-ink/50 hover:text-ink/72 transition-colors duration-500">Privacy</button>
          <button onClick={onCookies} className="font-heading text-[9px] tracking-[0.15em] uppercase text-ink/50 hover:text-ink/72 transition-colors duration-500">Cookies</button>
          <button onClick={onThanks} className="font-heading text-[9px] tracking-[0.15em] uppercase text-ink/50 hover:text-ink/72 transition-colors duration-500">Thanks</button>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-5 rounded-sm transition-all duration-700 hover:bg-ink/[0.04]">
      <div className="mb-3 opacity-85">{icon}</div>
      <h3 className="font-heading text-[10px] tracking-[0.18em] uppercase text-ink/72 mb-1.5">{title}</h3>
      <p className="font-body text-[14px] text-ink/58 leading-relaxed">{description}</p>
    </div>
  );
}
