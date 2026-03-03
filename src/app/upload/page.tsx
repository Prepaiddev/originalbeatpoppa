import { UploadCloud } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="p-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
        <UploadCloud size={40} className="text-blue-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Upload Your Beat</h1>
      <p className="text-zinc-400 text-center mb-8">
        Share your sound with the world. Join thousands of producers on BeatPoppa.
      </p>
      <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
        Select Files
      </button>
    </div>
  );
}
