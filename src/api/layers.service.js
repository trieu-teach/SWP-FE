// Dead code — cac endpoint nay khong co trong backend.
// Cac chuc nang tuong tu da duoc implement trong api.js / assistantLayersService.js.
// Giu file nay de nhu la placeholder, khong import o bat cu dau.

// import axios from './axiosClient'
//
// function unwrap(res) {
//   return res?.data !== undefined ? res.data : res
// }
//
// export const layersService = {
//   list(pageId) {
//     return axios.get(`/chapters/pages/${pageId}/layers`).then(unwrap)
//   },
//   uploadLayer(pageId, { file, index, onUploadProgress }) {
//     const fd = new FormData()
//     fd.append('image', file)
//     if (index !== undefined && index !== null) fd.append('index', String(index))
//     return axios
//       .post(`/chapters/pages/${pageId}/layers`, fd, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//         onUploadProgress,
//       })
//       .then(unwrap)
//   },
//   updateLayer(pageId, layerId, patch) {
//     return axios.patch(`/chapters/pages/${pageId}/layers/${layerId}`, patch).then(unwrap)
//   },
//   deleteLayer(pageId, layerId) {
//     return axios.delete(`/chapters/pages/${pageId}/layers/${layerId}`).then(unwrap)
//   },
//   listVersions(pageId, layerId) {
//     return axios.get(`/chapters/pages/${pageId}/layers/${layerId}/versions`).then(unwrap)
//   },
//   uploadVersion(pageId, layerId, { file, note, changeSummary, onUploadProgress }) {
//     const fd = new FormData()
//     fd.append('image', file)
//     if (note) fd.append('note', note)
//     if (changeSummary) fd.append('change_summary', changeSummary)
//     return axios
//       .post(`/chapters/pages/${pageId}/layers/${layerId}/versions`, fd, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//         onUploadProgress,
//       })
//       .then(unwrap)
//   },
//   rollback(pageId, layerId, versionId) {
//     return axios.post(`/chapters/pages/${pageId}/layers/${layerId}/rollback/${versionId}`).then(unwrap)
//   },
//   finalize(pageId) {
//     return axios.post(`/chapters/pages/${pageId}/finalize`).then(unwrap)
//   },
//   getFinal(pageId) {
//     return axios.get(`/chapters/pages/${pageId}/final`).then(unwrap)
//   },
// }
