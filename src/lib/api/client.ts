import { getAccessToken } from "@/lib/auth/client"

type ApiErrorShape = {
  error?: {
    code?: string
    message?: string
  }
}

type ApiSuccessShape<T> = {
  data?: T
}

export class ApiClientError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
  }
}

function dispatchAuthExpired() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("ossum:auth-expired"))
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null


  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiFetch<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const body = await readJson(response)

  if (!response.ok) {
    const errorBody = body as ApiErrorShape | null
    const code = errorBody?.error?.code
    const message = errorBody?.error?.message ?? response.statusText ?? "Error de API"

    if (response.status === 401) {
      dispatchAuthExpired()
    }

    throw new ApiClientError(message, response.status, code)
  }

  const successBody = body as ApiSuccessShape<T> | null
  return successBody && Object.prototype.hasOwnProperty.call(successBody, "data")
    ? (successBody.data as T)
    : (body as T)
}
