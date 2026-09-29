import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';
import { ZkLoadingShell } from '@/components/ZkLoadingShell';
import { isZkHost, toZkUrl } from '@/lib/runtime/zkHost';

// Intentional code-splitting boundary: static route imports would load unrelated page graphs on every entry.
const LandingRoute = lazy(() => import('@/pages/LandingRoute').then(({ LandingRoute }) => ({ default: LandingRoute })));
const AgentRoute = lazy(() => import('@/pages/AgentRoute').then(({ AgentRoute }) => ({ default: AgentRoute })));
const CreateRoute = lazy(() => import('@/pages/CreateRoute').then(({ CreateRoute }) => ({ default: CreateRoute })));
const MyRoute = lazy(() => import('@/pages/MyRoute').then(({ MyRoute }) => ({ default: MyRoute })));
const SpendRoute = lazy(() => import('@/pages/SpendRoute').then(({ SpendRoute }) => ({ default: SpendRoute })));
const HistoryRoute = lazy(() => import('@/pages/HistoryRoute').then(({ HistoryRoute }) => ({ default: HistoryRoute })));
const TermsRoute = lazy(() => import('@/pages/TermsRoute').then(({ TermsRoute }) => ({ default: TermsRoute })));
const PrivacyRoute = lazy(() => import('@/pages/PrivacyRoute').then(({ PrivacyRoute }) => ({ default: PrivacyRoute })));
const BridgeRoute = lazy(() => import('@/pages/BridgeRoute').then(({ BridgeRoute }) => ({ default: BridgeRoute })));
const GatewayRoute = lazy(() => import('@/pages/GatewayRoute').then(({ GatewayRoute }) => ({ default: GatewayRoute })));
const TwitchCallbackRoute = lazy(() => import('@/pages/TwitchCallbackRoute').then(({ TwitchCallbackRoute }) => ({ default: TwitchCallbackRoute })));
const TwitterCallbackRoute = lazy(() => import('@/pages/TwitterCallbackRoute').then(({ TwitterCallbackRoute }) => ({ default: TwitterCallbackRoute })));
const GitHubCallbackRoute = lazy(() => import('@/pages/GitHubCallbackRoute').then(({ GitHubCallbackRoute }) => ({ default: GitHubCallbackRoute })));
const LinkedInCallbackRoute = lazy(() => import('@/pages/LinkedInCallbackRoute').then(({ LinkedInCallbackRoute }) => ({ default: LinkedInCallbackRoute })));
const InstagramCallbackRoute = lazy(() => import('@/pages/InstagramCallbackRoute').then(({ InstagramCallbackRoute }) => ({ default: InstagramCallbackRoute })));
const GmailCallbackRoute = lazy(() => import('@/pages/GmailCallbackRoute').then(({ GmailCallbackRoute }) => ({ default: GmailCallbackRoute })));
const TwitterOAuth1CallbackRoute = lazy(() => import('@/pages/TwitterOAuth1CallbackRoute').then(({ TwitterOAuth1CallbackRoute }) => ({ default: TwitterOAuth1CallbackRoute })));
const TelegramAuthRoute = lazy(() => import('@/pages/TelegramAuthRoute').then(({ TelegramAuthRoute }) => ({ default: TelegramAuthRoute })));
const CircleMintRoute = lazy(() => import('@/pages/CircleMintRoute').then(({ CircleMintRoute }) => ({ default: CircleMintRoute })));
const LeaderboardRoute = lazy(() => import('@/pages/LeaderboardRoute').then(({ LeaderboardRoute }) => ({ default: LeaderboardRoute })));
const AgentsRoute = lazy(() => import('@/pages/AgentsRoute').then(({ AgentsRoute }) => ({ default: AgentsRoute })));
const BlogRoute = lazy(() => import('@/pages/BlogRoute').then(({ BlogRoute }) => ({ default: BlogRoute })));
const BlogPostRoute = lazy(() => import('@/pages/BlogPostRoute').then(({ BlogPostRoute }) => ({ default: BlogPostRoute })));
const ReclaimCallbackRoute = lazy(() => import('@/pages/ReclaimCallbackRoute').then(({ ReclaimCallbackRoute }) => ({ default: ReclaimCallbackRoute })));
const ZkSendRoute = lazy(() => import('@/pages/ZkSendRoute').then(({ ZkSendRoute }) => ({ default: ZkSendRoute })));
const LeptonReceiptsRoute = lazy(() => import('@/pages/LeptonReceiptsRoute').then(({ LeptonReceiptsRoute }) => ({ default: LeptonReceiptsRoute })));
const LeptonPrBountyRoute = lazy(() => import('@/pages/LeptonPrBountyRoute').then(({ LeptonPrBountyRoute }) => ({ default: LeptonPrBountyRoute })));
const LeptonCitationRoute = lazy(() => import('@/pages/LeptonCitationRoute').then(({ LeptonCitationRoute }) => ({ default: LeptonCitationRoute })));
const LeptonHubRoute = lazy(() => import('@/pages/LeptonHubRoute').then(({ LeptonHubRoute }) => ({ default: LeptonHubRoute })));
const LeptonRepoSettingsRoute = lazy(() => import('@/pages/LeptonRepoSettingsRoute').then(({ LeptonRepoSettingsRoute }) => ({ default: LeptonRepoSettingsRoute })));
const LeptonTwitchCampaignRoute = lazy(() => import('@/pages/LeptonTwitchCampaignRoute').then(({ LeptonTwitchCampaignRoute }) => ({ default: LeptonTwitchCampaignRoute })));
const LeptonTwitchReceiptsRoute = lazy(() => import('@/pages/LeptonTwitchReceiptsRoute').then(({ LeptonTwitchReceiptsRoute }) => ({ default: LeptonTwitchReceiptsRoute })));
const ArchitectureRoute = lazy(() => import('@/pages/ArchitectureRoute').then(({ ArchitectureRoute }) => ({ default: ArchitectureRoute })));

