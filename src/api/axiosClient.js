import axios from 'axios'

const baseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL ?? 'https://localhost:7243/api')

const instance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Axios tự set Content-Type boundary khi data là FormData — không ghi đè
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

instance.interceptors.response.use(
  res => res,
  err => Promise.reject(err),
)

export default instance
