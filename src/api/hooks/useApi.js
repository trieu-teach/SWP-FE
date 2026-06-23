import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSession } from '@/lib/auth'
import {
  seriesService,
  chaptersService,
  pagesService,
  pageLayersService,
  pageIssuesApi,
  usersService,
  assistantProfileService,
  genresService,
  tagsService,
  contractsService,
} from '@/api'
import { notificationsService } from '@/api/notificationsService'

/* ===========================
   AVAILABLE ASSISTANTS
   =========================== */
export function useAvailableAssistants() {
  return useQuery({
    queryKey: ['available-assistants'],
    queryFn: () => usersService.getAvailableAssistants().then(res => res?.data ?? []),
  })
}

/* ===========================
   SERIES HOOKS
   =========================== */
export function useSeries() {
  return useQuery({
    queryKey: ['series'],
    queryFn: () => seriesService.getAll().then(res => res.data ?? []),
  })
}

export function useSeriesByMangaka(mangakaId) {
  return useQuery({
    queryKey: ['series', 'mangaka', mangakaId],
    queryFn: () => seriesService.getByMangaka(mangakaId).then(res => res.data ?? []),
    enabled: !!mangakaId,
  })
}

export function useSeriesById(id) {
  return useQuery({
    queryKey: ['series', id],
    queryFn: () => seriesService.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => seriesService.create(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['series'] }) },
  })
}

export function useUpdateSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => seriesService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['series'] })
      qc.invalidateQueries({ queryKey: ['series', id] })
    },
  })
}

export function useUpdateSeriesStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => seriesService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['series'] })
      qc.invalidateQueries({ queryKey: ['series', id] })
    },
  })
}

export function useDeleteSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => seriesService.softDelete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['series'] }) },
  })
}

export function useHardDeleteSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => seriesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['series'] }) },
  })
}

/* ===========================
   CHAPTERS HOOKS
   =========================== */
export function useChapters(seriesId) {
  return useQuery({
    queryKey: ['chapters', seriesId ? { seriesId } : 'all'],
    queryFn: () => chaptersService.getAll(seriesId).then(res => res.data ?? []),
  })
}

export function useChapterById(id) {
  return useQuery({
    queryKey: ['chapters', id],
    queryFn: () => chaptersService.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useChaptersByAssistant(assistantId) {
  return useQuery({
    queryKey: ['chapters', 'assistant', assistantId],
    queryFn: () => chaptersService.getByAssistant(assistantId).then(res => res?.data ?? []),
    enabled: !!assistantId,
  })
}

export function useCreateChapter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => chaptersService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chapters'] }) },
  })
}

export function useUpdateChapter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => chaptersService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['chapters'] })
      qc.invalidateQueries({ queryKey: ['chapters', id] })
    },
  })
}

export function useDeleteChapter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => chaptersService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chapters'] }) },
  })
}

/* ===========================
   PAGES HOOKS
   =========================== */
export function usePages(chapterId) {
  const numericChapterId = Number(chapterId)
  return useQuery({
    queryKey: ['pages', Number.isFinite(numericChapterId) ? { chapterId: numericChapterId } : 'all'],
    queryFn: () => pagesService.getAll(numericChapterId).then(res => res.data ?? []),
    enabled: Number.isFinite(numericChapterId),
  })
}

export function usePageById(id) {
  return useQuery({
    queryKey: ['pages', id],
    queryFn: () => pagesService.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreatePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => pagesService.create(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pages'] }) },
  })
}

export function useUpdatePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pagesService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pages'] })
      qc.invalidateQueries({ queryKey: ['pages', id] })
    },
  })
}

export function useDeletePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => pagesService.softDelete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pages'] }) },
  })
}

export function usePageComposite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pageId) => pagesService.composite(pageId),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({ queryKey: ['pages'] })
      qc.invalidateQueries({ queryKey: ['pages', pageId] })
    },
  })
}

/* ===========================
   PAGE LAYERS HOOKS
   =========================== */
export function usePageLayers(pageId) {
  return useQuery({
    queryKey: ['pageLayers', pageId ? { pageId } : 'all'],
    queryFn: () => pageLayersService.getAll(pageId).then(res => res.data ?? []),
  })
}

