import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

interface User {
  id: string
  username: string
  avatar_url: string | null
}

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

interface BetStatus {
  user_id: string
  username: string
  avatar_url: string | null
  has_bet: boolean
}

export function AdminPanel() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [betStatuses, setBetStatuses] = useState<Record<string, BetStatus[]>>({})
  const [leaderboardVisible, setLeaderboardVisible] = useState(true)

  // Form state for creating match
  const [team1Player1, setTeam1Player1] = useState('')
  const [team1Player2, setTeam1Player2] = useState('')
  const [team2Player1, setTeam2Player1] = useState('')
  const [team2Player2, setTeam2Player2] = useState('')

  // Form state for completing match
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [winnerTeam, setWinnerTeam] = useState<number>(1)
  const [isBigScore, setIsBigScore] = useState(false)

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .order('username')

    if (!error && data) {
      setUsers(data)
    }
  }

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setMatches(data)
    }
  }

  const loadLeaderboardSetting = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'leaderboard_visible')
      .single()

    if (!error && data) {
      setLeaderboardVisible(data.value)
    }
  }

  const toggleLeaderboardVisibility = async () => {
    setLoading(true)
    try {
      const newValue = !leaderboardVisible

      const { error } = await supabase
        .from('app_settings')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('key', 'leaderboard_visible')

      if (error) throw error

      setLeaderboardVisible(newValue)
      alert(`Leaderboard is now ${newValue ? 'visible' : 'hidden'} to users`)
    } catch (err: any) {
      alert('Error toggling leaderboard visibility: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadBetStatuses = useCallback(async () => {
    if (users.length === 0 || matches.length === 0) return

    const openMatches = matches.filter((m) => m.status === 'open' || m.status === 'closed')
    const statuses: Record<string, BetStatus[]> = {}

    for (const match of openMatches) {
      // Get all bets for this match
      const { data: bets } = await supabase
        .from('bets')
        .select('user_id')
        .eq('match_id', match.id)

      const bettorIds = new Set(bets?.map((b) => b.user_id) || [])

      // Get all users who can bet (exclude the 4 players in the match)
      const eligibleUsers = users.filter((user) => {
        const username = user.username
        return (
          username !== match.team1_player1 &&
          username !== match.team1_player2 &&
          username !== match.team2_player1 &&
          username !== match.team2_player2 &&
          !user.id.includes('admin') // Optionally exclude admin
        )
      })

      statuses[match.id] = eligibleUsers.map((user) => ({
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatar_url || null,
        has_bet: bettorIds.has(user.id),
      }))
    }

    setBetStatuses(statuses)
  }, [users, matches])

  useEffect(() => {
    loadUsers()
    loadMatches()
    loadLeaderboardSetting()

    // Subscribe to real-time updates for matches and bets
    const matchesSubscription = supabase
      .channel('admin-matches-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadMatches()
      })
      .subscribe()

    const betsSubscription = supabase
      .channel('admin-bets-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
        // Reload matches and users to ensure we have latest data
        loadMatches()
        loadUsers()
      })
      .subscribe()

    const settingsSubscription = supabase
      .channel('admin-settings-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        loadLeaderboardSetting()
      })
      .subscribe()

    return () => {
      matchesSubscription.unsubscribe()
      betsSubscription.unsubscribe()
      settingsSubscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadBetStatuses()
  }, [loadBetStatuses])

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const createMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('matches').insert({
        team1_player1: team1Player1,
        team1_player2: team1Player2,
        team2_player1: team2Player1,
        team2_player2: team2Player2,
        status: 'open',
      })

      if (error) throw error

      alert('Match created successfully!')
      setTeam1Player1('')
      setTeam1Player2('')
      setTeam2Player1('')
      setTeam2Player2('')
      loadMatches()
    } catch (err: any) {
      alert('Error creating match: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const completeMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First, get all bets for this match
      const { data: bets, error: betsError } = await supabase
        .from('bets')
        .select('id, user_id, predicted_winner, predicted_big_score')
        .eq('match_id', selectedMatch)

      if (betsError) throw betsError

      // Calculate points for each bet
      if (bets) {
        for (const bet of bets) {
          let points = 0

          // Check winner prediction (5 points)
          if (bet.predicted_winner === winnerTeam) {
            points += 5

            // Check score type prediction (3 points, only if winner is correct)
            if (bet.predicted_big_score === isBigScore) {
              points += 3
            }
          }

          // Update bet with points earned
          await supabase
            .from('bets')
            .update({ points_earned: points })
            .eq('id', bet.id)

          // Update user's total points
          await supabase.rpc('increment_user_points', {
            user_id: bet.user_id,
            points: points,
          })
        }
      }

      // Update match status and result
      const { error } = await supabase
        .from('matches')
        .update({
          winner_team: winnerTeam,
          is_big_score: isBigScore,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', selectedMatch)

      if (error) throw error

      alert('Match completed and points awarded!')
      setSelectedMatch('')
      loadMatches()
    } catch (err: any) {
      alert('Error completing match: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const closeMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to close this match? Users will no longer be able to place bets.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'closed' })
        .eq('id', matchId)

      if (error) throw error

      alert('Match closed successfully!')
      loadMatches()
    } catch (err: any) {
      alert('Error closing match: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!profile?.is_admin) {
    return <div style={styles.error}>Access denied. Admin only.</div>
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Admin Panel</h2>

      {/* App Settings */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>App Settings</h3>
        <div style={styles.settingsContainer}>
          <div style={styles.settingRow}>
            <span style={styles.settingLabel}>
              Leaderboard visibility for users:
            </span>
            <button
              onClick={toggleLeaderboardVisibility}
              disabled={loading}
              style={{
                ...styles.toggleButton,
                backgroundColor: leaderboardVisible ? '#28a745' : '#dc3545',
              }}
            >
              {leaderboardVisible ? 'Visible' : 'Hidden'}
            </button>
          </div>
        </div>
      </div>

      {/* Create Match Form */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Create New Match</h3>
        <form onSubmit={createMatch} style={styles.form}>
          <div style={styles.teamContainer}>
            <div style={styles.team}>
              <h4>Team 1</h4>
              <select
                value={team1Player1}
                onChange={(e) => setTeam1Player1(e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Select Player 1</option>
                {users.map((user) => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
              <select
                value={team1Player2}
                onChange={(e) => setTeam1Player2(e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Select Player 2</option>
                {users.map((user) => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.team}>
              <h4>Team 2</h4>
              <select
                value={team2Player1}
                onChange={(e) => setTeam2Player1(e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Select Player 1</option>
                {users.map((user) => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
              <select
                value={team2Player2}
                onChange={(e) => setTeam2Player2(e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Select Player 2</option>
                {users.map((user) => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating...' : 'Create Match'}
          </button>
        </form>
      </div>

      {/* Complete Match Form */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Complete Match</h3>
        <form onSubmit={completeMatch} style={styles.form}>
          <select
            value={selectedMatch}
            onChange={(e) => setSelectedMatch(e.target.value)}
            required
            style={styles.select}
          >
            <option value="">Select Match</option>
            {matches
              .filter((m) => m.status === 'open' || m.status === 'closed')
              .map((match) => (
                <option key={match.id} value={match.id}>
                  {match.team1_player1} & {match.team1_player2} vs {match.team2_player1} &{' '}
                  {match.team2_player2} ({match.status.toUpperCase()})
                </option>
              ))}
          </select>

          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="1"
                checked={winnerTeam === 1}
                onChange={() => setWinnerTeam(1)}
              />
              Team 1 Won
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="2"
                checked={winnerTeam === 2}
                onChange={() => setWinnerTeam(2)}
              />
              Team 2 Won
            </label>
          </div>

          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={!isBigScore}
                onChange={() => setIsBigScore(false)}
              />
              Small Score (other)
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={isBigScore}
                onChange={() => setIsBigScore(true)}
              />
              Big Score (11-9, 11-8)
            </label>
          </div>

          <button type="submit" disabled={loading || !selectedMatch} style={styles.button}>
            {loading ? 'Completing...' : 'Complete Match & Award Points'}
          </button>
        </form>
      </div>

      {/* Bet Control Panel */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Bet Control - Who Has Bet</h3>
        <div style={styles.betControlList}>
          {matches
            .filter((m) => m.status === 'open' || m.status === 'closed')
            .map((match) => {
              const matchBetStatuses = betStatuses[match.id] || []
              const betCount = matchBetStatuses.filter((s) => s.has_bet).length
              const totalCount = matchBetStatuses.length

              return (
                <div key={match.id} style={styles.betControlCard}>
                  <div style={styles.betControlHeader}>
                    <div>
                      <strong>
                        {match.team1_player1} & {match.team1_player2} vs {match.team2_player1} &{' '}
                        {match.team2_player2}
                      </strong>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: match.status === 'open' ? '#28a745' : '#6c757d',
                          marginLeft: '10px',
                        }}
                      >
                        {match.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={styles.betControlActions}>
                      <div style={styles.betCount}>
                        {betCount} / {totalCount} bets placed
                      </div>
                      {match.status === 'open' && (
                        <button
                          onClick={() => closeMatch(match.id)}
                          disabled={loading}
                          style={styles.closeButton}
                        >
                          Close Betting
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={styles.avatarGrid}>
                    {matchBetStatuses.map((status) => (
                      <div key={status.user_id} style={styles.avatarItem}>
                        <div
                          style={{
                            ...styles.avatarContainer,
                            opacity: status.has_bet ? 1 : 0.3,
                          }}
                        >
                          {status.avatar_url ? (
                            <>
                              <img
                                src={status.avatar_url}
                                alt={status.username}
                                style={styles.avatar}
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement
                                  target.style.display = 'none'
                                  const fallback = target.nextElementSibling as HTMLElement
                                  if (fallback) fallback.style.display = 'flex'
                                }}
                              />
                              <div style={{ ...styles.avatarFallback, display: 'none' }}>
                                {getInitials(status.username)}
                              </div>
                            </>
                          ) : (
                            <div style={styles.avatarFallback}>
                              {getInitials(status.username)}
                            </div>
                          )}
                        </div>
                        <div style={styles.avatarName}>{status.username}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          {matches.filter((m) => m.status === 'open' || m.status === 'closed').length === 0 && (
            <div style={styles.noBetControl}>No open or closed matches</div>
          )}
        </div>
      </div>

      {/* Matches List */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>All Matches</h3>
        <div style={styles.matchesList}>
          {matches.map((match) => (
            <div key={match.id} style={styles.matchCard}>
              <div style={styles.matchInfo}>
                <strong>
                  {match.team1_player1} & {match.team1_player2}
                </strong>{' '}
                vs{' '}
                <strong>
                  {match.team2_player1} & {match.team2_player2}
                </strong>
              </div>
              <div style={styles.matchStatus}>
                Status: <span style={styles.badge}>{match.status.toUpperCase()}</span>
              </div>
              {match.status === 'completed' && (
                <div style={styles.matchResult}>
                  Winner: Team {match.winner_team} | Score:{' '}
                  {match.is_big_score ? 'Big (11-9, 11-8)' : 'Small (other)'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
  subheading: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#555',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  settingsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  settingLabel: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
  },
  toggleButton: {
    padding: '8px 20px',
    fontSize: '14px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    minWidth: '80px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  teamContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  team: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  select: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
  },
  matchesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  matchCard: {
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#f9f9f9',
  },
  matchInfo: {
    fontSize: '16px',
    marginBottom: '8px',
  },
  matchStatus: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px',
  },
  matchResult: {
    fontSize: '14px',
    color: '#28a745',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '12px',
  },
  error: {
    color: '#dc3545',
    fontSize: '18px',
    textAlign: 'center',
    marginTop: '50px',
  },
  betControlList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  betControlCard: {
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
  },
  betControlHeader: {
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  betControlActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  betCount: {
    fontSize: '14px',
    color: '#007bff',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: '6px 12px',
    fontSize: '13px',
    backgroundColor: '#ffc107',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
  },
  avatarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
    gap: '15px',
  },
  avatarItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  avatarContainer: {
    position: 'relative',
    width: '50px',
    height: '50px',
    flexShrink: 0,
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #007bff',
  },
  avatarFallback: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    border: '2px solid #007bff',
  },
  avatarName: {
    fontSize: '12px',
    textAlign: 'center',
    color: '#333',
    wordBreak: 'break-word',
    maxWidth: '70px',
  },
  noBetControl: {
    textAlign: 'center',
    color: '#666',
    padding: '20px',
    fontStyle: 'italic',
  },
}
