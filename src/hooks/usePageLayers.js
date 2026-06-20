import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { pageLayersService } from '@/api/api.js'

function apiLayerToUi(raw) {
  if (!raw || typeof raw !== 'object') return { id: '', name: '', imageUrl: '', visible: true, opacity: 100, blendMode: 'normal', index: 0 }
  return {
    id: String(raw._id ?? raw.id ?? raw.pageLayerId ?? raw.layerid ?? raw.Layerid ?? ''),
    name: String(raw.name ?? raw.layerName ?? raw.LayerName ?? `Layer ${raw.index ?? raw.zindex ?? 0}`),
    imageUrl: raw.imageUrl ?? raw.url ?? raw.layerUrl ?? raw.Fileurl ?? raw.fileurl ?? '',
    visible: raw.visible ?? raw.isVisible ?? raw.IsVisible ?? true,
    opacity: Number(raw.opacity ?? raw.Opacity ?? 100),
    blendMode: raw.blendMode ?? raw.blend_mode ?? 'normal',
    index: Number(raw.index ?? raw.zindex ?? raw.zIndex ?? raw.Zindex ?? 0),
    currentVersionNo: raw.currentVersionNo ?? raw.current_version_no ?? 0,
    currentVersionId: raw.currentVersionId ?? raw.current_version_id ?? '',
  }
}

function apiVersionToUi(raw) {
  if (!raw || typeof raw !== 'object') return { id: '', versionNo: 0, imageUrl: '', uploadedAt: null, note: '' }
  return {
    id: String(raw._id ?? raw.id ?? ''),
    versionNo: Number(raw.versionNo ?? raw.version_no ?? raw.no ?? 1),
    imageUrl: raw.imageUrl ?? raw.url ?? '',
    uploadedAt: raw.uploadedAt ?? raw.uploaded_at ?? raw.createdAt ?? null,
    note: raw.note ?? raw.changeSummary ?? raw.change_summary ?? '',
  }
}

function buildLayerFormData({ file, layerName, pageId, uploaderId, zIndex, opacity }) {
  const fd = new FormData()
  fd.append('layerFile', file)
  if (pageId != null) fd.append('pageid', String(pageId))
  if (uploaderId != null) fd.append('uploaderid', String(uploaderId))
  if (layerName) fd.append('layername', layerName)
  if (zIndex != null) fd.append('zindex', String(zIndex))
  if (opacity != null) fd.append('opacity', String(opacity))
  return fd
}

function buildLayerPatchFormData({ layerName, zIndex, opacity, versionNumber, file }) {
  const fd = new FormData()
  if (layerName !== undefined) fd.append('layername', layerName)
  if (zIndex !== undefined) fd.append('zindex', String(zIndex))
  if (opacity !== undefined) fd.append('opacity', String(opacity))
  if (versionNumber !== undefined) fd.append('versionnumber', String(versionNumber))
  if (file !== undefined) fd.append('layerFile', file)
  return fd
}

