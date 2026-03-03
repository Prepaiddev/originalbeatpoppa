import Header from '@/components/Header';

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[80px] max-w-3xl mx-auto px-4 prose prose-invert">
        <h1>Refund Policy</h1>
        <p>Last updated: February 2026</p>
        <p>All sales are final. Refunds are only issued in cases of technical failure or duplicate charges...</p>
      </main>
    </div>
  );
}
