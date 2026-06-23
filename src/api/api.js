import axios from './axiosClient'

// ── AUTH ────────────────────────────────────────────────────────────────────────
export const authService = {
  login: (data) => axios.post('/auth/login', data),
  register: (data) => axios.post('/auth/register', data),
  refreshToken: (data) => axios.post('/auth/refresh-token', data),
  logout: (data) => axios.post('/auth/logout', data),
  createStaff: (data) => axios.post('/auth/create-staff', data),
  profile: () => axios.get('/users/profile'),
}

// ── SERIES ──────────────────────────────────────────────────────────────────────
export const seriesService = {
  getAll: () => axios.get('/Series'),
  getById: (id) => axios.get(`/Series/${id}`),
  // Backend: /api/Series/mangakaid/{mangakaId}  ← path segment, khong query param
  getByMangaka: (mangakaId) => axios.get(`/Series/mangakaid/${mangakaId}`),
  create: (formData) => axios.post('/Series', formData),
  update: (id, formData) => axios.put(`/Series/${id}`, formData),
  softDelete: (id) => axios.delete(`/Series/softdelete/${id}`),
  delete: (id) => axios.delete(`/Series/${id}`),
  updateStatus: (id, status) => axios.patch(`/Series/${id}/status`, { status }),
  updatePublishFormat: (id, publishFormat) =>
    axios.patch(`/Series/${id}/publish-format`, { publishformat: publishFormat }),
}

// ── CHAPTERS ────────────────────────────────────────────────────────────────────
export const chaptersService = {
  // Backend nhan param key: "seriesId"
  getAll: (seriesId) =>
    axios.get('/Chapters', { params: seriesId != null ? { seriesId } : undefined }),
  getById: (id) => axios.get(`/Chapters/${id}`),
  create: (data) => axios.post('/Chapters', data),
  update: (id, data) => axios.put(`/Chapters/${id}`, data),
  delete: (id) => axios.delete(`/Chapters/${id}`),
  // GET /api/Chapters/assistant/{assistantId} — lay danh sach chapter cua 1 assistant
  getByAssistant: (assistantId) => axios.get(`/Chapters/assistant/${assistantId}`),
}

// ── PAGES ─────────────────────────────────────────────────────────────────────
export const pagesService = {
  // Backend nhan param key: "chapterId"
  getAll: (chapterId) =>
    axios.get('/Pages', { params: chapterId != null ? { chapterId } : undefined }),
  getById: (id) => axios.get(`/Pages/${id}`),
  create: (formData) => axios.post('/Pages', formData),
  update: (id, formData) => axios.put(`/Pages/${id}`, formData),
  composite: (pageId) => axios.post(`/Pages/${pageId}/composite`),
  updateStatus: (id, status) => axios.patch(`/Pages/${id}/status`, { status }),
  softDelete: (id) => axios.delete(`/Pages/${id}/soft`),
  hardDelete: (id) => axios.delete(`/Pages/${id}`),
}

// ── PAGE LAYERS ────────────────────────────────────────────────────────────────
export const pageLayersService = {
  // Backend nhan param key: "pageId"
  getAll: (pageId) =>
    axios.get('/PageLayers', { params: pageId != null ? { pageId } : undefined }),
  getById: (id) => axios.get(`/PageLayers/${id}`),
  create: (formData) => axios.post('/PageLayers', formData),
  update: (id, formData) => axios.put(`/PageLayers/${id}`, formData),
  toggleVisibility: (id) => axios.patch(`/PageLayers/${id}/visibility`),
  softDelete: (id) => axios.delete(`/PageLayers/${id}/soft`),
  hardDelete: (id) => axios.delete(`/PageLayers/${id}`),
}

// ── PAGE ISSUES ────────────────────────────────────────────────────────────────
// Backend hien tai chi nhan param "chapterId" (khong co pageId).
// Tuong lai nen fix: (1) them ChapterId vao PageIssue entity,
// (2) doi interface GetAllAsync -> GetAllAsync(int? pageId),
// (3) doi controller nhan ?pageId= thay vi ?chapterId=
export const pageIssuesService = {
  getAll: (chapterId) =>
    axios.get('/PageIssues', { params: chapterId != null ? { chapterId } : undefined }),
  getById: (id) => axios.get(`/PageIssues/${id}`),
  create: (data) => axios.post('/PageIssues', data),
  update: (id, data) => axios.put(`/PageIssues/${id}`, data),
  delete: (id) => axios.delete(`/PageIssues/${id}`),
}

