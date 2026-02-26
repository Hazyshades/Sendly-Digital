import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { X, Github, Linkedin, Mail, Send } from 'lucide-react';

const socialHandles = [
  { handle: '@elonmusk', address: '0x71...3a9f', icon: X },
  { handle: '@sama', address: '0x45...8b2c', icon: Mail },
  { handle: '@naval', address: '0x92...4f1a', icon: Github },
  { handle: '@cz_binance', address: '0x33...7c8e', icon: Linkedin },
];

export function SocialResolver() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cards, setCards] = useState(socialHandles.slice(0, 3));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prev => {
        const newCards = [...prev];
        newCards.shift();
        const nextIndex = (currentIndex + 3) % socialHandles.length;
        setCurrentIndex(prev => prev + 1);
        newCards.push(socialHandles[nextIndex % socialHandles.length]);
        return newCards;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.resolver-card', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
        x: -50,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="resolver-card relative p-6 rounded-[2rem] overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.2)' }}>
          <Send className="w-5 h-5 text-sendly-coral" />
        </div>
        <div>
          <h3 className="font-jakarta font-semibold text-white text-lg">Handle Shuffler</h3>
          <p className="font-mono text-xs text-gray-400">Social Resolver</p>
        </div>
      </div>

      {/* Cards Stack */}
      <div className="space-y-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={`${card.handle}-${index}`}
              className="flex items-center justify-between p-4 rounded-2xl transition-all duration-500"
              style={{
                background: index === 0 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'rgba(255, 255, 255, 0.05)',
                transform: index === 0 ? 'scale(1.02)' : 'scale(1)',
                marginLeft: index === 0 ? '8px' : '0',
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-jakarta font-medium text-white text-sm">
                  {card.handle}
                </span>
              </div>
              <span className="font-mono text-xs text-gray-400">
                {card.address}
              </span>
            </div>
          );
        })}
      </div>

      {/* Arrow Indicator */}
      <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-sendly-coral animate-pulse" />
          Auto-resolving
        </div>
      </div>
    </div>
  );
}
