# Leaderboard Visibility Toggle Setup

This feature allows the admin to show or hide the leaderboard tab from regular users while admins can always see it.

## Database Setup

You need to run the SQL commands in the `create_app_settings_table.sql` file in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open the `create_app_settings_table.sql` file
4. Copy and paste the SQL code into the SQL editor
5. Click "Run" to execute the SQL

This will:
- Create the `app_settings` table
- Insert the default setting for leaderboard visibility (set to `true` by default)
- Set up Row Level Security (RLS) policies:
  - Everyone can read settings
  - Only admins can update settings

## How It Works

### Admin Panel
- In the Admin tab, there's a new "App Settings" section at the top
- Click the button to toggle leaderboard visibility
- Green "Visible" = users can see the leaderboard tab
- Red "Hidden" = only admins can see the leaderboard tab

### For Regular Users
- When leaderboard is hidden, the "Leaderboard" tab disappears from the navigation
- When leaderboard is visible, they can access it normally

### For Admin Users
- Admins can always see and access the Leaderboard tab regardless of the setting
- This allows admins to check the leaderboard even when it's hidden from users

## Real-time Updates
- Changes to the leaderboard visibility are reflected in real-time
- When admin toggles the setting, all users' UIs update automatically without page refresh
