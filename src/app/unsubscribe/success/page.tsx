
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function UnsubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={48} className="text-green-500" />
      </div>
      <h1 className="text-3xl font-black text-white mb-2">Unsubscribed Successfully</h1>
      <p className="text-zinc-400 max-w-md mb-8">
        You have been removed from our marketing mailing list. You will still receive transactional emails related to your orders and account security.
      </p>
      <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
        Return to Home
      </Link>
    </div>
  );
}
