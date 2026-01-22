import type { ApiErrorPayload, GraphResponse, SDLCGraph, UploadResponse } from '../types'

export class ApiError extends Error {
  public code?: string
  public details?: unknown
  public status?: number

  constructor(message: string, opts?: { code?: string; details?: unknown; status?: number }) {
    super(message)
    this.name = 'ApiError'
    this.code = opts?.code
    this.details = opts?.details
    this.status = opts?.status
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null
  try {
    payload = (await res.json()) as ApiErrorPayload
  } catch {
    payload = null
  }
  const msg = payload?.error?.message || `Erreur API (HTTP ${res.status})`
  return new ApiError(msg, { code: payload?.error?.code, details: payload?.error?.details, status: res.status })
}

export async function uploadCsv(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form
  })

  if (!res.ok) {
    throw await parseError(res)
  }

  return (await res.json()) as UploadResponse
}

export async function fetchSample(): Promise<UploadResponse> {
  const res = await fetch('/api/sample')
  if (!res.ok) {
    throw await parseError(res)
  }
  return (await res.json()) as UploadResponse
}

export async function uploadGraph(file: File): Promise<GraphResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/upload-graph', {
    method: 'POST',
    body: form
  })

  if (!res.ok) {
    throw await parseError(res)
  }

  return (await res.json()) as GraphResponse
}

export async function fetchSampleGraph(): Promise<GraphResponse> {
  const res = await fetch('/api/sample-graph')
  if (!res.ok) {
    throw await parseError(res)
  }
  return (await res.json()) as GraphResponse
}