export function usePageLayerById(id) {
  return useQuery({
    queryKey: ['pageLayers', id],
    queryFn: () => pageLayersService.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreatePageLayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => pageLayersService.create(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pageLayers'] }) },
  })
}

export function useUpdatePageLayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pageLayersService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pageLayers'] })
      qc.invalidateQueries({ queryKey: ['pageLayers', id] })
    },
  })
}

export function useDeletePageLayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => pageLayersService.softDelete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pageLayers'] }) },
  })
}

export function useTogglePageLayerVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => pageLayersService.toggleVisibility(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pageLayers'] }) },
  })
}

/* ===========================
   PAGE ISSUES HOOKS
   =========================== */
export function usePageIssues(chapterId) {
  return useQuery({
    queryKey: ['pageIssues', chapterId ? { chapterId } : 'all'],
    queryFn: () => pageIssuesApi.getAll({ chapterId }).then(res => res?.data ?? []),
  })
}

export function usePageIssueById(id) {
  return useQuery({
    queryKey: ['pageIssues', id],
    queryFn: () => pageIssuesApi.getById(id).then(res => res?.data),
    enabled: !!id,
  })
}

export function useCreatePageIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => pageIssuesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pageIssues'] }) },
  })
}

export function useUpdatePageIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pageIssuesApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pageIssues'] })
      qc.invalidateQueries({ queryKey: ['pageIssues', id] })
    },
  })
}

export function useUpdatePageIssueStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => pageIssuesApi.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pageIssues'] })
      qc.invalidateQueries({ queryKey: ['pageIssues', id] })
    },
  })
}

export function useDeletePageIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => pageIssuesApi.softDelete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pageIssues'] }) },
  })
}

/* ===========================
   CONTRACTS (MangakaAssistant)
   =========================== */
export function useContracts({ mangakaId, assistantId } = {}) {
  return useQuery({
    queryKey: ['contracts', { mangakaId, assistantId }],
    queryFn: () => contractsService.getAll({ mangakaId, assistantId }).then(res => res?.data ?? []),
  })
}

export function useContractById(id) {
  return useQuery({
    queryKey: ['contracts', 'detail', id],
    queryFn: () => contractsService.getById(id).then(res => res?.data),
    enabled: !!id,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => contractsService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }) },
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => contractsService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['contracts', 'detail', id] })
    },
  })
}

export function useUpdateContractStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => contractsService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['contracts', 'detail', id] })
    },
  })
}

/* ===========================
   GENRES & TAGS HOOKS
   =========================== */
export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: () => genresService.getAll().then(res => res.data ?? []),
    staleTime: 5 * 60 * 1000,
  })
}

export function useGenreById(id) {
  return useQuery({
    queryKey: ['genres', id],
    queryFn: () => genresService.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateGenre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => genresService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['genres'] }) },
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.getAll().then(res => res.data ?? []),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTagById(id) {
  return useQuery({
    queryKey: ['tags', id],
    queryFn: () => tagsService.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => tagsService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }) },
  })
}

/* ===========================
   ASSISTANT PROFILE HOOKS
   =========================== */
export function useAvailableAssistantProfiles() {
  return useQuery({
    queryKey: ['assistant-profiles', 'available'],
    queryFn: () => assistantProfileService.getAvailable().then(res => res?.data ?? []),
  })
}

export function useAssistantProfile(assistantId) {
  return useQuery({
    queryKey: ['assistant-profiles', assistantId],
    queryFn: () => assistantProfileService.getById(assistantId).then(res => res?.data),
    enabled: !!assistantId,
  })
}

/* ===========================
   USERS HOOKS
   =========================== */
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => usersService.getProfile().then(res => res.data),
  })
}

export function useUpdateProfile(roleKey) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => usersService.updateProfile(data, roleKey ?? 'MANGAKA'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      if (roleKey === 'ASSISTANT') {
        qc.invalidateQueries({ queryKey: ['assistant-profiles', 'available'] })
      }
    },
  })
}

/* ===========================
   NOTIFICATIONS HOOKS
   =========================== */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    staleTime: 30 * 1000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => notificationsService.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => notificationsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })
}
