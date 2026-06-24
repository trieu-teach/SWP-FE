import { authService } from '@/api'

const SESSION_KEY = 'auth_user'

export const ROLE_ID_TO_KEY = {
  1: 'ADMIN',
  2: 'EDITOR_BOARD',
  3: 'TANTOU',
  4: 'MANGAKA',
  5: 'ASSISTANT',
}

export const ROLE_KEY_TO_ID = {
  MANGAKA: 4,
  ASSISTANT: 5,
  TANTOU: 3,
  EDITOR_BOARD: 2,
  ADMIN: 1,
}

// Valid role string values returned by backend JWT
const VALID_ROLE_KEYS = new Set(['ADMIN', 'EDITOR_BOARD', 'TANTOU', 'MANGAKA', 'ASSISTANT'])

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice((base64.length + 4) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return {}
  }
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event('auth-session-change'))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  window.dispatchEvent(new Event('auth-session-change'))
}

// Lấy giá trị đầu tiên có sẵn trong object (bỏ qua null/undefined/empty-string).
// Dùng để chấp nhận cả snake_case (user_id) lẫn PascalCase (UserId, userId) từ
// response backend — axiosClient.js đang normalize PascalCase → snake_case,
// nhưng một số call site (ví dụ authService) cần fallback về PascalCase nếu
// normalize bị tắt hoặc backend trả thẳng snake_case.
function pick(obj, keys) {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

function buildSessionFromAuthResponse(data) {
  if (!data) return null

  const jwtPayload = pick(data, ['token']) ? decodeJwtPayload(data.token) : {}

  // Resolve role: ưu tiên chuỗi role hợp lệ, fallback roleId (snake & Pascal) từ
  // response backend hoặc JWT.  Đảm bảo check cả hai dạng snake_case + PascalCase cho mọi
  // field để chịu được cả response backend PascalCase lẫn response sau khi
  // normalizeKeys của axiosClient đã convert thành snake_case.
  const rawRole = pick(data, ['role', 'Role'])
  const roleIdNum = Number(
    pick(data, ['role_id', 'roleid', 'Roleid', 'roleId', 'RoleId']) ??
    pick(jwtPayload, ['roleid', 'roleId'])
  )

  let roleKey = null
  if (rawRole && VALID_ROLE_KEYS.has(String(rawRole).toUpperCase())) {
    roleKey = String(rawRole).toUpperCase()
  } else if (jwtPayload.role && VALID_ROLE_KEYS.has(String(jwtPayload.role).toUpperCase())) {
    roleKey = String(jwtPayload.role).toUpperCase()
  } else if (Number.isFinite(roleIdNum) && ROLE_ID_TO_KEY[roleIdNum]) {
    roleKey = ROLE_ID_TO_KEY[roleIdNum]
  }

  const id = pick(data, ['user_id', 'userid', 'Userid', 'userId', 'UserId']) ??
             pick(jwtPayload, ['userid', 'Userid', 'userId', 'UserId', 'sub', 'id', 'Id'])

  return {
    id,
    userid: id,
    username: pick(data, ['username', 'Username']),
    name: pick(data, ['full_name', 'fullname', 'Fullname', 'fullName', 'FullName']) ?? pick(data, ['username', 'Username']),
    fullname: pick(data, ['full_name', 'fullname', 'Fullname', 'fullName', 'FullName']),
    email: pick(data, ['email', 'Email']),
    roleid: Number(pick(data, ['role_id', 'roleid', 'Roleid', 'roleId', 'RoleId']) ?? pick(jwtPayload, ['roleid', 'roleId'])),
    role: roleKey,
    token: pick(data, ['token', 'Token']),
    refreshToken: pick(data, ['refresh_token', 'refreshToken', 'RefreshToken', 'Refresh_Token']),
  }
}

export async function login(username, password) {
  const res = await authService.login({ userName: username, password })
  const data = res.data
  const token = pick(data, ['token', 'Token'])
  if (!token) throw new Error('Phan hoi dang nhap khong hop le — khong co token.')

  // Luu token truoc de cac API call sau co Bearer header
  const refreshToken = pick(data, ['refresh_token', 'refreshToken', 'RefreshToken'])
  if (token) localStorage.setItem('token', token)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)

  const user = buildSessionFromAuthResponse(data)
  if (!user) throw new Error('Phan hoi dang nhap khong hop le.')

  setSession(user)
  return user
}

export async function getProfile() {
  const res = await authService.profile()
  return res.data
}

export async function register(data) {
  const payload = {
    userName: data.username ?? data.userName,
    password: data.password,
    fullName: data.fullName ?? data.fullname ?? data.name,
    email: data.email,
    phoneNumber: data.phoneNumber ?? data.phonenumber ?? data.phone,
    roleId: data.roleId ?? data.roleid ?? ROLE_KEY_TO_ID[data.role] ?? 4,
  }
  const res = await authService.register(payload)
  const body = res.data
  const user = buildSessionFromAuthResponse(body)
  if (!user) throw new Error('Phan hoi dang ky khong hop le.')
  const token = pick(body, ['token', 'Token'])
  const refreshToken = pick(body, ['refresh_token', 'refreshToken', 'RefreshToken'])
  if (token) localStorage.setItem('token', token)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
  setSession(user)
  return user
}

export async function logout() {
  const refreshToken = localStorage.getItem('refreshToken')
  try {
    if (refreshToken) await authService.logout({ token: refreshToken })
  } catch {
    // Bo qua loi logout API
  }
  clearSession()
}

export function getRolePath(role) {
  const map = {
    MANGAKA: '/mangaka',
    ASSISTANT: '/assistant',
    TANTOU: '/tantou',
    EDITOR_BOARD: '/eb',
    ADMIN: '/admin',
  }
  const normalized = String(role ?? '').toUpperCase().trim()
  return map[normalized] || null
}

export const ROLES = {
  MANGAKA: 'MANGAKA',
  ASSISTANT: 'ASSISTANT',
  TANTOU: 'TANTOU',
  EDITOR_BOARD: 'EDITOR_BOARD',
}

export const ROLE_OPTIONS = [
  { value: 'MANGAKA', label: 'Mangaka', icon: '✍️', desc: 'Tao series, upload chapter, danh dau vung giao viec cho Assistant.' },
  { value: 'ASSISTANT', label: 'Assistant', icon: '🎨', desc: 'Nhan draft tu Mangaka, ve layer trong suot va gui lai ban ghep.' },
]

export const ROLE_LABELS = {
  MANGAKA: 'Mangaka',
  ASSISTANT: 'Assistant',
  TANTOU: 'Tantou Editor',
  EDITOR_BOARD: 'Editor Board',
  ADMIN: 'Admin',
}
