import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SocialResolver } from './features/SocialResolver';
import { LiveStream } from './features/LiveStream';
import { NFTGiftCard } from './features/NFTGiftCard';

gsap.registerPlugin(ScrollTrigger);

export function Features() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.features-title', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          end: 'bottom 60%',
          toggleActions: 'play none none reverse',
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      id="features"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24"
      style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #1e1b4b 100%)' }}
    >
      {/* Title */}
      <div className="features-title mb-16 md:mb-24">
        <h2 className="font-jakarta font-bold text-3xl md:text-5xl text-white tracking-tight">
          Transaction Micro-UI
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl text-sendly-coral mt-2">
          Interactive Functional Artifacts
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <SocialResolver />
        <LiveStream />
        <NFTGiftCard />
      </div>
    </section>
  );
}
