import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from './Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

/**
 * In Reclaim flow, redirect after proof generation may lead here (especially in mobile QR flow).
 * The main "happy path" in our UI uses `startSession()` and doesn't require this route,
 * but we keep this page as a clear return point for the user.
 */
export function ReclaimCallbackRoute() {
  const [params] = useSearchParams();

  const paymentId = useMemo(() => params.get('paymentId'), [params]);

  return (
    <Layout>
      <Card>
        <CardHeader>
          <CardTitle>Reclaim: Verification Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            If you arrived here after generating proof — return to the <b>/payments</b> page and click Claim again
            if automatic claiming didn't work.
          </div>
          {paymentId ? <div className="text-sm">paymentId: {paymentId}</div> : null}
        </CardContent>
      </Card>
    </Layout>
  );
}

