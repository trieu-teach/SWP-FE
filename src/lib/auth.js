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
  const rawRoleId = data.role_id ?? data.roleid ?? data.roleId ?? data.RoleId
  const rawUserId = data.user_id ?? data.userid ?? data.userId ?? data.UserId
  const roleKey = ROLE_ID_TO_KEY[Number(rawRoleId)] ?? null
  return {
    id: rawUserId,
    userid: rawUserId,
    username: data.username ?? data.Username,
    name: data.full_name ?? data.fullname ?? data.fullName ?? data.username,
    fullname: data.full_name ?? data.fullname ?? data.fullName,
    email: data.email,
    roleid: Number(rawRoleId),
    role: roleKey,
    token: data.token,
    refreshToken: data.refresh_token ?? data.refreshToken,
  }
}

export async function login(username, password) {
  const res = await authService.login({ userName: username, password })
  const data = res.data
  if (!data?.token) throw new Error('Phan hoi dang nhap khong hop le — khong co token.')

  if (data.token) localStorage.setItem('token', data.token)
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)

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
  return map[String(role ?? '').toUpperCase()] ?? '/'
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