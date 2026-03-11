-- Create public read policies for matches and players
CREATE POLICY "Anyone can view matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Anyone can view players" ON players FOR SELECT USING (true);