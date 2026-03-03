"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { dummyBeats } from '@/data/beats';
import { Database } from 'lucide-react';

export default function SeedDatabaseButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    if (!confirm('Are you sure you want to seed the database? This may create duplicates.')) return;
    
    setLoading(true);
    setMessage(null);

    try {
      // 1. Get a valid user to assign beats to (or create a dummy one if possible, but better to use existing)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (profileError) throw profileError;
      
      if (!profiles || profiles.length === 0) {
        throw new Error('No users found. Please sign up a user first to assign beats to.');
      }

      const artistId = profiles[0].id;

      // 2. Prepare beats data
      const beatsToInsert = dummyBeats.map(beat => ({
        title: beat.title,
        artist_id: artistId, // Assign all to this user for now
        description: `A ${beat.genre} beat by ${beat.artist}`,
        audio_url: beat.audioUrl,
        cover_url: beat.coverUrl,
        price: beat.price,
        bpm: beat.bpm,
        key: beat.key,
        genre: beat.genre,
        tags: beat.tags,
        plays: beat.plays,
        is_active: true
      }));

      // 3. Insert into Supabase
      const { error: insertError } = await supabase
        .from('beats')
        .insert(beatsToInsert);

      if (insertError) throw insertError;

      setMessage(`Successfully seeded ${beatsToInsert.length} beats!`);

    } catch (error: any) {
      console.error('Seeding error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Database size={20} className="text-primary" />
        Database Actions
      </h3>
      
      <button 
        onClick={handleSeed}
        disabled={loading}
        className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Seeding...' : 'Seed Database with Dummy Beats'}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
