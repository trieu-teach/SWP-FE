import axiosClient from './axiosClient'

export const layersService = {
  // GET /PageLayers?pageId=N
  list(pageId) {
    return axiosClient.get('/PageLayers', { params: pageId != null ? { pageId } : undefined })
  },

  // POST /PageLayers (multipart): layerFile + pageid + uploaderid + layername + zindex + opacity
  uploadLayer(pageId, { file, index, uploaderId, layerName, opacity = 100 }) {
    const fd = new FormData()
    fd.append('layerFile', file)
    fd.append('pageid', String(pageId))
    if (uploaderId != null) fd.append('uploaderid', String(uploaderId))
    if (layerName) fd.append('layername', layerName)
    if (index != null) fd.append('zindex', String(index))
    fd.append('opacity', Number(opacity).toFixed(2))
    return axiosClient.post('/PageLayers', fd)
  },

  // PUT /PageLayers/:id (multipart)
  updateLayer(layerId, patch) {
    const fd = new FormData()
    if (patch.layerName !== undefined) fd.append('layername', patch.layerName)
    if (patch.zIndex !== undefined) fd.append('zindex', String(patch.zIndex))
    if (patch.opacity !== undefined) fd.append('opacity', Number(patch.opacity).toFixed(2))
    if (patch.versionNumber !== undefined) fd.append('versionnumber', String(patch.versionNumber))
    if (patch.file !== undefined) fd.append('layerFile', patch.file)
    return axiosClient.put(`/PageLayers/${layerId}`, fd)
  },

  // DELETE /PageLayers/:id/soft
  softDeleteLayer(layerId) {
    return axiosClient.delete(`/PageLayers/${layerId}/soft`)
  },

  // PATCH /PageLayers/:id/visibility
  toggleVisibility(layerId) {
    return axiosClient.patch(`/PageLayers/${layerId}/visibility`)
  },

  // GET /Pages/:id/composite (gộp ảnh → trả Pageimageurl)
  finalize(pageId) {
    return axiosClient.post(`/Pages/${pageId}/composite`)
  },
}
