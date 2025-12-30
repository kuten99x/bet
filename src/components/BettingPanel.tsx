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
}

interface UserAvatar {
  username: string
  avatar_url: string | null
}

interface Bet {
  id: string
  match_id: string
  user_id: string
  predicted_winner: number
  predicted_big_score: boolean
  points_earned: number | null
}

export function BettingPanel() {
  const { user, profile } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [myBets, setMyBets] = useState<Bet[]>([])
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(false)
  const [previousBets, setPreviousBets] = useState<Bet[]>([])

  useEffect(() => {
    loadMatches()
    loadMyBets()
    loadUserAvatars()

    // Subscribe to real-time updates
    const matchesSubscription = supabase
      .channel('matches-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadMatches()
      })
      .subscribe()

    const betsSubscription = supabase
      .channel('bets-channel')
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

  // Check for points earned and play sound
  useEffect(() => {
    if (previousBets.length === 0) {
      setPreviousBets(myBets)
      return
    }

    myBets.forEach((currentBet) => {
      const prevBet = previousBets.find((b) => b.id === currentBet.id)

      // If bet just got points (was null before, now has points)
      if (prevBet && prevBet.points_earned === null && currentBet.points_earned !== null) {
        if (currentBet.points_earned > 0) {
          playSound()
        }
      }
    })

    setPreviousBets(myBets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBets])

  const playSound = () => {
    try {
      const audio = new Audio('https://xpclass.vn/tournament/ka-ching.mp3')
      audio.volume = 0.5
      audio.play().catch(error => {
        console.log('Could not play sound:', error)
      })
    } catch (error) {
      console.log('Could not play sound:', error)
    }
  }

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

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

  const loadUserAvatars = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('username, avatar_url')

    if (!error && data) {
      const avatarMap: Record<string, string | null> = {}
      data.forEach((user: UserAvatar) => {
        avatarMap[user.username] = user.avatar_url
      })
      setUserAvatars(avatarMap)
    }
  }

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const placeBet = async (
    matchId: string,
    predictedWinner: number,
    predictedBigScore: boolean
  ) => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase.from('bets').insert({
        match_id: matchId,
        user_id: user.id,
        predicted_winner: predictedWinner,
        predicted_big_score: predictedBigScore,
      })

      if (error) throw error

      alert('Bet placed successfully!')
      loadMyBets()
    } catch (err: any) {
      alert('Error placing bet: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const canBetOnMatch = (match: Match) => {
    // Check if user is playing in this match
    if (!profile) return false

    const username = profile.username
    if (
      match.team1_player1 === username ||
      match.team1_player2 === username ||
      match.team2_player1 === username ||
      match.team2_player2 === username
    ) {
      return false
    }

    // Check if match is open
    if (match.status !== 'open') return false

    // Check if user already bet on this match
    const alreadyBet = myBets.some((bet) => bet.match_id === match.id)
    return !alreadyBet
  }

  const getBetForMatch = (matchId: string) => {
    return myBets.find((bet) => bet.match_id === matchId)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Current Matches</h2>

      <div style={styles.matchesList}>
        {matches.map((match) => {
          const canBet = canBetOnMatch(match)
          const myBet = getBetForMatch(match.id)
          const isPlaying =
            profile &&
            (match.team1_player1 === profile.username ||
              match.team1_player2 === profile.username ||
              match.team2_player1 === profile.username ||
              match.team2_player2 === profile.username)

          return (
            <MatchCard
              key={match.id}
              match={match}
              canBet={canBet}
              myBet={myBet}
              isPlaying={isPlaying || false}
              onPlaceBet={placeBet}
              loading={loading}
              userAvatars={userAvatars}
              getInitials={getInitials}
            />
          )
        })}
      </div>

      {matches.length === 0 && (
        <p style={styles.noMatches}>No current matches. Check the History tab for past matches.</p>
      )}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  canBet: boolean
  myBet?: Bet
  isPlaying: boolean
  onPlaceBet: (matchId: string, winner: number, bigScore: boolean) => void
  loading: boolean
  userAvatars: Record<string, string | null>
  getInitials: (username: string) => string
}

function MatchCard({ match, canBet, myBet, isPlaying, onPlaceBet, loading, userAvatars, getInitials }: MatchCardProps) {
  const [selectedWinner, setSelectedWinner] = useState<number>(1)
  const [selectedBigScore, setSelectedBigScore] = useState<boolean>(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onPlaceBet(match.id, selectedWinner, selectedBigScore)
  }

  const renderPlayer = (username: string) => {
    const avatarUrl = userAvatars[username]
    return (
      <div style={styles.playerContainer}>
        <div style={styles.avatarContainer}>
          {avatarUrl ? (
            <>
              <img
                src={avatarUrl}
                alt={username}
                style={styles.avatar}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div style={{ ...styles.avatarFallback, display: 'none' }}>
                {getInitials(username)}
              </div>
            </>
          ) : (
            <div style={styles.avatarFallback}>
              {getInitials(username)}
            </div>
          )}
        </div>
        <span style={styles.playerName}>{username}</span>
      </div>
    )
  }

  return (
    <div style={styles.matchCard}>
      <div style={styles.matchHeader}>
        <div style={styles.teams}>
          <div style={styles.team}>
            <div style={styles.teamLabel}>Team 1</div>
            <div style={styles.playersGroup}>
              {renderPlayer(match.team1_player1)}
              {renderPlayer(match.team1_player2)}
            </div>
          </div>
          <div style={styles.vs}>VS</div>
          <div style={styles.team}>
            <div style={styles.teamLabel}>Team 2</div>
            <div style={styles.playersGroup}>
              {renderPlayer(match.team2_player1)}
              {renderPlayer(match.team2_player2)}
            </div>
          </div>
        </div>
        <div style={styles.status}>
          <span
            style={{
              ...styles.badge,
              backgroundColor:
                match.status === 'completed' ? '#28a745' : match.status === 'open' ? '#007bff' : '#ffc107',
            }}
          >
            {match.status.toUpperCase()}
          </span>
        </div>
      </div>

      {isPlaying && <div style={styles.playingNotice}>You are playing in this match</div>}

      {myBet && (
        <div style={styles.betInfo}>
          <strong>Your Bet:</strong>
          <div>Winner: Team {myBet.predicted_winner}</div>
          <div>Score: {myBet.predicted_big_score ? 'Big (11-9, 11-8)' : 'Small (other)'}</div>
          {myBet.points_earned !== null && (
            <div style={styles.points}>Points Earned: {myBet.points_earned}</div>
          )}
        </div>
      )}

      {match.status === 'completed' && (
        <div style={styles.result}>
          <strong>Result:</strong>
          <div>Winner: Team {match.winner_team}</div>
          <div>Score: {match.is_big_score ? 'Big (11-9, 11-8)' : 'Small (other)'}</div>
        </div>
      )}

      {!canBet && !myBet && !isPlaying && match.status === 'open' && (
        <div style={styles.cannotBetNotice}>
          You have already placed a bet on this match
        </div>
      )}

      {!canBet && !myBet && !isPlaying && match.status !== 'open' && (
        <div style={styles.cannotBetNotice}>
          Betting is closed for this match
        </div>
      )}

      {canBet && (
        <form onSubmit={handleSubmit} style={styles.betForm}>
          <h4 style={styles.betFormTitle}>Place Your Bet</h4>

          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="1"
                checked={selectedWinner === 1}
                onChange={() => setSelectedWinner(1)}
              />
              Team 1 Wins
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="2"
                checked={selectedWinner === 2}
                onChange={() => setSelectedWinner(2)}
              />
              Team 2 Wins
            </label>
          </div>

          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={!selectedBigScore}
                onChange={() => setSelectedBigScore(false)}
              />
              Small Score (other)
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={selectedBigScore}
                onChange={() => setSelectedBigScore(true)}
              />
              Big Score (11-9, 11-8)
            </label>
          </div>

          <button type="submit" disabled={loading} style={styles.betButton}>
            {loading ? 'Placing Bet...' : 'Place Bet'}
          </button>
        </form>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '10px',
  },
  heading: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#333',
  },
  instructions: {
    backgroundColor: '#e7f3ff',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  instructionsTitle: {
    margin: '0 0 15px 0',
    fontSize: '20px',
    color: '#0056b3',
  },
  instructionsList: {
    margin: '0',
    paddingLeft: '20px',
    lineHeight: '1.8',
  },
  matchesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  matchCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
  },
  matchHeader: {
    marginBottom: '15px',
  },
  teams: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '15px',
    alignItems: 'center',
    marginBottom: '12px',
  },
  team: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  teamLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '2px',
  },
  playersGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  playerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  avatarContainer: {
    position: 'relative',
    width: '35px',
    height: '35px',
    flexShrink: 0,
  },
  avatar: {
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #007bff',
  },
  avatarFallback: {
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    border: '2px solid #007bff',
  },
  playerName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#333',
  },
  vs: {
    fontWeight: 'bold',
    fontSize: '18px',
    color: '#007bff',
    padding: '6px 12px',
    backgroundColor: '#e7f3ff',
    borderRadius: '6px',
  },
  status: {
    display: 'flex',
    justifyContent: 'center',
  },
  badge: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  playingNotice: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    textAlign: 'center',
  },
  cannotBetNotice: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginTop: '15px',
    textAlign: 'center',
  },
  betInfo: {
    backgroundColor: '#e7f3ff',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  points: {
    marginTop: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#28a745',
  },
  result: {
    backgroundColor: '#d4edda',
    padding: '15px',
    borderRadius: '4px',
    marginTop: '15px',
  },
  betForm: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '12px',
  },
  betFormTitle: {
    marginTop: '0',
    marginBottom: '12px',
    fontSize: '14px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  betButton: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  noMatches: {
    textAlign: 'center',
    color: '#666',
    fontSize: '18px',
    marginTop: '50px',
  },
}
