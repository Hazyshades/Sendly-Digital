import { Layout } from '@/pages/Layout';
import { RemitSendForm } from '@/components/zksend/RemitSendForm';

export function RemitRoute() {
  return (
    <Layout>
      <main className="remit-shell w-full min-w-0 py-3 sm:py-8">
        <div className="mb-7 text-center">
          <p className="remit-kicker text-emerald-700">Sendly Remit</p>
          <h1 className="remit-title mt-2 text-slate-950">UAE to Global Remittance</h1>
          <p className="remit-lede mx-auto mt-3 text-slate-600">
            Send money to a verified social username.
          </p>
        </div>
        <RemitSendForm />
      </main>
    </Layout>
  );
}
