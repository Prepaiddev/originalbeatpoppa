import Header from '@/components/Header';
import { ShoppingBag, Heart, Settings, LogOut, Edit, Share2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-md mx-auto px-4">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-full h-32 bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl absolute top-0 -z-10"></div>
          
          <div className="mt-16 relative">
            <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-zinc-800">
               <Image 
                  src="https://placehold.co/200x200/101010/ffffff?text=GU" 
                  alt="Profile" 
                  fill 
                  className="object-cover"
                />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white border-2 border-black">
              <Edit size={14} />
            </button>
          </div>
          
          <div className="text-center mt-3">
            <h1 className="text-2xl font-bold text-white">Guest User</h1>
            <p className="text-zinc-400 text-sm">Producer / Artist • Lagos, NG</p>
          </div>

          <div className="flex gap-3 mt-6">
            <Link 
              href="/profile/edit"
              className="px-6 py-2 bg-white text-black font-bold rounded-full text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center"
            >
              Edit Profile
            </Link>
            <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-full text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-around py-6 border-y border-zinc-900 mb-8">
          <div className="text-center">
            <span className="block text-xl font-bold text-white">0</span>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Beats</span>
          </div>
          <div className="text-center border-l border-zinc-900 pl-8">
            <span className="block text-xl font-bold text-white">0</span>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Followers</span>
          </div>
          <div className="text-center border-l border-zinc-900 pl-8">
            <span className="block text-xl font-bold text-white">0</span>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Following</span>
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-3">
          <Link href="/dashboard/buyer" className="flex items-center p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors group border border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mr-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <ShoppingBag size={20} />
            </div>
            <span className="font-medium flex-1">My Purchases</span>
          </Link>
          
          <Link href="/dashboard/buyer" className="flex items-center p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors group border border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mr-4 group-hover:bg-red-500 group-hover:text-white transition-colors">
              <Heart size={20} />
            </div>
            <span className="font-medium flex-1">Favorites</span>
          </Link>

          <Link href="/settings" className="flex items-center p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors group border border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mr-4 group-hover:bg-white group-hover:text-black transition-colors">
              <Settings size={20} />
            </div>
            <span className="font-medium flex-1">Settings</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
