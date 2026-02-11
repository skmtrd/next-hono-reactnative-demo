'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { client, createAuthHeaders } from '@/lib/api-client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [helloResponse, setHelloResponse] = useState<string | null>(null)
  const [protectedResponse, setProtectedResponse] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProtectedResponse(null)
  }

  // 公開API呼び出し
  const fetchHello = async () => {
    setApiLoading(true)
    try {
      const { data, error } = await client.GET('/api/hello')
      if (error) {
        setHelloResponse(JSON.stringify(error, null, 2))
      } else {
        setHelloResponse(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      setHelloResponse(`Error: ${err}`)
    }
    setApiLoading(false)
  }

  // 保護されたAPI呼び出し
  const fetchProtectedData = async () => {
    setApiLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session?.access_token 
        ? createAuthHeaders(session.access_token)
        : {}
      
      const { data, error } = await client.GET('/api/protected/me', { headers })
      if (error) {
        setProtectedResponse(JSON.stringify(error, null, 2))
      } else {
        setProtectedResponse(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      setProtectedResponse(`Error: ${err}`)
    }
    setApiLoading(false)
  }

  // 保護されたデータ取得
  const fetchSecretData = async () => {
    setApiLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session?.access_token 
        ? createAuthHeaders(session.access_token)
        : {}
      
      const { data, error } = await client.GET('/api/protected/data', { headers })
      if (error) {
        setProtectedResponse(JSON.stringify(error, null, 2))
      } else {
        setProtectedResponse(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      setProtectedResponse(`Error: ${err}`)
    }
    setApiLoading(false)
  }

  // プロフィール取得
  const fetchProfile = async () => {
    setApiLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session?.access_token 
        ? createAuthHeaders(session.access_token)
        : {}
      
      const { data, error } = await client.GET('/api/profile', { headers })
      if (error) {
        setProtectedResponse(JSON.stringify(error, null, 2))
      } else {
        setProtectedResponse(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      setProtectedResponse(`Error: ${err}`)
    }
    setApiLoading(false)
  }

  if (loading) {
    return (
      <main style={styles.main}>
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Next.js + Hono + Supabase Auth Demo</h1>
      
      {/* 認証状態の表示 */}
      <section style={styles.authSection}>
        {user ? (
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>ログイン中: {user.email}</span>
            <div style={styles.userActions}>
              <Link href="/profile" style={styles.profileLink}>
                プロフィール編集
              </Link>
              <button onClick={handleLogout} style={styles.logoutButton}>
                ログアウト
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.userInfo}>
            <span>ログインしていません</span>
            <Link href="/auth" style={styles.loginLink}>
              ログイン / サインアップ
            </Link>
          </div>
        )}
      </section>

      {/* 公開APIセクション */}
      <section style={styles.section}>
        <h2>公開API (認証不要)</h2>
        <p style={styles.description}>GET /api/hello - 誰でもアクセス可能</p>
        <button onClick={fetchHello} disabled={apiLoading} style={styles.button}>
          Hello を取得
        </button>
        {helloResponse && (
          <pre style={styles.response}>{helloResponse}</pre>
        )}
      </section>

      {/* 保護されたAPIセクション */}
      <section style={styles.section}>
        <h2>保護されたAPI (認証必須)</h2>
        <p style={styles.description}>
          JWT トークンを Authorization ヘッダーに付与してリクエスト
          {!user && <span style={styles.notLoggedIn}> (未ログイン状態)</span>}
        </p>
        
        <div style={styles.buttonGroup}>
          <button onClick={fetchProtectedData} disabled={apiLoading} style={styles.button}>
            GET /api/protected/me
          </button>
          <button onClick={fetchSecretData} disabled={apiLoading} style={styles.button}>
            GET /api/protected/data
          </button>
          <button onClick={fetchProfile} disabled={apiLoading} style={{...styles.button, backgroundColor: '#28a745'}}>
            GET /api/profile
          </button>
        </div>
        
        {!user && (
          <p style={styles.hint}>
            ログインしていない状態でボタンを押すと、認証エラーが返ってきます
          </p>
        )}
        
        {protectedResponse && (
          <pre style={styles.response}>{protectedResponse}</pre>
        )}
      </section>

      {/* API ドキュメント */}
      <section style={styles.docsSection}>
        <a href="http://localhost:8787/docs" target="_blank" rel="noopener noreferrer" style={styles.docsLink}>
          📚 Swagger UI でAPIドキュメントを確認
        </a>
      </section>
    </main>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  authSection: {
    backgroundColor: '#e8f4fd',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  userInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  userEmail: {
    fontWeight: 500,
    color: '#0070f3',
  },
  userActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  profileLink: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '5px',
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  loginLink: {
    backgroundColor: '#0070f3',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '5px',
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
  section: {
    backgroundColor: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  description: {
    color: '#666',
    fontSize: '0.875rem',
    marginBottom: '12px',
  },
  button: {
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  response: {
    backgroundColor: '#1a1a1a',
    color: '#00ff00',
    padding: '15px',
    borderRadius: '5px',
    marginTop: '15px',
    overflow: 'auto',
    fontSize: '0.875rem',
  },
  notLoggedIn: {
    color: '#dc3545',
    fontWeight: 500,
  },
  hint: {
    color: '#666',
    fontSize: '0.8rem',
    marginTop: '12px',
    fontStyle: 'italic',
  },
  docsSection: {
    textAlign: 'center',
    marginTop: '20px',
  },
  docsLink: {
    color: '#0070f3',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
}
