import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for getting started',
    features: [
      '5 transactions/month',
      'Basic social connections',
      'Standard support',
      'Community access',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Creator',
    price: '$29',
    period: '/month',
    description: 'For active users and creators',
    features: [
      'Unlimited transactions',
      'All social connections',
      'Priority support',
      'Custom NFT cards',
      'Analytics dashboard',
      'API access',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For teams and organizations',
    features: [
      'Everything in Creator',
      'Multi-user accounts',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'White-label options',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function Membership() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.membership-title', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });

      gsap.from('.pricing-card', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
        },
        y: 80,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      id="membership"
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24"
      style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #1e1b4b 100%)' }}
    >
      {/* Title */}
      <div className="membership-title text-center mb-16 md:mb-24">
        <h2 className="font-jakarta font-bold text-3xl md:text-5xl text-white tracking-tight mb-4">
          Membership
        </h2>
        <p className="font-cormorant italic text-xl md:text-2xl text-sendly-coral">
          Choose Your Tier
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {plans.map((plan, index) => (
          <div
            key={plan.name}
            className="pricing-card relative p-8 rounded-[2rem] transition-all duration-500 cursor-pointer"
            style={{
              background: plan.highlighted
                ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: plan.highlighted
                ? '2px solid rgba(249, 115, 22, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              transform: hoveredPlan === index ? 'scale(1.02)' : 'scale(1)',
              boxShadow: plan.highlighted
                ? '0 20px 60px rgba(249, 115, 22, 0.2)'
                : 'none',
            }}
            onMouseEnter={() => setHoveredPlan(index)}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            {/* Highlighted Badge */}
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div 
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="font-jakarta text-xs font-semibold text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-8">
              <h3 className="font-jakarta font-bold text-2xl text-white mb-2">
                {plan.name}
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-jakarta font-bold text-4xl text-white">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="font-mono text-sm text-gray-400">
                    {plan.period}
                  </span>
                )}
              </div>
              <p className="font-cormorant italic text-gray-400 mt-2">
                {plan.description}
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Check className="w-5 h-5 text-sendly-coral flex-shrink-0" />
                  </div>
                  <span className="font-jakarta text-sm text-gray-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Link
              to="/dashboard"
              className="block w-full py-3 px-6 rounded-2xl text-center font-jakarta font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: plan.highlighted
                  ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: plan.highlighted ? 'white' : 'white',
              }}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