export function usePageLayers(pageId) {
  const [layers, setLayers] = useState([])
  const [versions, setVersions] = useState({})
  const [finalImage, setFinalImage] = useState(null)
  const [finalComposedAt, setFinalComposedAt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  const refresh = useCallback(async () => {
    if (!pageId) return
    setLoading(true)
    try {
      const res = await pageLayersService.getAll(pageId)
      // pageLayersService.getAll tra Axios response, lay res.data
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      const mapped = list.map(apiLayerToUi)
      mapped.sort((a, b) => a.index - b.index)
      setLayers(mapped)
    } catch (err) {
      toast.error('Khong tai duoc layer.')
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const loadVersions = useCallback(
    async (layerId) => {
      if (!pageId || !layerId) return []
      try {
        const res = await pageLayersService.getById(layerId)
        const raw = res?.data ?? res
        const list = Array.isArray(raw?.versions) ? raw.versions : []
        const mapped = list.map(apiVersionToUi)
        setVersions((cur) => ({ ...cur, [layerId]: mapped }))
        return mapped
      } catch {
        setVersions((cur) => ({ ...cur, [layerId]: [] }))
        return []
      }
    },
    [pageId],
  )

  const addLayer = useCallback(
    async ({ file, index, uploaderId }) => {
      if (!pageId) return null
      setUploading(true)
      try {
        const fd = buildLayerFormData({
          file,
          layerName: `Layer ${(index ?? 0) + 1}`,
          pageId,
          uploaderId: uploaderId ?? null,
          zIndex: index ?? null,
          opacity: 100,
        })
        const res = await pageLayersService.create(fd)
        const raw = res?.data ?? res
        const ui = apiLayerToUi(raw)
        if (!ui.id) throw new Error('Backend không trả về layer sau khi tạo.')
        setLayers((cur) => {
          const next = [...cur.filter((l) => l.id !== ui.id), ui]
          next.sort((a, b) => a.index - b.index)
          return next
        })
        toast.success(`Da them layer #${ui.index}.`)
        return ui
      } catch (err) {
        toast.error('Khong upload duoc layer.')
        throw err
      } finally {
        setUploading(false)
      }
    },
    [pageId],
  )

  const updateLayer = useCallback(
    async (layerId, patch) => {
      if (!pageId) return
      // Cập nhật optimistic trước
      setLayers((cur) =>
        cur.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
      )
      try {
        const fd = buildLayerPatchFormData(patch)
        await pageLayersService.update(layerId, fd)
      } catch (err) {
        toast.error('Khong cap nhat duoc layer.')
        await refresh()
      }
    },
    [pageId, refresh],
  )

  const deleteLayer = useCallback(
    async (layerId) => {
      if (!pageId) return
      const target = layers.find((l) => l.id === layerId)
      const ok = window.confirm(`Xoa layer #${target?.index ?? '?'}? Lich su version cu cung mat.`)
      if (!ok) return
      try {
        await pageLayersService.delete(layerId)
        setLayers((cur) => cur.filter((l) => l.id !== layerId))
        setVersions((cur) => {
          const next = { ...cur }
          delete next[layerId]
          return next
        })
        toast.success('Da xoa layer.')
      } catch (err) {
        toast.error('Khong xoa duoc layer.')
      }
    },
    [pageId, layers],
  )

  const uploadNewVersion = useCallback(
    async (layerId, { file }) => {
      if (!pageId) return null
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('layerFile', file)
        const res = await pageLayersService.update(layerId, fd)
        const raw = res?.data ?? res
        const version = apiVersionToUi(raw)
        setVersions((cur) => ({
          ...cur,
          [layerId]: [version, ...(cur[layerId] ?? [])],
        }))
        const ui = apiLayerToUi(raw)
        if (ui.id) {
          setLayers((cur) =>
            cur.map((l) =>
              l.id === layerId
                ? {
                    ...l,
                    imageUrl: version.imageUrl || ui.imageUrl,
                    currentVersionNo: version.versionNo || ui.currentVersionNo,
                    currentVersionId: version.id || ui.currentVersionId,
                  }
                : l,
            ),
          )
        }
        toast.success(`Da upload version ${version.versionNo} cho layer.`)
        return version
      } catch (err) {
        toast.error('Khong upload duoc version moi.')
        throw err
      } finally {
        setUploading(false)
      }
    },
    [pageId],
  )

  const rollback = useCallback(
    async (layerId, versionId) => {
      if (!pageId) return
      // Backend hiện tại chưa có endpoint rollback — disable tạm thời
      toast.error('Chức năng rollback chưa được hỗ trợ bởi backend.')
    },
    [pageId],
  )

  const reorderLayers = useCallback(
    async (orderedIds) => {
      const reordered = orderedIds
        .map((id, idx) => {
          const layer = layers.find((l) => l.id === id)
          return layer ? { ...layer, index: idx } : null
        })
        .filter(Boolean)
      setLayers(reordered)
      try {
        await Promise.all(
          orderedIds.map((id, idx) => {
            const fd = new FormData()
            fd.append('zindex', String(idx))
            return pageLayersService.update(id, fd)
          }),
        )
      } catch (err) {
        toast.error('Khong sap xep lai layer.')
        await refresh()
      }
    },
    [pageId, layers, refresh],
  )

  const finalize = useCallback(async () => {
    if (!pageId) return null
    // Backend hiện tại chưa có endpoint finalize/composite layers
    toast.error('Chức năng gộp layer chưa được hỗ trợ bởi backend.')
    return null
  }, [pageId])

  const visibleLayers = useMemo(() => layers.filter((l) => l.visible), [layers])

  return {
    layers,
    visibleLayers,
    versions,
    finalImage,
    finalComposedAt,
    loading,
    uploading,
    finalizing,
    refresh,
    loadVersions,
    addLayer,
    updateLayer,
    deleteLayer,
    uploadNewVersion,
    rollback,
    reorderLayers,
    finalize,
  }
}
