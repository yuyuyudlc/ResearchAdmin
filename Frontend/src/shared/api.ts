import type { ApiResponse } from './types/auth'

export async function requestJSON<T>(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    if (!response.ok) {
      throw new Error(`请求失败 (${response.status})`)
    }
    throw new Error('返回数据格式错误')
  }

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || `请求失败 (${response.status})`)
  }

  return payload
}
