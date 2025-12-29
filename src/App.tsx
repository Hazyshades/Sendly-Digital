import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { sdk } from '@farcaster/miniapp-sdk';
import { SplashScreen } from '../components/SplashScreen';
import { useState } from 'react';
import { LandingRoute } from '../pages/LandingRoute';
import { AgentRoute } from '../pages/AgentRoute';
import { CreateRoute } from '../pages/CreateRoute';
import { MyRoute } from '../pages/MyRoute';
import { SpendRoute } from '../pages/SpendRoute';
import { HistoryRoute } from '../pages/HistoryRoute';
import { TermsRoute } from '../pages/TermsRoute';
import { PrivacyRoute } from '../pages/PrivacyRoute';
import { BridgeRoute } from '../pages/BridgeRoute';
import { GatewayRoute } from '../pages/GatewayRoute';
import { TwitchCallbackRoute } from '../pages/TwitchCallbackRoute';
import { TwitterCallbackRoute } from '../pages/TwitterCallbackRoute';
import { CircleMintRoute } from '../pages/CircleMintRoute';
import { LeaderboardRoute } from '../pages/LeaderboardRoute';
import { FAQRoute } from '../pages/FAQRoute';
import { LitepaperRoute } from '../pages/LitepaperRoute';

function AppRouter() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        await sdk.actions.ready();
        console.log('Mini App SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Mini App SDK:', error);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      }
    };

    initializeMiniApp();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/dashboard" element={<AgentRoute />} />
      <Route path="/agent" element={<AgentRoute />} />
      <Route path="/create" element={<CreateRoute />} />
      <Route path="/my" element={<MyRoute />} />
      <Route path="/spend" element={<SpendRoute />} />
      <Route path="/history" element={<HistoryRoute />} />
      <Route path="/leaderboard" element={<LeaderboardRoute />} />
      <Route path="/terms" element={<TermsRoute />} />
      <Route path="/privacy" element={<PrivacyRoute />} />
      <Route path="/faq" element={<FAQRoute />} />
      <Route path="/litepaper" element={<LitepaperRoute />} />
      <Route path="/bridge" element={<BridgeRoute />} />
      <Route path="/gateway" element={<GatewayRoute />} />
      <Route path="/auth/twitch/callback" element={<TwitchCallbackRoute />} />
      <Route path="/auth/twitter/callback" element={<TwitterCallbackRoute />} />
      <Route path="/Circle-Mint" element={<CircleMintRoute />} />
    </Routes>
  );
}

export default AppRouter;

