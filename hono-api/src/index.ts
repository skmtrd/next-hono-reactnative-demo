import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

// 環境変数
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

// 型定義
type Variables = {
  user: {
    id: string
    email: string
  } | null
}

const app = new Hono<{ Variables: Variables }>()

// CORSを有効化（開発環境では全てのオリジンを許可）
app.use('/*', cors({
  origin: '*',  // 本番環境では特定のオリジンのみ許可すること
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 認証ミドルウェア（保護されたルート用）
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')

  // Supabaseクライアントを作成してトークンを検証
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  // ユーザー情報をコンテキストに設定
  c.set('user', {
    id: user.id,
    email: user.email || ''
  })

  await next()
}

// ルートエンドポイント（公開）
app.get('/', (c) => {
  return c.json({ message: 'Hono API Server is running!' })
})

// サンプルAPIエンドポイント（公開）
app.get('/api/hello', (c) => {
  return c.json({
    message: 'Hello from Hono!',
    timestamp: new Date().toISOString()
  })
})

// POSTリクエストのサンプル（公開）
app.post('/api/greet', async (c) => {
  const body = await c.req.json<{ name: string }>()
  return c.json({
    message: `Hello, ${body.name}!`,
    timestamp: new Date().toISOString()
  })
})

// === 認証エンドポイント ===

// サインアップ（アカウント作成）
app.post('/api/auth/signup', async (c) => {
  try {
    const { email, password } = await c.req.json<{ email: string; password: string }>()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      return c.json({ error: error.message }, 400)
    }

    return c.json({
      message: 'Account created successfully',
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
      } : null,
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      } : null,
    })
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// ログイン
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json<{ email: string; password: string }>()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return c.json({ error: error.message }, 401)
    }

    return c.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    })
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// トークンリフレッシュ
app.post('/api/auth/refresh', async (c) => {
  try {
    const { refresh_token } = await c.req.json<{ refresh_token: string }>()

    if (!refresh_token) {
      return c.json({ error: 'Refresh token is required' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase.auth.refreshSession({ refresh_token })

    if (error) {
      return c.json({ error: error.message }, 401)
    }

    return c.json({
      message: 'Token refreshed successfully',
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      } : null,
    })
  } catch (error) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// ログアウト（認証必須）
app.post('/api/auth/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '') || ''

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })

  const { error } = await supabase.auth.signOut()

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ message: 'Logout successful' })
})

// === 保護されたエンドポイント ===

// ユーザー情報取得（認証必須）
app.get('/api/protected/me', authMiddleware, (c) => {
  const user = c.get('user')
  return c.json({
    message: 'You are authenticated!',
    user,
    timestamp: new Date().toISOString()
  })
})

// 保護されたデータ取得（認証必須）
app.get('/api/protected/data', authMiddleware, (c) => {
  const user = c.get('user')
  return c.json({
    message: 'This is protected data',
    data: {
      secretMessage: `Hello ${user?.email}, this is your secret data!`,
      items: ['item1', 'item2', 'item3']
    },
    timestamp: new Date().toISOString()
  })
})

const port = 8787
const hostname = '0.0.0.0'  // 外部からのアクセスを許可
console.log(`🔥 Hono server is running on http://${hostname}:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname,
})
