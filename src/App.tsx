import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { AdminPanel } from './components/AdminPanel'
import { BettingPanel } from './components/BettingPanel'
import { Leaderboard } from './components/Leaderboard'
import { History } from './components/History'
import { supabase } from './supabaseClient'
import './App.css'

function AppContent() {
  const { user, profile, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'betting' | 'history' | 'leaderboard' | 'admin'>('betting')
  const [leaderboardVisible, setLeaderboardVisible] = useState(true)

  useEffect(() => {
    const loadLeaderboardSetting = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'leaderboard_visible')
        .single()

      if (!error && data) {
        const newVisibility = data.value
        setLeaderboardVisible(newVisibility)

        // If leaderboard is hidden and user is on leaderboard tab and not admin, redirect to betting
        if (!newVisibility && activeTab === 'leaderboard' && !profile?.is_admin) {
          setActiveTab('betting')
        }
      }
    }

    loadLeaderboardSetting()

    // Subscribe to real-time updates for settings
    const settingsSubscription = supabase
      .channel('app-settings-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        loadLeaderboardSetting()
      })
      .subscribe()

    return () => {
      settingsSubscription.unsubscribe()
    }
  }, [activeTab, profile?.is_admin])

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>Loading...</h2>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <img
            src="https://xpclass.vn/tournament/logo.png"
            alt="Logo"
            style={styles.logoImage}
          />
          <div style={styles.userInfo}>
            <span style={styles.username}>{profile?.username}</span>
            <span style={styles.points}>{profile?.total_points} pts</span>
            {profile?.is_admin && <span style={styles.adminBadge}>ADMIN</span>}
          </div>
          <button onClick={signOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </header>

      <nav style={styles.nav}>
        <button
          onClick={() => setActiveTab('betting')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'betting' ? styles.navButtonActive : {}),
          }}
        >
          Bet
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'history' ? styles.navButtonActive : {}),
          }}
        >
          History
        </button>
        {(leaderboardVisible || profile?.is_admin) && (
          <button
            onClick={() => setActiveTab('leaderboard')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'leaderboard' ? styles.navButtonActive : {}),
            }}
          >
            Leaderboard
          </button>
        )}
        {profile?.is_admin && (
          <button
            onClick={() => setActiveTab('admin')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'admin' ? styles.navButtonActive : {}),
            }}
          >
            Admin
          </button>
        )}
      </nav>

      <main style={styles.main}>
        {activeTab === 'betting' && <BettingPanel />}
        {activeTab === 'history' && <History />}
        {activeTab === 'leaderboard' && (leaderboardVisible || profile?.is_admin) && <Leaderboard />}
        {activeTab === 'admin' && profile?.is_admin && <AdminPanel />}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
  header: {
    backgroundColor: 'white',
    color: '#333',
    padding: '20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    flexShrink: 0,
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    margin: '0',
    fontSize: '28px',
  },
  logoImage: {
    height: '50px',
    objectFit: 'contain',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  username: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  points: {
    fontSize: '18px',
    color: '#007bff',
    fontWeight: 'bold',
  },
  adminBadge: {
    backgroundColor: '#ff9800',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  nav: {
    backgroundColor: 'white',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'center',
    gap: '0',
    flexShrink: 0,
  },
  navButton: {
    padding: '15px 30px',
    backgroundColor: 'transparent',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s',
  },
  navButtonActive: {
    color: '#007bff',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '3px solid #007bff',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '10px',
  },
}

export default App
