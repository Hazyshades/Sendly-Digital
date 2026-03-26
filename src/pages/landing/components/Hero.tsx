import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [typedText, setTypedText] = useState('');
  const fullText = '0x7f...3a9 → @username';

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered fade-up animation for hero text
      const tl = gsap.timeline({ delay: 0.5 });
      
      tl.from('.hero-money', {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      })
      .from('.hero-social', {
        y: 80,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
      }, '-=0.6')
      .from('.hero-typed', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      }, '-=0.4');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Typing effect
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative h-[100dvh] w-full overflow-hidden"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30,27,75,0.6) 0%, rgba(10,10,15,0.95) 100%)',
        }}
      />

      {/* Content - Bottom Left Third */}
      <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 lg:p-24">
        <div className="max-w-4xl">
          {/* "Money is" */}
          <div className="hero-money mb-4">
            <span className="font-jakarta font-bold text-white text-lg md:text-xl uppercase tracking-[0.3em]">
              Money is
            </span>
          </div>

          {/* "Social." - Massive Serif Italic */}
          <div className="hero-social mb-8">
            <h1 
              className="font-cormorant italic text-[5rem] md:text-[7rem] lg:text-[9rem] leading-none font-bold text-sendly-coral"
              style={{ lineHeight: 0.9 }}
            >
              Social.
            </h1>
          </div>

          {/* Typed Address */}
          <div className="hero-typed flex items-center gap-4">
            <div className="font-mono text-sm md:text-base text-white/80 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
              {typedText}
              <span className="animate-cursor-blink inline-block w-0.5 h-4 ml-1 bg-sendly-coral" />
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 right-8 md:right-16 lg:right-24 flex flex-col items-center gap-2 text-white/50">
            <span className="font-mono text-xs uppercase tracking-widest">Scroll</span>
            <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
