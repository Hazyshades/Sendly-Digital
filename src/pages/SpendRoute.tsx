import { SpendCard } from '@/components/SpendCard';
import { Layout } from '@/pages/Layout';
import { useSearchParams } from 'react-router-dom';

export function SpendRoute() {
  const [searchParams] = useSearchParams();
  const tokenId = searchParams.get('tokenId') || '';

  return (
    <Layout>
      <SpendCard selectedTokenId={tokenId} />
    </Layout>
  );
}

