-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist_beats junction table
CREATE TABLE IF NOT EXISTS playlist_beats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  beat_id UUID REFERENCES beats(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, beat_id)
);

-- Set up Row Level Security (RLS) for playlists
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public playlists are viewable by everyone" 
  ON playlists FOR SELECT 
  USING (is_public = true);

CREATE POLICY "Users can view their own private playlists" 
  ON playlists FOR SELECT 
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own playlists" 
  ON playlists FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own playlists" 
  ON playlists FOR UPDATE 
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own playlists" 
  ON playlists FOR DELETE 
  USING (auth.uid() = creator_id);

-- Set up RLS for playlist_beats
ALTER TABLE playlist_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlist beats are viewable if playlist is viewable" 
  ON playlist_beats FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_beats.playlist_id 
      AND (playlists.is_public = true OR playlists.creator_id = auth.uid())
    )
  );

CREATE POLICY "Users can add beats to their own playlists" 
  ON playlist_beats FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove beats from their own playlists" 
  ON playlist_beats FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update beat position in their own playlists" 
  ON playlist_beats FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.creator_id = auth.uid()
    )
  );
