"use client";

import Header from '@/components/Header';
import { Save, User, Mail, Lock, Bell } from 'lucide-react';

export default function BuyerSettingsPage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        <div className="space-y-8">
          {/* Profile Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User size={20} className="text-primary" /> Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Display Name</label>
                <input type="text" defaultValue="Guest User" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input type="email" defaultValue="user@example.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lock size={20} className="text-primary" /> Security
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Current Password</label>
                <input type="password" placeholder="••••••••" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">New Password</label>
                  <input type="password" placeholder="New password" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Confirm Password</label>
                  <input type="password" placeholder="Confirm password" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Bell size={20} className="text-primary" /> Notifications
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-zinc-950 border-zinc-800 text-primary focus:ring-primary accent-primary" />
                <span className="text-zinc-300 group-hover:text-white transition-colors">Email me about new beats from artists I follow</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-zinc-950 border-zinc-800 text-primary focus:ring-primary accent-primary" />
                <span className="text-zinc-300 group-hover:text-white transition-colors">Email me about special offers and discounts</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
