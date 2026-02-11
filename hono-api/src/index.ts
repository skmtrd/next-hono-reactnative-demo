import 'dotenv/config'
import { serve } from '@hono/node-server'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import { swaggerUI } from '@hono/swagger-ui'

// 環境変数
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

// 型定義
type Variables = {
  user: { id: string; email: string } | null
}

// ヘルパー関数
const createAuthenticatedClient = (authHeader: string | undefined) => {
  const token = authHeader?.replace('Bearer ', '') || ''
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
}

const verifyAuth = async (authHeader: string | undefined) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' }
  }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' }
  }
  return { user: { id: user.id, email: user.email || '' }, error: null }
}

// ===== スキーマ定義 =====

const ErrorSchema = z.object({
  error: z.string()
}).openapi('Error')

const HelloResponseSchema = z.object({
  message: z.string(),
  timestamp: z.string()
}).openapi('HelloResponse')

const GreetRequestSchema = z.object({
  name: z.string()
}).openapi('GreetRequest')

const GreetResponseSchema = z.object({
  message: z.string(),
  timestamp: z.string()
}).openapi('GreetResponse')

const AuthRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
}).openapi('AuthRequest')

const UserSchema = z.object({
  id: z.string(),
  email: z.string().nullable()
}).openapi('User')

const SessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number().nullable()
}).openapi('Session')

const AuthResponseSchema = z.object({
  message: z.string(),
  user: UserSchema.nullable(),
  session: SessionSchema.nullable()
}).openapi('AuthResponse')

const ProtectedMeResponseSchema = z.object({
  message: z.string(),
  user: UserSchema.nullable(),
  timestamp: z.string()
}).openapi('ProtectedMeResponse')

const ProtectedDataResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    secretMessage: z.string(),
    items: z.array(z.string())
  }),
  timestamp: z.string()
}).openapi('ProtectedDataResponse')

const ProfileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
}).openapi('Profile')

const ProfileResponseSchema = z.object({
  profile: ProfileSchema
}).openapi('ProfileResponse')

const ProfileUpdateRequestSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional()
}).openapi('ProfileUpdateRequest')

const ProfileUpdateResponseSchema = z.object({
  message: z.string(),
  profile: ProfileSchema
}).openapi('ProfileUpdateResponse')

// ===== ルート定義 =====

const app = new OpenAPIHono<{ Variables: Variables }>()

// CORS
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// --- 公開API ---

const helloRoute = createRoute({
  method: 'get',
  path: '/api/hello',
  tags: ['Public'],
  summary: 'Hello エンドポイント',
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: HelloResponseSchema } }
    }
  }
})

app.openapi(helloRoute, (c) => {
  return c.json({
    message: 'Hello from Hono!',
    timestamp: new Date().toISOString()
  })
})

const greetRoute = createRoute({
  method: 'post',
  path: '/api/greet',
  tags: ['Public'],
  summary: '挨拶エンドポイント',
  request: {
    body: { content: { 'application/json': { schema: GreetRequestSchema } } }
  },
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: GreetResponseSchema } }
    }
  }
})

app.openapi(greetRoute, async (c) => {
  const { name } = c.req.valid('json')
  return c.json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString()
  })
})

// --- 認証API ---

const signupRoute = createRoute({
  method: 'post',
  path: '/api/auth/signup',
  tags: ['Auth'],
  summary: 'アカウント作成',
  request: {
    body: { content: { 'application/json': { schema: AuthRequestSchema } } }
  },
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: AuthResponseSchema } }
    },
    400: {
      description: 'エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    }
  }
})

app.openapi(signupRoute, async (c) => {
  const { email, password } = c.req.valid('json')
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({
    message: 'Account created successfully',
    user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null,
    session: data.session ? {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
    } : null,
  })
})

const loginRoute = createRoute({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: 'ログイン',
  request: {
    body: { content: { 'application/json': { schema: AuthRequestSchema } } }
  },
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: AuthResponseSchema } }
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    }
  }
})

app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json')
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return c.json({ error: error.message }, 401)
  }

  return c.json({
    message: 'Login successful',
    user: { id: data.user.id, email: data.user.email ?? null },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
    },
  })
})

// --- 保護されたAPI ---

const protectedMeRoute = createRoute({
  method: 'get',
  path: '/api/protected/me',
  tags: ['Protected'],
  summary: 'ユーザー情報取得（認証必須）',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: ProtectedMeResponseSchema } }
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    }
  }
})

app.openapi(protectedMeRoute, async (c) => {
  const authHeader = c.req.header('Authorization')
  const { user, error: authError } = await verifyAuth(authHeader)
  
  if (authError || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401)
  }

  return c.json({
    message: 'You are authenticated!',
    user,
    timestamp: new Date().toISOString()
  })
})

const protectedDataRoute = createRoute({
  method: 'get',
  path: '/api/protected/data',
  tags: ['Protected'],
  summary: '保護されたデータ取得（認証必須）',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: ProtectedDataResponseSchema } }
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    }
  }
})

app.openapi(protectedDataRoute, async (c) => {
  const authHeader = c.req.header('Authorization')
  const { user, error: authError } = await verifyAuth(authHeader)
  
  if (authError || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401)
  }

  return c.json({
    message: 'This is protected data',
    data: {
      secretMessage: `Hello ${user.email}, this is your secret data!`,
      items: ['item1', 'item2', 'item3']
    },
    timestamp: new Date().toISOString()
  })
})

// --- プロフィールAPI ---

const getProfileRoute = createRoute({
  method: 'get',
  path: '/api/profile',
  tags: ['Profile'],
  summary: 'プロフィール取得（認証必須）',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: ProfileResponseSchema } }
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    },
    400: {
      description: 'エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    }
  }
})

app.openapi(getProfileRoute, async (c) => {
  const authHeader = c.req.header('Authorization')
  const { user, error: authError } = await verifyAuth(authHeader)
  
  if (authError || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401)
  }

  const supabase = createAuthenticatedClient(authHeader)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({ profile: data })
})

const updateProfileRoute = createRoute({
  method: 'put',
  path: '/api/profile',
  tags: ['Profile'],
  summary: 'プロフィール更新（認証必須）',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: ProfileUpdateRequestSchema } } }
  },
  responses: {
    200: {
      description: '成功',
      content: { 'application/json': { schema: ProfileUpdateResponseSchema } }
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    },
    400: {
      description: 'エラー',
      content: { 'application/json': { schema: ErrorSchema } }
    }
  }
})

app.openapi(updateProfileRoute, async (c) => {
  const authHeader = c.req.header('Authorization')
  const { user, error: authError } = await verifyAuth(authHeader)
  
  if (authError || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401)
  }

  const { name, bio } = c.req.valid('json')
  const supabase = createAuthenticatedClient(authHeader)
  const { data, error } = await supabase
    .from('profiles')
    .update({ name, bio })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({
    message: 'Profile updated successfully',
    profile: data,
  })
})

// --- OpenAPI ドキュメント ---

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Hono API',
    version: '1.0.0',
    description: 'Hono + Supabase Demo API'
  },
  servers: [
    { url: 'http://localhost:8787', description: 'Local' }
  ],
  security: [{ Bearer: [] }]
})

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT'
})

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// ルート
app.get('/', (c) => {
  return c.json({ message: 'Hono API Server is running!' })
})

const port = 8787
const hostname = '0.0.0.0'
console.log(`🔥 Hono server is running on http://${hostname}:${port}`)
console.log(`📚 API Docs: http://localhost:${port}/docs`)

serve({
  fetch: app.fetch,
  port,
  hostname,
})
