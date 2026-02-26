import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Activity, ArrowRight } from 'lucide-react';

const transactions = [
  { text: 'Sending 100 USDC to @AliceCo...', type: 'send' },
  { text: 'Claiming NFT Card...', type: 'claim' },
  { text: 'zkProof verified...', type: 'verify' },
  { text: 'Minting Gift Card #4829...', type: 'mint' },
  { text: 'Bridge to Arbitrum complete', type: 'bridge' },
];

export function LiveStream() {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.livestream-card', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Typing effect for transactions
  useEffect(() => {
    if (currentLineIndex >= transactions.length) {
      // Reset after showing all lines
      const timer = setTimeout(() => {
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentText('');
      }, 3000);
      return () => clearTimeout(timer);
    }

    const currentTx = transactions[currentLineIndex];
    
    if (currentText.length < currentTx.text.length) {
      const timer = setTimeout(() => {
        setCurrentText(currentTx.text.slice(0, currentText.length + 1));
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Line complete, add to displayed and move to next
      const timer = setTimeout(() => {
        setDisplayedLines(prev => [...prev, currentTx.text]);
        setCurrentText('');
        setCurrentLineIndex(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentText, currentLineIndex]);

  return (
    <div 
      ref={containerRef}
      className="livestream-card relative p-6 rounded-[2rem] overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.2)' }}>
            <Activity className="w-5 h-5 text-sendly-coral" />
          </div>
          <div>
            <h3 className="font-jakarta font-semibold text-white text-lg">Telemetry Typewriter</h3>
            <p className="font-mono text-xs text-gray-400">Live Stream</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          <span className="font-mono text-xs text-sendly-coral">LIVE</span>
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="space-y-2 font-mono text-sm min-h-[160px]">
        {displayedLines.map((line, index) => (
          <div 
            key={index} 
            className="flex items-center gap-2 text-gray-300 py-1"
          >
            <ArrowRight className="w-3 h-3 text-sendly-coral flex-shrink-0" />
            <span>{line}</span>
          </div>
        ))}
        
        {/* Currently typing line */}
        {currentText && (
          <div className="flex items-center gap-2 text-gray-300 py-1">
            <ArrowRight className="w-3 h-3 text-sendly-coral flex-shrink-0" />
            <span>{currentText}</span>
            <span className="w-0.5 h-4 bg-sendly-coral animate-cursor-blink" />
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-gray-500">Block: 18,429,301</span>
          <span className="font-mono text-xs text-gray-500">Gas: 24 gwei</span>
        </div>
      </div>
    </div>
  );
}
