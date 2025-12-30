import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

interface User {
  id: string
  username: string
  avatar_url: string | null
  total_points: number
}

export function Leaderboard() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    loadLeaderboard()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('users-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadLeaderboard()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadLeaderboard = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, total_points')
      .eq('is_admin', false)
      .order('total_points', { ascending: false })

    if (!error && data) {
      setUsers(data)
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

  const getBackgroundColor = (index: number) => {
    if (index === 0) return '#FFD700' // Gold
    if (index === 1) return '#C0C0C0' // Silver
    if (index === 2) return '#CD7F32' // Bronze
    return 'white'
  }

  return (
    <div style={styles.container}>
      <div style={styles.leaderboard}>
        {users.map((user, index) => (
          <div
            key={user.id}
            style={{
              ...styles.row,
              backgroundColor: getBackgroundColor(index),
              filter: index < 3 ? 'blur(12px)' : 'none',
              transition: 'filter 0.3s ease',
              userSelect: index < 3 && !profile?.is_admin ? 'none' : 'auto',
              pointerEvents: index < 3 && !profile?.is_admin ? 'none' : 'auto',
            }}
            onMouseEnter={
              profile?.is_admin
                ? (e) => {
                    if (index < 3) {
                      e.currentTarget.style.filter = 'blur(0px)'
                    }
                  }
                : undefined
            }
            onMouseLeave={
              profile?.is_admin
                ? (e) => {
                    if (index < 3) {
                      e.currentTarget.style.filter = 'blur(12px)'
                    }
                  }
                : undefined
            }
          >
            <div style={styles.rank}>
              {index === 0 && (
                <img
                  src="https://xpclass.vn/leaderboard/icon/gold.svg"
                  alt="Gold"
                  style={styles.medalIcon}
                />
              )}
              {index === 1 && (
                <img
                  src="https://xpclass.vn/leaderboard/icon/silver.svg"
                  alt="Silver"
                  style={styles.medalIcon}
                />
              )}
              {index === 2 && (
                <img
                  src="https://xpclass.vn/leaderboard/icon/bronze.svg"
                  alt="Bronze"
                  style={styles.medalIcon}
                />
              )}
              {index > 2 && `#${index + 1}`}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.avatarContainer}>
                {user.avatar_url ? (
                  <>
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      style={styles.avatar}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = target.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div style={{ ...styles.avatarFallback, display: 'none' }}>
                      {getInitials(user.username)}
                    </div>
                  </>
                ) : (
                  <div style={styles.avatarFallback}>
                    {getInitials(user.username)}
                  </div>
                )}
              </div>
              <span style={styles.username}>{user.username}</span>
            </div>
            <div style={styles.points}>{user.total_points}</div>
          </div>
        ))}

        {users.length === 0 && (
          <div style={styles.noData}>No users yet</div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '5px',
  },
  heading: {
    fontSize: '28px',
    marginBottom: '30px',
    color: '#333',
    textAlign: 'center',
  },
  leaderboard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 100px',
    padding: '15px 10px',
    borderBottom: '1px solid #ddd',
    alignItems: 'center',
  },
  rank: {
    fontSize: '22px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalIcon: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
  },
  userColumn: {
    fontSize: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
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
    fontSize: '18px',
    border: '2px solid #007bff',
  },
  username: {
    fontSize: '18px',
    fontWeight: '500',
  },
  points: {
    fontSize: '22px',
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#007bff',
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
}
