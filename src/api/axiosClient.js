import axios from 'axios'
import { toast } from 'sonner'

const baseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL ?? 'https://localhost:7243/api')

// ── PascalCase → snake_case normalizer (recursive) ──────────────────────────────
// Converts: Seriesid→series_id, GenreId→genre_id, Pageimageurl→page_image_url
function toSnakeCase(key) {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

function normalizeKeys(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(normalizeKeys)
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [toSnakeCase(k), normalizeKeys(v)])
  )
}

const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  transformResponse: [
    ...(axios.defaults.transformResponse ?? []),
    (data) => {
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch { return data }
      }
      return normalizeKeys(data)
    },
  ],
})

// ── Request interceptor ─────────────────────────────────────────────────────────
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  console.group(`\u27A4  ${config.method?.toUpperCase()} ${config.url}`)
  console.log('params:', config.params)
  console.log('data:', config.data instanceof FormData ? '[FormData]' : config.data)
  console.groupEnd()

  config.startTime = Date.now()
  return config
})

// ── Response interceptor ───────────────────────────────────────────────────────
instance.interceptors.response.use(
  res => {
    const ms = Date.now() - (res.config.startTime || 0)
    const { method, url, params } = res.config

    console.group(`\u2714  ${method?.toUpperCase()} ${url}  (${ms}ms)  ${res.status}`)
    console.log('params:', params)
    console.log('data:', res.data)
    console.groupEnd()

    // Toast chỉ cho mutations, không phải GET
    const isMutation = !['get', 'head', 'options'].includes(method?.toLowerCase())
    if (isMutation) {
      const msg = extractSuccessMessage(res.data) ?? `${method?.toUpperCase()} ${url} thanh cong`
      toast.success(msg)
    }

    return res
  },

  err => {
    const ms = Date.now() - (err.config?.startTime || 0)
    const method = err.config?.method?.toUpperCase() ?? '???'
    const url = err.config?.url ?? '???'
    const status = err.response?.status
    const errorData = err.response?.data
    const errorMsg = extractErrorMessage(errorData) || err.message

    console.group(`\u2718  ${method} ${url}  (${ms}ms)  ${status ?? 'NETWORK ERROR'}`)
    console.log('status:', status)
    console.log('error:', errorMsg)
    console.log('response:', errorData)
    console.log('full error:', err)
    console.groupEnd()

    const userMsg = buildUserErrorMsg(status, errorMsg, method)
    toast.error(userMsg)

    return Promise.reject(err)
  },
)

// ── Helpers ────────────────────────────────────────────────────────────────────
function extractSuccessMessage(data) {
  if (!data) return null
  if (typeof data === 'string') return data
  return (
    data.message ??
    data.msg ??
    data.Message ??
    data.successMessage ??
    data.messageContent ??
    null
  )
}

function extractErrorMessage(data) {
  if (!data) return null
  if (typeof data === 'string') return data
  return (
    data.message ??
    data.msg ??
    data.error ??
    data.Message ??
    data.errorMessage ??
    data.title ??
    JSON.stringify(data) ??
    null
  )
}

function buildUserErrorMsg(status, errorMsg, method) {
  if (!status) {
    return 'Khong the ket noi den server. Vui long kiem tra backend da chay chua.'
  }
  switch (status) {
    case 400: return `Du lieu khong hop le (${method}). ${errorMsg}`
    case 401: return 'Chua dang nhap hoac session het han. Vui long dang nhap lai.'
    case 403: return 'Ban khong co quyen thuc hien thao tac nay.'
    case 404: return `Khong tim thay tai nguyen. ${errorMsg}`
    case 409: return errorMsg || 'Xung dot du lieu. Vui long kiem tra lai.'
    case 422: return `Loi xac thuc du lieu. ${errorMsg}`
    case 500: return 'Loi server. Vui long thu lai sau.'
    default:   return errorMsg || `Loi ${status}. Vui long thu lai.`
  }
}

export default instance
