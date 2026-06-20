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

// ── GENRES & TAGS ───────────────────────────────────────────────────────────────
export const genresService = {
  getAll: () => axios.get('/Genres'),
}

export const tagsService = {
  getAll: () => axios.get('/Tags'),
}

// ── USERS ─────────────────────────────────────────────────────────────────────
export const usersService = {
  getProfile: () => axios.get('/users/profile'),
  // Backend có 2 endpoint riêng: PUT /users/profile/mangaka  và  PUT /users/profile/assistant
  // Gọi endpoint phù hợp dựa trên roleKey
  updateProfile: (data, roleKey) => {
    const endpoint = roleKey === 'MANGAKA'
      ? '/users/profile/mangaka'
      : roleKey === 'ASSISTANT'
        ? '/users/profile/assistant'
        : '/users/profile/mangaka'
    return axios.put(endpoint, data)
  },
}