function SharedAppRoutes({ zkMode }: { zkMode: boolean }) {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/dashboard" element={<AgentRoute />} />
      <Route path="/agent" element={zkMode ? <LeptonHubRoute /> : <ZkHostRedirect />} />
      <Route path="/agent/receipts" element={zkMode ? <LeptonReceiptsRoute /> : <ZkHostRedirect />} />
      <Route path="/agent/pr-bounty" element={zkMode ? <LeptonPrBountyRoute /> : <ZkHostRedirect />} />
      <Route path="/agent/repo-settings" element={zkMode ? <LeptonRepoSettingsRoute /> : <ZkHostRedirect />} />
      <Route path="/agent/citation" element={zkMode ? <LeptonCitationRoute /> : <ZkHostRedirect />} />
      <Route path="/agent/twitch/campaign" element={zkMode ? <LeptonTwitchCampaignRoute /> : <ZkHostRedirect />} />
      <Route path="/agent/twitch/receipts" element={zkMode ? <LeptonTwitchReceiptsRoute /> : <ZkHostRedirect />} />
      <Route path="/create" element={<CreateRoute />} />
      <Route path="/my" element={<MyRoute />} />
      <Route path="/spend" element={<SpendRoute />} />
      <Route path="/history" element={<HistoryRoute />} />
      <Route path="/agents" element={zkMode ? <Navigate to="/leaderboard" replace /> : <AgentsRoute />} />
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
      <Route path="/lepton" element={<LeptonToAgentRedirect />} />
      <Route path="/lepton/*" element={<LeptonToAgentRedirect />} />
      <Route path="/zksend" element={<Navigate to="/payments" replace />} />
      <Route path="/Circle-Mint" element={<CircleMintRoute />} />
      <Route path="/blog" element={<BlogRoute />} />
      <Route path="/blog/:slug" element={<BlogPostRoute />} />
      <Route path="/Architecture" element={<ArchitectureRoute />} />
      <Route path="/Architecture/" element={<ArchitectureRoute />} />
      <Route path="/architecture" element={<ArchitectureRoute />} />
      <Route path="/architecture/" element={<ArchitectureRoute />} />
    </Routes>
  );
}

function LeptonToAgentRedirect() {
  const location = useLocation();
  const nextPath = location.pathname.replace(/^\/lepton/, '/agent') || '/agent';
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />;
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
  return <SharedAppRoutes zkMode={false} />;
}

function ZkAppRouter() {
  return <SharedAppRoutes zkMode={true} />;
}

function AppRouter() {
  const zk = isZkHost();
  const routeFallback = zk ? <ZkLoadingShell /> : <SplashScreen />;

  return (
    <Suspense fallback={routeFallback}>
      {zk ? <ZkAppRouter /> : <MainAppRouter />}
    </Suspense>
  );
}

export default AppRouter;