// ── GENRES ─────────────────────────────────────────────────────────────────────
export const genresService = {
  getAll: () => axios.get('/Genres'),
  getById: (id) => axios.get(`/Genres/${id}`),
  create: (data) => axios.post('/Genres', data),
}

// ── TAGS ────────────────────────────────────────────────────────────────────────
export const tagsService = {
  getAll: () => axios.get('/Tags'),
  getById: (id) => axios.get(`/Tags/${id}`),
  create: (data) => axios.post('/Tags', data),
}

// ── USERS ─────────────────────────────────────────────────────────────────────
export const usersService = {
  getProfile: () => axios.get('/users/profile'),
  updateProfile(data, roleKey) {
    const endpoint = roleKey === 'MANGAKA'
      ? '/users/profile/mangaka'
      : roleKey === 'ASSISTANT'
        ? '/users/profile/assistant'
        : '/users/profile/mangaka'

    const fd = new FormData()
    if (roleKey === 'MANGAKA') {
      if (data.fullName) fd.append('fullname', data.fullName)
      if (data.penName) fd.append('penname', data.penName)
      if (data.bio !== undefined) fd.append('bio', data.bio)
      if (data.phoneNumber !== undefined) fd.append('phonenumber', data.phoneNumber)
      if (data.bankName !== undefined) fd.append('bankname', data.bankName)
      if (data.bankAccountNumber !== undefined) fd.append('bankaccountnumber', data.bankAccountNumber)
      if (data.bankAccountName !== undefined) fd.append('bankaccountname', data.bankAccountName)
    } else if (roleKey === 'ASSISTANT') {
      if (data.fullName) fd.append('fullname', data.fullName)
      if (data.phoneNumber !== undefined) fd.append('phonenumber', data.phoneNumber)
      if (data.portfolioUrl !== undefined) fd.append('portfolioUrl', data.portfolioUrl)
      if (data.isAvailable !== undefined) fd.append('isAvailable', String(data.isAvailable))
      if (data.skills !== undefined) fd.append('skills', data.skills)
      if (data.softwareUsed !== undefined) fd.append('softwareused', data.softwareUsed)
      if (data.bankName !== undefined) fd.append('bankname', data.bankName)
      if (data.bankAccountNumber !== undefined) fd.append('bankaccountnumber', data.bankAccountNumber)
      if (data.bankAccountName !== undefined) fd.append('bankaccountname', data.bankAccountName)
    } else {
      if (data.fullName) fd.append('fullname', data.fullName)
    }
    return axios.put(endpoint, fd)
  },
  getAvailableAssistants: () => axios.get('/users/available-assistants'),
}

// ── ASSISTANT PROFILE ─────────────────────────────────────────────────────────
export const assistantProfileService = {
  getAvailable: () => axios.get('/users/available-assistants'),
  getById: (id) => axios.get(`/users/${id}`),
}

// ── ERROR HELPER ──────────────────────────────────────────────────────────────
export function getApiErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback ?? err?.message ?? 'Da xay ra loi.'
  if (typeof data === 'string') return data
  return (
    data.message ??
    data.msg ??
    data.error ??
    data.Message ??
    data.errorMessage ??
    data.title ??
    fallback ??
    JSON.stringify(data)
  )
}

// ── ASSISTANT PROFILE ────────────────────────────────────────────────────────────
// ── CONTRACTS (MangakaAssistant) ──────────────────────────────────────────────
export const contractsService = {
  getAll({ mangakaId, assistantId } = {}) {
    return axios.get('/MangakaAssistant', {
      params: {
        ...(mangakaId != null && { mangakaId }),
        ...(assistantId != null && { assistantId }),
      },
    })
  },
  getById: (id) => axios.get(`/MangakaAssistant/${id}`),
  create: (data) => axios.post('/MangakaAssistant', data),
  update: (id, data) => axios.put(`/MangakaAssistant/${id}`, data),
  updateStatus: (id, status) => axios.patch(`/MangakaAssistant/${id}/status`, { status }),
}

// ── PAGE ISSUES ───────────────────────────────────────────────────────────────
export const pageIssuesApi = {
  getAll({ chapterId } = {}) {
    return axios.get('/PageIssues', {
      params: chapterId != null ? { chapterId } : undefined,
    })
  },
  getById: (id) => axios.get(`/PageIssues/${id}`),
  create: (data) => axios.post('/PageIssues', data),
  update: (id, data) => axios.put(`/PageIssues/${id}`, data),
  updateStatus: (id, status) => axios.patch(`/PageIssues/${id}/status`, { status }),
  softDelete: (id) => axios.delete(`/PageIssues/${id}/soft`),
  hardDelete: (id) => axios.delete(`/PageIssues/${id}`),
}
