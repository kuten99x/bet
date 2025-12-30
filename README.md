# Real-Time Betting App

A real-time betting application built with React and Supabase for a group of 17 people (1 admin + 16 users).

## Features

- **User Authentication**: Sign up/Sign in with email and password
- **Admin Panel**:
  - Create matches with 2 vs 2 teams
  - Complete matches and award points automatically
  - View all matches and their status
- **Betting System**:
  - Bet on which team will win (5 points if correct)
  - Bet on score type: Big (11-9, 10-8) or Small (other scores) (3 extra points if correct AND winner is correct)
  - Players in a match cannot bet on that match
- **Real-time Updates**: All changes sync instantly across all users
- **Leaderboard**: Track points and rankings of all users

## Scoring Rules

- **Correct Winner**: 5 points
- **Correct Score Type** (only if winner is correct): 3 points
- **Wrong Winner**: 0 points
- **Maximum per bet**: 8 points (5 + 3)

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Inline styles (no external CSS framework)

## Setup Instructions

### 1. Install Dependencies

```bash
cd betting-app
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Run the SQL setup from `SUPABASE_SETUP.md` in your Supabase SQL Editor
4. Copy `.env.example` to `.env` and add your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Run the App

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 4. Create Admin User

1. Sign up for a new account in the app
2. In Supabase SQL Editor, run:

```sql
UPDATE users SET is_admin = true WHERE email = 'your_admin_email@example.com';
```

3. Refresh the app to see the Admin Panel

## How to Use

### For Admin

1. **Create a Match**:
   - Go to Admin Panel
   - Select 4 players (2 for each team)
   - Click "Create Match"

2. **Complete a Match**:
   - Select the match from the dropdown
   - Choose winning team
   - Select score type (Big or Small)
   - Click "Complete Match & Award Points"
   - Points are automatically calculated and awarded

### For Users

1. **Place a Bet**:
   - Go to "Matches & Betting"
   - Find an open match (where you're not playing)
   - Select your predictions:
     - Which team will win
     - Whether score will be big or small
   - Click "Place Bet"

2. **View Results**:
   - Completed matches show the actual result
   - Your bet and points earned are displayed

3. **Check Rankings**:
   - Go to "Leaderboard" to see all players ranked by points

## Database Schema

### Users Table
- `id`: UUID (primary key)
- `email`: Text (unique)
- `username`: Text (unique)
- `is_admin`: Boolean
- `total_points`: Integer
- `created_at`: Timestamp

### Matches Table
- `id`: UUID (primary key)
- `team1_player1`, `team1_player2`: Text
- `team2_player1`, `team2_player2`: Text
- `winner_team`: Integer (1 or 2)
- `is_big_score`: Boolean
- `status`: Text (open, closed, completed)
- `created_at`, `completed_at`: Timestamp

### Bets Table
- `id`: UUID (primary key)
- `match_id`: UUID (foreign key)
- `user_id`: UUID (foreign key)
- `predicted_winner`: Integer (1 or 2)
- `predicted_big_score`: Boolean
- `points_earned`: Integer
- `created_at`: Timestamp

## Real-time Features

The app uses Supabase Realtime to instantly update:
- New matches appear immediately
- Match status changes sync across all users
- Points update in real-time on the leaderboard
- Bets are visible as they're placed

## Security

- Row Level Security (RLS) enabled on all tables
- Only admins can create and complete matches
- Users can only create bets for themselves
- Users can only update their own profile
- All data is validated on the database level

## Development

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## License

MIT
