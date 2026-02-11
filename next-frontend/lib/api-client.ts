import createClient from 'openapi-fetch'
import type { paths } from './api-types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

// OpenAPI fetch クライアント
export const client = createClient<paths>({ baseUrl: API_BASE })

// 認証付きヘッダーを作成するヘルパー
export const createAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
})
