'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { client, createAuthHeaders } from '@/lib/api-client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  name: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      await fetchProfile()
      setLoading(false)
    }
    init()
  }, [])

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const headers = createAuthHeaders(session.access_token)
      const { data, error } = await client.GET('/api/profile', { headers })
      
      if (error) {
        console.error('Failed to fetch profile:', error)
        return
      }
      
      if (data?.profile) {
        setProfile(data.profile as Profile)
        setName(data.profile.name || '')
        setBio(data.profile.bio || '')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const headers = createAuthHeaders(session.access_token)
      const { data, error } = await client.PUT('/api/profile', {
        headers,
        body: { name, bio },
      })

      if (error) {
        setMessage({ type: 'error', text: (error as { error?: string }).error || '保存に失敗しました' })
      } else if (data) {
        setProfile(data.profile as Profile)
        setMessage({ type: 'success', text: 'プロフィールを保存しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    }

    setSaving(false)
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
      <div style={styles.header}>
        <Link href="/" style={styles.backLink}>← ホームに戻る</Link>
        <h1 style={styles.title}>プロフィール編集</h1>
      </div>

      <div style={styles.card}>
        <p style={styles.email}>メールアドレス: {user?.email}</p>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="あなたの名前"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>自己紹介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={styles.textarea}
            placeholder="自己紹介を書いてください..."
            rows={4}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={styles.button}
        >
          {saving ? '保存中...' : '保存する'}
        </button>

        {profile && (
          <p style={styles.updatedAt}>
            最終更新: {new Date(profile.updated_at).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </main>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '24px',
  },
  backLink: {
    color: '#0070f3',
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
  title: {
    fontSize: '1.75rem',
    marginTop: '8px',
  },
  card: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  email: {
    color: '#666',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #eee',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '0.875rem',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  button: {
    width: '100%',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  updatedAt: {
    textAlign: 'center',
    color: '#999',
    fontSize: '0.75rem',
    marginTop: '16px',
  },
}
