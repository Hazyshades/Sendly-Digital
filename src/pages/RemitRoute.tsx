import { Layout } from '@/pages/Layout';
import { RemitSendForm } from '@/components/zksend/RemitSendForm';

export function RemitRoute() {
  return (
    <Layout>
      <main className="remit-shell mx-auto max-w-2xl py-3 sm:py-8">
        <div className="mb-7 text-center">
          <p className="remit-kicker text-emerald-700">Sendly Remit</p>
          <h1 className="remit-title mt-2 text-slate-950">UAE to Global Remittance</h1>
          <p className="remit-lede mx-auto mt-3 text-slate-600">
            Send money to a verified @twitter username. No wallet address required.
          </p>
        </div>
        <RemitSendForm />
      </main>
    </Layout>
  );
}
