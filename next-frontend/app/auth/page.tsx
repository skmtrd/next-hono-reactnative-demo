'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { client } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [apiResponse, setApiResponse] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setApiResponse(null)

    try {
      if (isLogin) {
        // ログイン
        const { data, error } = await client.POST('/api/auth/login', {
          body: { email, password },
        })

        setApiResponse(JSON.stringify(data || error, null, 2))

        if (error) {
          throw new Error((error as { error?: string }).error || 'エラーが発生しました')
        }

        if (data?.session) {
          // Hono APIから受け取ったセッションをSupabaseクライアントに設定
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          
          setMessage({
            type: 'success',
            text: 'ログインしました！リダイレクト中...',
          })
          
          setTimeout(() => {
            router.push('/')
            router.refresh()
          }, 1000)
        }
      } else {
        // サインアップ
        const { data, error } = await client.POST('/api/auth/signup', {
          body: { email, password },
        })

        setApiResponse(JSON.stringify(data || error, null, 2))

        if (error) {
          throw new Error((error as { error?: string }).error || 'エラーが発生しました')
        }

        setMessage({
          type: 'success',
          text: 'アカウントを作成しました。ログインしてください。',
        })
        setIsLogin(true)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました'
      setMessage({
        type: 'error',
        text: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isLogin ? 'ログイン' : 'サインアップ'}</h1>
        <p style={styles.subtitle}>Hono API 経由で認証</p>
        
        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? '処理中...' : isLogin ? 'ログイン' : 'サインアップ'}
          </button>
        </form>

        <p style={styles.switchText}>
          {isLogin ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
          <button
            onClick={() => { setIsLogin(!isLogin); setApiResponse(null) }}
            style={styles.switchButton}
          >
            {isLogin ? 'サインアップ' : 'ログイン'}
          </button>
        </p>

        {/* APIレスポンス表示 */}
        {apiResponse && (
          <div style={styles.responseSection}>
            <h3 style={styles.responseTitle}>Hono API レスポンス:</h3>
            <pre style={styles.response}>{apiResponse}</pre>
          </div>
        )}
      </div>
    </main>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '4px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#666',
    textAlign: 'center',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
  },
  button: {
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '0.875rem',
  },
  switchText: {
    marginTop: '20px',
    textAlign: 'center',
    color: '#666',
    fontSize: '0.875rem',
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#0070f3',
    cursor: 'pointer',
    fontWeight: 500,
    marginLeft: '4px',
  },
  responseSection: {
    marginTop: '24px',
    borderTop: '1px solid #eee',
    paddingTop: '16px',
  },
  responseTitle: {
    fontSize: '0.875rem',
    color: '#666',
    marginBottom: '8px',
  },
  response: {
    backgroundColor: '#1a1a1a',
    color: '#00ff00',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    overflow: 'auto',
    maxHeight: '200px',
  },
}
