import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          is_admin: boolean
          total_points: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          avatar_url?: string | null
          is_admin?: boolean
          total_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          is_admin?: boolean
          total_points?: number
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          team1_player1: string
          team1_player2: string
          team2_player1: string
          team2_player2: string
          winner_team: number | null
          is_big_score: boolean | null
          status: 'open' | 'closed' | 'completed'
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          team1_player1: string
          team1_player2: string
          team2_player1: string
          team2_player2: string
          winner_team?: number | null
          is_big_score?: boolean | null
          status?: 'open' | 'closed' | 'completed'
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          team1_player1?: string
          team1_player2?: string
          team2_player1?: string
          team2_player2?: string
          winner_team?: number | null
          is_big_score?: boolean | null
          status?: 'open' | 'closed' | 'completed'
          created_at?: string
          completed_at?: string | null
        }
      }
      bets: {
        Row: {
          id: string
          match_id: string
          user_id: string
          predicted_winner: number
          predicted_big_score: boolean
          points_earned: number | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          user_id: string
          predicted_winner: number
          predicted_big_score: boolean
          points_earned?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          user_id?: string
          predicted_winner?: number
          predicted_big_score?: boolean
          points_earned?: number | null
          created_at?: string
        }
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
