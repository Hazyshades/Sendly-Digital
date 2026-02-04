import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { GitHubCallbackRoute } from '../pages/GitHubCallbackRoute';
import { LinkedInCallbackRoute } from '../pages/LinkedInCallbackRoute';
import { InstagramCallbackRoute } from '../pages/InstagramCallbackRoute';
import { GmailCallbackRoute } from '../pages/GmailCallbackRoute';
import { TwitterOAuth1CallbackRoute } from '../pages/TwitterOAuth1CallbackRoute';
import { TelegramAuthRoute } from '../pages/TelegramAuthRoute';
import { CircleMintRoute } from '../pages/CircleMintRoute';
import { LeaderboardRoute } from '../pages/LeaderboardRoute';
import { BlogRoute } from '../pages/BlogRoute';
import { BlogPostRoute } from '../pages/BlogPostRoute';
import { ReclaimCallbackRoute } from '../pages/ReclaimCallbackRoute';
import { ZkSendRoute } from '../pages/ZkSendRoute';
import { isZkHost, toZkUrl } from '../utils/runtime/zkHost';

function SharedAppRoutes({ zkMode }: { zkMode: boolean }) {
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
      <Route path="/bridge" element={<BridgeRoute />} />
      <Route path="/gateway" element={<GatewayRoute />} />
      <Route path="/auth/twitch/callback" element={<TwitchCallbackRoute />} />
      <Route path="/auth/twitter/callback" element={<TwitterCallbackRoute />} />
      <Route path="/auth/github/callback" element={<GitHubCallbackRoute />} />
      <Route path="/auth/linkedin/callback" element={<LinkedInCallbackRoute />} />
      <Route path="/auth/instagram/callback" element={<InstagramCallbackRoute />} />
      <Route path="/auth/gmail/callback" element={<GmailCallbackRoute />} />
      <Route path="/auth/twitter-oauth1/callback" element={<TwitterOAuth1CallbackRoute />} />
      <Route path="/auth/telegram" element={<TelegramAuthRoute />} />
      <Route path="/reclaim/callback" element={<ReclaimCallbackRoute />} />
      <Route path="/payments" element={zkMode ? <ZkSendRoute /> : <ZkHostRedirect />} />
      <Route path="/zksend" element={<Navigate to="/payments" replace />} />
      <Route path="/Circle-Mint" element={<CircleMintRoute />} />
      <Route path="/blog" element={<BlogRoute />} />
      <Route path="/blog/:slug" element={<BlogPostRoute />} />
    </Routes>
  );
}

function ZkHostRedirect() {
  useEffect(() => {
    try {
      window.location.assign(toZkUrl(window.location.href));
    } catch (e) {
      console.error('[zkTLS] Failed to redirect to zk host:', e);
    }
  }, []);
  return <SplashScreen />;
}

function MainAppRouter() {
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

  return <SharedAppRoutes zkMode={false} />;
}

function ZkAppRouter() {
  return <SharedAppRoutes zkMode={true} />;
}

function AppRouter() {
  const zk = isZkHost();
  return zk ? <ZkAppRouter /> : <MainAppRouter />;
}

export default AppRouter;
