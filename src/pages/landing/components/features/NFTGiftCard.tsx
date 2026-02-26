import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CreditCard, Sparkles, MousePointer2 } from 'lucide-react';

export function NFTGiftCard() {
  const [step, setStep] = useState(0); // 0: design, 1: amount, 2: mint, 3: minted
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const steps = [
    { title: 'Select Design', icon: CreditCard },
    { title: 'Enter Amount', icon: Sparkles },
    { title: 'Mint NFT', icon: MousePointer2 },
    { title: 'Minted!', icon: Sparkles },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.nft-card', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Auto cursor movement simulation
  useEffect(() => {
    const timeline = gsap.timeline({
      repeat: -1,
      delay: 1,
    });

    // Move to design selection
    timeline.to('.mock-cursor', {
      x: 80,
      y: 60,
      duration: 1,
      ease: 'power2.inOut',
    })
    // Click animation
    .to('.mock-cursor', {
      scale: 0.8,
      duration: 0.1,
    })
    .to('.mock-cursor', {
      scale: 1,
      duration: 0.1,
    })
    // Move to amount
    .to('.mock-cursor', {
      x: 150,
      y: 100,
      duration: 1,
      ease: 'power2.inOut',
    })
    .to('.mock-cursor', {
      scale: 0.8,
      duration: 0.1,
    })
    .to('.mock-cursor', {
      scale: 1,
      duration: 0.1,
    })
    // Move to mint button
    .to('.mock-cursor', {
      x: 120,
      y: 160,
      duration: 1,
      ease: 'power2.inOut',
    })
    .to('.mock-cursor', {
      scale: 0.8,
      duration: 0.1,
    })
    .to('.mock-cursor', {
      scale: 1,
      duration: 0.1,
    })
    // Particle burst effect
    .to('.particle-burst', {
      scale: 1.5,
      opacity: 0,
      duration: 0.5,
    })
    .set('.particle-burst', {
      scale: 0,
      opacity: 1,
    });

    // Step progression
    const stepInterval = setInterval(() => {
      setStep(prev => (prev + 1) % 4);
    }, 3500);

    return () => {
      timeline.kill();
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="nft-card relative p-6 rounded-[2rem] overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.2)' }}>
          <CreditCard className="w-5 h-5 text-sendly-coral" />
        </div>
        <div>
          <h3 className="font-jakarta font-semibold text-white text-lg">Mock Cursor Protocol</h3>
          <p className="font-mono text-xs text-gray-400">NFT Gift Card</p>
        </div>
      </div>

      {/* Interactive Simulation Area */}
      <div 
        ref={cardRef}
        className="relative h-48 rounded-2xl overflow-hidden mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(30,27,75,0.8) 0%, rgba(10,10,15,0.9) 100%)',
        }}
      >
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Step Indicators */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`transition-all duration-300 ${i === step ? 'scale-110' : 'scale-100 opacity-50'}`}
              >
                <Icon 
                  className={`w-5 h-5 ${i === step ? 'text-sendly-coral' : 'text-gray-500'}`} 
                />
              </div>
            );
          })}
        </div>

        {/* Card Preview */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`w-32 h-20 rounded-xl transition-all duration-500 ${
              step === 3 ? 'scale-110' : 'scale-100'
            }`}
            style={{
              background: step === 3 
                ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              border: step === 3 ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {step === 3 && (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Mock Cursor */}
        <div 
          className="mock-cursor absolute pointer-events-none"
          style={{
            left: 20,
            top: 20,
            transition: 'all 0.1s',
          }}
        >
          <MousePointer2 className="w-6 h-6 text-sendly-coral drop-shadow-lg" />
        </div>

        {/* Particle Burst */}
        <div 
          className="particle-burst absolute inset-0 flex items-center justify-center"
          style={{
            scale: 0,
            opacity: 1,
          }}
        >
          <div className="relative">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-sendly-coral"
                style={{
                  transform: `rotate(${i * 45}deg) translateX(30px)`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Minting Progress */}
        {step === 2 && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sendly-coral transition-all duration-1000"
                style={{ width: '100%' }}
              />
            </div>
            <p className="font-mono text-xs text-gray-400 mt-2 text-center">Minting...</p>
          </div>
        )}
      </div>

      {/* Step Label */}
      <div className="text-center">
        <span className="font-jakarta text-sm text-white">
          {steps[step].title}
        </span>
      </div>
    </div>
  );
}
