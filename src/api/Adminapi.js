import axiosClient from '@/api/axiosClient.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function unwrap(res) {
    if (!res) return null
    const payload = res.data
    if (payload && typeof payload === 'object' && 'data' in payload && !Array.isArray(payload)) {
        return payload.data
    }
    return payload ?? null
}

const SERIES_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#8b5cf6', '#f43f5e', '#0ea5e9']
function initials(title = '') {
    return title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??'
}
function randomColor(id) {
    return SERIES_COLORS[(id ?? Math.random() * 8 | 0) % SERIES_COLORS.length]
}

// ─── API object ───────────────────────────────────────────────────────────────
export const api = {

    // ── MANGA / SERIES ──────────────────────────────────────────────────────────
    async getMangaList() {
        const res = await axiosClient.get('/Series')
        const data = unwrap(res) ?? []
        return data.map((s, i) => ({
            id: s.seriesid ?? s.series_id ?? s.id,
            title: s.title ?? `Series #${i + 1}`,
            author: s.authorname ?? s.author ?? '—',
            status: (s.status ?? 'ongoing').toLowerCase(),
            chapters: s.totalchapters ?? s.total_chapters ?? s.chapters ?? 0,
            reads: s.totalviews ?? s.total_views ?? s.reads ?? 0,
            genre: (s.genres ?? []).map(g => typeof g === 'string' ? g : (g?.genre_name ?? g?.genrename ?? g?.name ?? '')).filter(Boolean),
            createdAt: s.createdat ? new Date(s.createdat).toLocaleDateString('vi-VN') : '—',
            updatedAt: s.updatedat ? new Date(s.updatedat).toLocaleDateString('vi-VN') : '—',
            bg: randomColor(s.seriesid ?? i),
            initials: initials(s.title),
        }))
    },

    async createManga(payload) {
        const res = await axiosClient.post('/Series', payload)
        return unwrap(res)
    },

    async updateManga(id, payload) {
        const res = await axiosClient.put(`/Series/${id}`, payload)
        return unwrap(res)
    },

    async deleteManga(id) {
        const res = await axiosClient.delete(`/Series/${id}`)
        return unwrap(res)
    },

    // ── CHAPTERS ────────────────────────────────────────────────────────────────
    async getChaptersByManga(seriesId) {
        const res = await axiosClient.get('/Chapters', { params: { seriesId } })
        const data = unwrap(res) ?? []
        return data.map(c => ({
            id: c.chapterid ?? c.chapter_id ?? c.id,
            number: c.chapternumber ?? c.chapter_number ?? c.number,
            title: c.title ?? '',
            pages: c.totalpages ?? c.total_pages ?? c.pages ?? 0,
            uploadedBy: c.uploadedby ?? c.uploaded_by ?? c.createdby ?? '—',
            uploadedAt: c.createdat ? new Date(c.createdat).toLocaleDateString('vi-VN') : '—',
        }))
    },

    async createChapter(payload) {
        const res = await axiosClient.post('/Chapters', payload)
        return unwrap(res)
    },

    async deleteChapter(id) {
        const res = await axiosClient.delete(`/Chapters/${id}`)
        return unwrap(res)
    },

    // ── PROFILE ─────────────────────────────────────────────────────────────────
    async getProfile() {
        const res = await axiosClient.get('/Users/profile')
        const d = unwrap(res) ?? {}
        return {
            name: d.fullname ?? d.full_name ?? d.username ?? d.name ?? 'Admin',
            email: d.email ?? '—',
            role: d.role ?? d.rolename ?? 'ADMIN',
            status: d.status ?? 'active',
            createdAt: d.createdat ? new Date(d.createdat).toLocaleDateString('vi-VN') : '—',
            initials: (d.fullname ?? d.username ?? 'AD').slice(0, 2).toUpperCase(),
        }
    },

    // ── SETTINGS ────────────────────────────────────────────────────────────────
    async getSettings() {
        try {
            const res = await axiosClient.get('/Settings')
            return unwrap(res)
        } catch {
            return {
                site: {
                    name: 'MangaPublish',
                    tagline: 'Nền tảng xuất bản manga',
                    maintenanceMode: false,
                },
                notifications: {
                    emailOnReport: true,
                    emailOnNewUser: false,
                    emailOnComment: true,
                    slackWebhook: '',
                },
                storage: { used: 12.4, total: 50, unit: 'GB' },
                apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            }
        }
    },

    async updateSettings(section, data) {
        try {
            const res = await axiosClient.put(`/Settings/${section}`, data)
            return unwrap(res)
        } catch {
            return { success: true }
        }
    },

    // ── STATS ───────────────────────────────────────────────────────────────────
    async getStats() {
        try {
            const res = await axiosClient.get('/Dashboard/Admin/Stats')
            return unwrap(res)
        } catch {
            return {
                overview: [
                    { label: 'Lượt đọc', value: '—', delta: '—', dir: 'up' },
                    { label: 'Người dùng mới', value: '—', delta: '—', dir: 'up' },
                    { label: 'Chương mới', value: '—', delta: '—', dir: 'up' },
                    { label: 'Bình luận', value: '—', delta: '—', dir: 'up' },
                ],
                monthly: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map(m => ({ month: m, reads: 0, users: 0 })),
                topManga: [{ title: 'Chưa có dữ liệu', reads: 1 }],
                deviceSplit: [
                    { label: 'Mobile', pct: 60, color: '#6366f1' },
                    { label: 'Desktop', pct: 30, color: '#10b981' },
                    { label: 'Tablet', pct: 10, color: '#f59e0b' },
                ],
            }
        }
    },

    // ── DASHBOARD ────────────────────────────────────────────────────────────────
    async getDashboardData() {
        const [ovRes, statsRes, topRes, usersRes] = await Promise.all([
            axiosClient.get('/Dashboard/Admin/Overview'),
            axiosClient.get('/Dashboard/Admin/SeriesStats'),
            axiosClient.get('/Dashboard/TopSeries'),
            axiosClient.get('/admin/users'),
        ])

        const users = usersRes.data?.data ?? []
        const count = (roleId) => users.filter(u => (u.role_id ?? u.roleId) === roleId).length

        return {
            overview: {
                total_assistants: count(5), // Assistant = 5
                total_ebs:        count(2), // EB = 2
                total_tantous:    count(3), // Tantou = 3
                total_mangakas:   count(4), // Mangaka = 4
                ...ovRes.data,
            },
            seriesStats: statsRes.data,
            topSeries: Array.isArray(topRes.data) ? topRes.data : [],
        }
    },

    // ── USERS ────────────────────────────────────────────────────────────────────
    async getUsers() {
        const res = await axiosClient.get('/admin/users')
        const users = res.data?.data ?? []
        // Backend trả status dạng "Active"/"Inactive"/"Locked" (PascalCase).
        // Map về key nội bộ: cả "Inactive" và "Locked" đều coi là 'banned'
        // (không thể đăng nhập), giữ "Active" thành 'active'.
        const STATUS_FROM_API = { active: 'active', inactive: 'banned', locked: 'banned' }
        return users.map(u => ({
            id: u.user_id ?? u.userId,
            name: u.full_name ?? u.fullName ?? u.username,
            email: u.email ?? '—',
            role: (u.role_name ?? u.roleName ?? 'user').toLowerCase(),
            status: STATUS_FROM_API[String(u.status ?? 'active').toLowerCase()] ?? 'active',
            joinDate: (u.created_at ?? u.createdAt)
                ? new Date(u.created_at ?? u.createdAt).toLocaleDateString('vi-VN')
                : '—',
            initials: (u.full_name ?? u.fullName ?? u.username ?? 'U').slice(0, 2).toUpperCase(),
            readCount: u.read_count ?? u.readCount ?? 0,
            comments: u.comment_count ?? u.commentCount ?? 0,
            reports: u.report_count ?? u.reportCount ?? 0,
        }))
    },

    async updateUserStatus(id, status) {
        // Backend chỉ chấp nhận đúng 3 giá trị: "Active", "Inactive", "Locked"
        // (xem [AllowedValues] trên UserDto.AdminUpdateStatusRequest.Status).
        // Frontend dùng key nội bộ 'active'/'banned' nên cần map sang đúng enum.
        const STATUS_TO_API = { active: 'Active', banned: 'Locked' }
        const apiStatus = STATUS_TO_API[status] ?? status
        const res = await axiosClient.patch(`/admin/users/${id}/status`, { Status: apiStatus })
        return res.data
    },

    // PUT /admin/users/{id} là full-update endpoint. Field role phải đúng tên
    // cột FK ở backend (RoleId), không phải "Role" — nếu không backend có thể
    // bind sai và gây lỗi FK constraint khi insert giá trị không hợp lệ.
    async updateUserRole(id, roleId, currentInfo = {}) {
        const body = {
            FullName: currentInfo.name,
            Email: currentInfo.email,
            RoleId: roleId,
        }
        const res = await axiosClient.put(`/admin/users/${id}`, body)
        return res.data
    },

    // POST /api/auth/create-staff — endpoint đúng để tạo tài khoản nội bộ
    // (EB, Tantou Editor, Mangaka, Assistant...). Field dùng camelCase
    // (userName, password, fullName, email, roleId), khác với AdminUsersController
    // (PascalCase). Response trả kèm token/refreshToken cho tài khoản mới tạo
    // nhưng ta không cần dùng — chỉ cần biết tạo thành công.
    async createUser({ username, password, fullName, email, roleId }) {
        const body = {
            userName: username,
            password,
            fullName,
            email,
            roleId,
        }
        const res = await axiosClient.post('/auth/create-staff', body)
        return unwrap(res)
    },
}