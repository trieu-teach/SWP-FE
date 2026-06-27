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

function buildSessionFromAuthResponse(data) {
  if (!data) return null

  // Resolve role: check string role first (from JWT claim), then numeric roleId
  const rawRole = data.role ?? data.Role ?? null
  const jwtPayload = data.token ? decodeJwtPayload(data.token) : {}

  let roleKey =
    (typeof rawRole === 'string' && VALID_ROLE_KEYS.has(rawRole.toUpperCase()))
      ? rawRole.toUpperCase()
      : jwtPayload.role && VALID_ROLE_KEYS.has(String(jwtPayload.role).toUpperCase())
        ? String(jwtPayload.role).toUpperCase()
        : typeof data.role === 'number'
          ? ROLE_ID_TO_KEY[data.role]
          : ROLE_ID_TO_KEY[jwtPayload.roleid] ??
            ROLE_ID_TO_KEY[jwtPayload.roleId] ??
            ROLE_ID_TO_KEY[data.role_id] ??
            ROLE_ID_TO_KEY[data.roleid] ??
            ROLE_ID_TO_KEY[data.Roleid] ??
            ROLE_ID_TO_KEY[data.roleId] ??
            ROLE_ID_TO_KEY[data.RoleId] ??
            null

  return {
    id: data.userid ?? data.Userid ?? data.userId ?? data.UserId ??
      jwtPayload.userid ?? jwtPayload.Userid ?? jwtPayload.userId ?? jwtPayload.UserId ??
      jwtPayload.sub ?? jwtPayload.id ?? jwtPayload.Id ?? null,
    userid: data.userid ?? data.Userid ?? data.userId ?? data.UserId ??
      jwtPayload.userid ?? jwtPayload.Userid ?? jwtPayload.userId ?? jwtPayload.UserId ??
      jwtPayload.sub ?? jwtPayload.id ?? jwtPayload.Id ?? null,
    username: data.username ?? data.Username,
    name: data.fullname ?? data.Fullname ?? data.fullName ?? data.Username,
    fullname: data.fullname ?? data.Fullname ?? data.fullName,
    email: data.email ?? data.Email,
    roleid: data.roleid ?? data.Roleid ?? data.roleId ?? data.RoleId ??
      jwtPayload.roleid ?? jwtPayload.roleId ?? null,
    role: roleKey,
    token: data.token,
    refreshToken: data.refreshToken,
  }
}

export async function login(username, password) {
  const res = await authService.login({ userName: username, password })
  const data = res.data
  if (!data?.token) throw new Error('Phan hoi dang nhap khong hop le — khong co token.')

  // Luu token truoc de cac API call sau co Bearer header
  if (data.token) localStorage.setItem('token', data.token)
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)

  // Lay user tu response login (khong goi profile o day vi endpoint /users/profile
  // chua co hoac co the 404 → tranh lam crash React error boundary)
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
  if (body.token) localStorage.setItem('token', body.token)
  if (body.refreshToken) localStorage.setItem('refreshToken', body.refreshToken)
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
