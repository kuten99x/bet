import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

interface Match {
  id: string
  team1_player1: string
  team1_player2: string
  team2_player1: string
  team2_player2: string
  winner_team: number | null
  is_big_score: boolean | null
  status: string
  created_at: string
  completed_at: string | null
}

interface Bet {
  id: string
  match_id: string
  user_id: string
  predicted_winner: number
  predicted_big_score: boolean
  points_earned: number | null
}

export function History() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [myBets, setMyBets] = useState<Bet[]>([])

  useEffect(() => {
    loadCompletedMatches()
    loadMyBets()

    // Subscribe to real-time updates
    const matchesSubscription = supabase
      .channel('history-matches-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadCompletedMatches()
      })
      .subscribe()

    const betsSubscription = supabase
      .channel('history-bets-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bets', filter: `user_id=eq.${user?.id}` },
        () => {
          loadMyBets()
        }
      )
      .subscribe()

    return () => {
      matchesSubscription.unsubscribe()
      betsSubscription.unsubscribe()
    }
  }, [user])

  const loadCompletedMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (!error && data) {
      setMatches(data)
    }
  }

  const loadMyBets = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)

    if (!error && data) {
      setMyBets(data)
    }
  }

  const getBetForMatch = (matchId: string) => {
    return myBets.find((bet) => bet.match_id === matchId)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Match History</h2>

      <div style={styles.matchesList}>
        {matches.map((match) => {
          const myBet = getBetForMatch(match.id)

          return (
            <div key={match.id} style={styles.matchCard}>
              <div style={styles.matchHeader}>
                <div style={styles.teams}>
                  <div style={styles.team}>
                    <strong>Team 1</strong>
                    <div>
                      {match.team1_player1} & {match.team1_player2}
                    </div>
                  </div>
                  <div style={styles.vs}>VS</div>
                  <div style={styles.team}>
                    <strong>Team 2</strong>
                    <div>
                      {match.team2_player1} & {match.team2_player2}
                    </div>
                  </div>
                </div>
                <div style={styles.date}>
                  {new Date(match.completed_at!).toLocaleDateString()}
                </div>
              </div>

              <div style={styles.result}>
                <strong>Result:</strong>
                <div>Winner: Team {match.winner_team}</div>
                <div>Score: {match.is_big_score ? 'Big (11-9, 11-8)' : 'Small (other)'}</div>
              </div>

              {myBet && (
                <div style={styles.betInfo}>
                  <strong>Your Bet:</strong>
                  <div>Predicted Winner: Team {myBet.predicted_winner}</div>
                  <div>
                    Predicted Score: {myBet.predicted_big_score ? 'Big (11-9, 11-8)' : 'Small (other)'}
                  </div>
                  <div style={styles.points}>
                    Points Earned: {myBet.points_earned ?? 0}
                  </div>
                </div>
              )}

              {!myBet && (
                <div style={styles.noBet}>
                  You did not bet on this match
                </div>
              )}
            </div>
          )
        })}
      </div>

      {matches.length === 0 && (
        <p style={styles.noMatches}>No completed matches yet.</p>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  heading: {
    fontSize: '28px',
    marginBottom: '30px',
    color: '#333',
  },
  matchesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  matchCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  matchHeader: {
    marginBottom: '15px',
  },
  teams: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '20px',
    alignItems: 'center',
    marginBottom: '10px',
  },
  team: {
    textAlign: 'center',
  },
  vs: {
    fontWeight: 'bold',
    fontSize: '20px',
    color: '#666',
  },
  date: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
  },
  result: {
    backgroundColor: '#d4edda',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  betInfo: {
    backgroundColor: '#e7f3ff',
    padding: '15px',
    borderRadius: '4px',
  },
  points: {
    marginTop: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#28a745',
  },
  noBet: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  noMatches: {
    textAlign: 'center',
    color: '#666',
    fontSize: '18px',
    marginTop: '50px',
  },
}
