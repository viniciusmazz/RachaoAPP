-- Execute este SQL no Editor SQL do Supabase

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mensalista', 'convidado')),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  teams JSONB NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Players are insertable by everyone" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Players are updatable by everyone" ON players FOR UPDATE USING (true);
CREATE POLICY "Players are deletable by everyone" ON players FOR DELETE USING (true);

CREATE POLICY "Matches are viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Matches are insertable by everyone" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Matches are updatable by everyone" ON matches FOR UPDATE USING (true);
CREATE POLICY "Matches are deletable by everyone" ON matches FOR DELETE USING (true);