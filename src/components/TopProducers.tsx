import Image from 'next/image';

const producers = [
  { id: 1, name: 'AfroMaestro', location: 'Nairobi, Kenya', stats: '210 Beats', image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop' },
  { id: 2, name: 'BeatsByKojo', location: 'Lagos, Nigeria', stats: '156 Beats', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
  { id: 3, name: 'SowetoSound', location: 'Johannesburg, SA', stats: '89 Beats', image: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop' },
  { id: 4, name: 'AccraVibe', location: 'Accra, Ghana', stats: '312 Beats', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop' },
];

export default function TopProducers() {
  return (
    <section className="py-8 border-b border-zinc-900">
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-primary">⚡</span> Top Producers
        </h2>
        <button className="text-xs text-zinc-500 hover:text-white transition-colors">See All ›</button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x hide-scrollbar">
        {producers.map((producer) => (
          <div key={producer.id} className="snap-start flex-shrink-0 w-[140px] flex flex-col items-center bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer group">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors mb-2">
              <Image src={producer.image} alt={producer.name} fill className="object-cover" />
            </div>
            <h3 className="font-bold text-sm text-center truncate w-full">{producer.name}</h3>
            <p className="text-[10px] text-zinc-500 text-center truncate w-full">{producer.location}</p>
            
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full">
              <span>🎹</span> {producer.stats}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
