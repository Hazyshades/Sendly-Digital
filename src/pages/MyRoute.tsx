import { MyCards } from '@/components/MyCards';
import { Layout } from '@/pages/Layout';
import { useNavigate } from 'react-router-dom';

export function MyRoute() {
  const navigate = useNavigate();

  const handleSpendCard = (tokenId: string) => {
    navigate(`/spend?tokenId=${tokenId}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <MyCards onSpendCard={handleSpendCard} />
      </div>
    </Layout>
  );
}

