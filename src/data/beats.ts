import { Track } from '@/store/usePlayerStore';

// Helper to generate variations
const generateBeats = () => {
  const baseBeats: Track[] = [
    {
      id: '1',
      title: 'Trap Soul Vibe',
      artist: 'Metro Producer',
      username: 'metro',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
      price: 29.99,
    },
    {
      id: '2',
      title: 'Drill Hard',
      artist: 'UK Drillaz',
      username: 'ukdrillaz',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Algorithms.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
      price: 34.99,
    },
    {
      id: '3',
      title: 'Lo-Fi Chill',
      artist: 'Study Beats',
      username: 'studybeats',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kai_Engel/Satin/Kai_Engel_-_04_-_Sentinel.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=400&auto=format&fit=crop',
      price: 19.99,
    },
    {
      id: '4',
      title: 'Afrobeat Summer',
      artist: 'Naija King',
      username: 'naijaking',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Yung_Kartz/August_2019/Yung_Kartz_-_05_-_Too_Grimey.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400&auto=format&fit=crop',
      price: 39.99,
    },
    {
      id: '5',
      title: 'Synthwave Night',
      artist: 'Retro Future',
      username: 'retrofuture',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Jahzzar/Tumbling_Dishes_Like_Old-Mans_Wishes/Jahzzar_-_05_-_Siesta.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
      price: 24.99,
    },
    {
      id: '6',
      title: 'Amapiano Groove',
      artist: 'DJ Maphorisa',
      username: 'djmaphorisa',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/KieLoKaz/Free_Gan/KieLoKaz_-_01_-_Reunion_of_the_Spirits.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=400&auto=format&fit=crop',
      price: 49.99,
    },
    {
      id: '7',
      title: 'Highlife Essence',
      artist: 'Kwame Beats',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Shipping_Lanes.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&auto=format&fit=crop',
      price: 29.99,
    },
    {
      id: '8',
      title: 'Dancehall King',
      artist: 'Vybz Master',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Scott_Holmes/Inspiring__Upbeat_Music/Scott_Holmes_-_05_-_Little_Idea.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1520166012956-add9ba0835bc?q=80&w=400&auto=format&fit=crop',
      price: 34.99,
    },
    {
      id: '9',
      title: 'R&B Smooth',
      artist: 'Silky T',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kai_Engel/Chapter_Two_-_Mild/Kai_Engel_-_08_-_Daemones.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1459749411177-0473ef716175?q=80&w=400&auto=format&fit=crop',
      price: 24.99,
    },
    {
      id: '10',
      title: 'Hip Hop Classic',
      artist: 'Old School',
      audioUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=400&auto=format&fit=crop',
      price: 19.99,
    },
  ];

  const extendedBeats: Track[] = [];
  const genres = ['Trap', 'Drill', 'Afrobeats', 'Lo-Fi', 'Synthwave', 'Amapiano', 'Highlife', 'Dancehall', 'R&B', 'Hip Hop'];
  const moods = ['Chill', 'Aggressive', 'Upbeat', 'Dark', 'Happy', 'Sad', 'Energetic', 'Mellow'];

  // Generate 50 beats by mixing base beats
  for (let i = 0; i < 50; i++) {
    const base = baseBeats[i % baseBeats.length];
    const genre = genres[i % genres.length];
    const mood = moods[i % moods.length];
    
    // Use modulo for deterministic pseudo-randomness
    const priceOffset = (i * 7) % 20; 
    
    extendedBeats.push({
      id: `${i + 1}`,
      title: `${mood} ${genre} ${i + 1}`,
      artist: `Producer ${Math.floor(i / 5) + 1}`,
      audioUrl: base.audioUrl, // Reuse reliable audio URLs
      coverUrl: `https://images.unsplash.com/photo-${[
        '1514525253440-b393452e8d26', 
        '1470225620780-dba8ba36b745', 
        '1511379938547-c1f69419868d', 
        '1493225255756-d9584f8606e9', 
        '1511671782779-c97d3d27a1d4',
        '1516280440614-6697288d5d38',
        '1508700115892-45ecd05ae2ad',
        '1520166012956-add9ba0835bc',
        '1459749411177-0473ef716175',
        '1498038432885-c6f3f1b912ee'
      ][i % 10]}?q=80&w=400&auto=format&fit=crop`,
      // Deterministic price calculation instead of Math.random()
      price: 19.99 + priceOffset,
    });
  }

  return extendedBeats;
};

export const dummyBeats: Track[] = generateBeats();
