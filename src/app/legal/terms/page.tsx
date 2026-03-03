import Header from '@/components/Header';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[80px] max-w-3xl mx-auto px-4 prose prose-invert">
        <h1>Terms of Service</h1>
        <p>Last updated: February 2026</p>
        <p>Welcome to BeatPoppa. By using our platform, you agree to these terms...</p>
        {/* Add more mock legal text */}
      </main>
    </div>
  );
}
