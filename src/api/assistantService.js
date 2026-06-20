import axios from './axiosClient'

function unwrap(res) {
  return res?.data !== undefined ? res.data : res
}

export const assistantService = {
  // Backend chi nhan param "chapterId" (khong co pageId).
  // getMyAssignments() tam thoi lay tat ca chapters roi filter o FE.
  getMyAssignments() {
    return axios.get('/Chapters').then(unwrap)
  },

  getChapterPages(chapterId) {
    return axios.get('/Pages', { params: { chapterId } }).then(unwrap)
  },

  // Backend chi nhan param "chapterId" (khong co pageId).
  // Lay issues theo chapter, tra ve list cac note cho cac page trong chapter do.
  getPageIssues(chapterId) {
    return axios.get('/PageIssues', { params: { chapterId } }).then(unwrap)
  },

  createPageIssue(data) {
    return axios.post('/PageIssues', data).then(unwrap)
  },

  updatePageIssue(id, data) {
    return axios.put(`/PageIssues/${id}`, data).then(unwrap)
  },

  deletePageIssue(id) {
    return axios.delete(`/PageIssues/${id}`).then(unwrap)
  },
}
