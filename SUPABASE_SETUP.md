# Supabase Setup Instructions

## 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Save your project URL and anon key

## 2. Run the following SQL in your Supabase SQL Editor

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team1_player1 TEXT NOT NULL,
  team1_player2 TEXT NOT NULL,
  team2_player1 TEXT NOT NULL,
  team2_player2 TEXT NOT NULL,
  winner_team INTEGER CHECK (winner_team IN (1, 2)),
  is_big_score BOOLEAN,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create bets table
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_winner INTEGER NOT NULL CHECK (predicted_winner IN (1, 2)),
  predicted_big_score BOOLEAN NOT NULL,
  points_earned INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Matches policies
CREATE POLICY "Anyone can view matches" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Only admins can create matches" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Only admins can update matches" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Bets policies
CREATE POLICY "Users can view all bets" ON bets
  FOR SELECT USING (true);

CREATE POLICY "Users can create own bets" ON bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cannot update bets" ON bets
  FOR UPDATE USING (false);

-- Function to update user points after match completion
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total points for all users who bet on this match
  UPDATE users u
  SET total_points = total_points + COALESCE(b.points_earned, 0)
  FROM bets b
  WHERE b.user_id = u.id AND b.match_id = NEW.id AND b.points_earned IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update points when match is completed
CREATE TRIGGER update_points_on_match_complete
AFTER UPDATE OF status ON matches
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_user_points();

-- Function to calculate bet points
CREATE OR REPLACE FUNCTION calculate_bet_points(
  bet_id UUID,
  winner INTEGER,
  big_score BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  bet_record RECORD;
  points INTEGER := 0;
BEGIN
  SELECT * INTO bet_record FROM bets WHERE id = bet_id;

  -- Check if winner prediction is correct
  IF bet_record.predicted_winner = winner THEN
    points := points + 5;

    -- Check if score type prediction is correct (only if winner is correct)
    IF bet_record.predicted_big_score = big_score THEN
      points := points + 3;
    END IF;
  END IF;

  RETURN points;
END;
$$ LANGUAGE plpgsql;

-- Function to increment user points
CREATE OR REPLACE FUNCTION increment_user_points(user_id UUID, points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET total_points = total_points + points
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE bets;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

## 3. Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Add your Supabase URL and anon key to `.env`

## 4. Create Admin User
After creating your first user through the app, run this SQL to make them admin:

```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

## 5. Add User Avatars (Optional)

If you already created the database before avatars were added, run this SQL to add the avatar_url column:

```sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
```

Then you can set avatars for users:

```sql
-- Set avatar for a user
UPDATE users SET avatar_url = 'https://example.com/avatar.jpg' WHERE username = 'player1';
```

You can use any image URL. Some free avatar services:
- [UI Avatars](https://ui-avatars.com/) - Generate avatar from initials
- [DiceBear](https://dicebear.com/) - Generate random avatars
- Upload images to Supabase Storage and use those URLs
