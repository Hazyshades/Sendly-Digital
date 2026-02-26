import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Heart, CreditCard, Sparkles } from 'lucide-react';

export function ReceiveCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

      // EKG wave animation
      tl.to('.ekg-segment', {
        scaleX: 1.2,
        opacity: 1,
        duration: 0.2,
        stagger: 0.1,
        ease: 'power2.out',
      })
      .to('.ekg-segment', {
        scaleX: 1,
        opacity: 0.5,
        duration: 0.3,
        stagger: 0.05,
      }, '+=0.5');

      // Card appearance
      tl.fromTo('.nft-card-visual',
        { scale: 0.8, opacity: 0, rotationY: 90 },
        { scale: 1, opacity: 1, rotationY: 0, duration: 0.8, ease: 'back.out(1.7)' },
        '+=1'
      )
      .to('.nft-card-visual', {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out',
      }, '+=0.5')
      .to('.nft-card-visual', {
        scale: 1,
        duration: 0.3,
      }, '+=0.3');

      // Particle burst
      tl.to('.receive-particle', {
        scale: 1.5,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
      }, '-=0.5');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-2xl mx-auto p-8 md:p-12 rounded-[3rem]"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl" style={{ background: 'rgba(249, 115, 22, 0.2)' }}>
            <Heart className="w-8 h-8 text-sendly-coral" />
          </div>
        </div>
        <h3 className="font-jakarta font-bold text-3xl md:text-4xl text-white mb-4">
          Receive
        </h3>
        <p className="font-cormorant italic text-xl text-gray-400">
          NFT Card Delivery
        </p>
      </div>

      {/* EKG + Card Visualization */}
      <div className="relative h-64 md:h-80 flex items-center justify-center">
        {/* EKG Wave Background */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ekgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0)" />
              <stop offset="50%" stopColor="rgba(249, 115, 22, 0.6)" />
              <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
            </linearGradient>
          </defs>
          {[...Array(20)].map((_, i) => (
            <rect
              key={i}
              className="ekg-segment"
              x={i * 20}
              y="140"
              width="10"
              height={Math.sin(i * 0.5) * 40 + 60}
              fill="url(#ekgGradient)"
              rx="5"
              style={{
                transformOrigin: 'center',
                opacity: 0.5,
              }}
            />
          ))}
        </svg>

        {/* NFT Card */}
        <div 
          className="nft-card-visual relative z-10"
          style={{
            perspective: '1000px',
          }}
        >
          <div 
            className="w-64 h-40 rounded-2xl p-6 flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #f97316 100%)',
              boxShadow: '0 20px 60px rgba(249, 115, 22, 0.4), inset 0 2px 10px rgba(255,255,255,0.3)',
            }}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <span className="font-outfit font-bold text-white text-lg">Sendly</span>
              <Sparkles className="w-5 h-5 text-white" />
            </div>

            {/* Card Content */}
            <div>
              <p className="font-mono text-xs text-white/80 mb-1">Gift Card</p>
              <p className="font-jakarta font-bold text-2xl text-white">100 USDC</p>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-white/20 border-2 border-white/30"
                  />
                ))}
              </div>
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Particle Burst */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="receive-particle absolute w-3 h-3 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              opacity: 0,
              scale: 0,
              transform: `rotate(${i * 45}deg) translateX(60px)`,
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
          <Heart className="w-4 h-4 text-sendly-coral" />
          <span className="font-mono text-xs text-sendly-coral">NFT Received</span>
        </div>
      </div>
    </div>
  );
}
