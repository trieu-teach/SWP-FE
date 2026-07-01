import axiosClient from './axiosClient.js'

const SUBMISSIONS_API = '/Submissions'

export const submissionsService = {
  // Lấy submissions gửi cho 1 Mangaka
  getByMangaka: (mangakaId) =>
    axiosClient.get(`${SUBMISSIONS_API}/mangaka/${mangakaId}`),

  // Lấy submissions mà Assistant đã gửi
  getByAssistant: (assistantId) =>
    axiosClient.get(`${SUBMISSIONS_API}/assistant/${assistantId}`),

  // Lấy 1 submission
  getById: (id) =>
    axiosClient.get(`${SUBMISSIONS_API}/${id}`),

  // Tạo submission mới (Mangaka gửi reference cho Assistant)
  create: (data) =>
    axiosClient.post(SUBMISSIONS_API, data),

  // Cập nhật submission (Assistant vẽ xong, submit)
  update: (id, data) =>
    axiosClient.put(`${SUBMISSIONS_API}/${id}`, data),

  // Xóa submission
  delete: (id) =>
    axiosClient.delete(`${SUBMISSIONS_API}/${id}`),
}
