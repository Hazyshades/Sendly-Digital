import { Gift } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="min-h-screen circle-gradient-bg flex items-center justify-center relative">
      <div className="abstract-shape"></div>
      <div className="text-center relative z-10">
        <div className="relative w-24 h-24 bg-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-circle-card">
          <Gift className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">Sendly</h1>
        <p className="text-gray-700 text-lg">Transfers to anyone</p>
        <div className="mt-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}