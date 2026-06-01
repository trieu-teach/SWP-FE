export const ROLES = { MANGAKA: 'mangaka', ASSISTANT: 'assistant' }

export const ROLE_OPTIONS = [
  { value: ROLES.MANGAKA, icon: '✏️', title: 'Mangaka', desc: 'Tạo draft series, upload chapter, đánh dấu vùng cần bổ sung.' },
  { value: ROLES.ASSISTANT, icon: '🎨', title: 'Assistant', desc: 'Nhận draft từ Mangaka, vẽ/bổ sung ngoại cảnh.' },
]

export const ROLE_LABELS = { [ROLES.MANGAKA]: 'Mangaka', [ROLES.ASSISTANT]: 'Assistant' }

const ROLE_PATH = { [ROLES.MANGAKA]: '/mangaka', [ROLES.ASSISTANT]: '/assistant' }

const MOCK_USERS = [
  { id: 1, name: 'Demo Mangaka', email: 'mangaka@test.com', password: '123456', role: ROLES.MANGAKA },
  { id: 2, name: 'Demo Assistant', email: 'assistant@test.com', password: '123456', role: ROLES.ASSISTANT },
]

let users = [...MOCK_USERS]

export function getRolePath(role) {
  return ROLE_PATH[role] ?? '/login'
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem('manga_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(user) {
  sessionStorage.setItem('manga_user', JSON.stringify(user))
}

export function logout() {
  sessionStorage.removeItem('manga_user')
}

function findUser(email) {
  const key = email.trim().toLowerCase()
  return users.find(u => u.email.toLowerCase() === key)
}

function stripPassword(user) {
  const { password, ...safe } = user
  return safe
}

export async function mockLogin(email, password) {
  await new Promise(r => setTimeout(r, 300))
  const user = findUser(email)
  if (!user || user.password !== password) throw { message: 'Email hoặc mật khẩu không đúng.' }
  const sessionUser = stripPassword(user)
  saveSession(sessionUser)
  return sessionUser
}

export async function mockRegister({ name, email, password, role }) {
  await new Promise(r => setTimeout(r, 300))
  if (role !== ROLES.MANGAKA && role !== ROLES.ASSISTANT) {
    throw { message: 'Chỉ Mangaka và Assistant được phép đăng ký.' }
  }
  if (findUser(email)) {
    throw { message: 'Email này đã được đăng ký. Mỗi email chỉ gắn một vai trò.' }
  }
  const user = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
  }
  users.push(user)
  const sessionUser = stripPassword(user)
  saveSession(sessionUser)
  return sessionUser
}
