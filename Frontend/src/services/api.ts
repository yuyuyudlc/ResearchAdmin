import type { ApiResponse } from './types'

const BASE_URL = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('accessToken')
}

function handleUnauthorized(response: Response, skipAuthRedirect?: boolean): void {
  if (response.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {},
): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  handleUnauthorized(response, options.skipAuthRedirect)

  // 容错：后端在 404/500 等情况下可能返回纯文本（如 Gin 的 "404 page not found"）。
  // 直接 json() 会抛 "Unexpected non-whitespace character after JSON"，
  // 这里改为先按文本读，再尝试解析为 JSON。
  const text = await response.text()
  let data: ApiResponse<T> | null = null
  try {
    data = text ? (JSON.parse(text) as ApiResponse<T>) : null
  } catch {
    // 非 JSON 响应
  }

  if (!data) {
    const fallback = text?.trim() || response.statusText || `HTTP ${response.status}`
    throw new Error(`${response.status} ${fallback}`)
  }

  if (data.code !== 0) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

async function requestBinary(
  endpoint: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {},
): Promise<ArrayBuffer> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  handleUnauthorized(response, options.skipAuthRedirect)

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data: ApiResponse<unknown> = await response.json()
      throw new Error(data.message || 'Request failed')
    }
    throw new Error(response.statusText || 'Request failed')
  }

  return response.arrayBuffer()
}

export function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: 'GET' })
}

export function post<T>(
  endpoint: string,
  body?: unknown,
  options?: { skipAuthRedirect?: boolean },
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...options,
  })
}

export function patch<T>(
  endpoint: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function put<T>(
  endpoint: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: 'DELETE' })
}

export function getBinary(endpoint: string): Promise<ArrayBuffer> {
  return requestBinary(endpoint, { method: 'GET' })
}

export function putBinary<T>(
  endpoint: string,
  body: ArrayBuffer | Uint8Array,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  let binaryBody: BodyInit
  if (body instanceof Uint8Array) {
    const copy = new Uint8Array(body.byteLength)
    copy.set(body)
    binaryBody = new Blob([copy.buffer])
  } else {
    binaryBody = body
  }

  return request<T>(endpoint, {
    method: 'PUT',
    body: binaryBody,
    headers: {
      'Content-Type': 'application/octet-stream',
      ...headers,
    },
  })
}
