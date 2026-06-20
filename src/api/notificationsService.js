import axios from './axiosClient'

function unwrap(res) {
  return res?.data !== undefined ? res.data : res
}

export const notificationsService = {
  list(params = {}) {
    return axios.get('/notifications', { params }).then(unwrap).catch(() => [])
  },

  markRead(id) {
    return axios.patch(`/notifications/${id}/read`).then(unwrap)
  },

  markAllRead() {
    return axios.patch('/notifications/read-all').then(unwrap)
  },

  delete(id) {
    return axios.delete(`/notifications/${id}`).then(unwrap)
  },
}
