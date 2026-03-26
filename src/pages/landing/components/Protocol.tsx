import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ConnectCard } from './protocol/ConnectCard';
import { SendCard } from './protocol/SendCard';
import { ReceiveCard } from './protocol/ReceiveCard';

gsap.registerPlugin(ScrollTrigger);

export function Protocol() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = document.querySelectorAll('.protocol-card');
      
      cards.forEach((card, index) => {
        gsap.to(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top center',
            end: '+=100%',
            scrub: true,
            pin: index > 0,
            pinSpacing: false,
          },
          scale: 0.9,
          opacity: 0.5,
          filter: 'blur(20px)',
          y: -50,
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      id="protocol"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24"
      style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #0a0a0f 100%)' }}
    >
      {/* Title */}
      <div className="mb-24">
        <h2 className="font-jakarta font-bold text-3xl md:text-5xl text-white tracking-tight mb-4">
          Protocol
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl text-sendly-coral">
          Three Steps to Financial Social
        </p>
      </div>

      {/* Stacking Cards */}
      <div className="max-w-4xl mx-auto space-y-0">
        <div className="protocol-card h-[80vh] min-h-[600px] flex items-center justify-center mb-8">
          <ConnectCard />
        </div>
        
        <div className="protocol-card h-[80vh] min-h-[600px] flex items-center justify-center mb-8">
          <SendCard />
        </div>
        
        <div className="protocol-card h-[80vh] min-h-[600px] flex items-center justify-center">
          <ReceiveCard />
        </div>
      </div>
    </section>
  );
}
