import Header from '@/components/Header';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[80px] max-w-3xl mx-auto px-4 prose prose-invert">
        <h1>Privacy Policy</h1>
        <p>Last updated: February 2026</p>
        <p>Your privacy is important to us. This policy explains how we collect, use, and protect your data...</p>
      </main>
    </div>
  );
}
