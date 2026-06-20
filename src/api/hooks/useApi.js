import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  seriesService,
  chaptersService,
  pagesService,
  pageLayersService,
  pageIssuesService,
  usersService,
  genresService,
  tagsService,
} from '@/api'

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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData) => seriesService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
    },
  })
}

export function useUpdateSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => seriesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
      queryClient.invalidateQueries({ queryKey: ['series', id] })
    },
  })
}

export function useUpdateSeriesStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => seriesService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
      queryClient.invalidateQueries({ queryKey: ['series', id] })
    },
  })
}

export function useDeleteSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => seriesService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
    },
  })
}

export function useHardDeleteSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => seriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
    },
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

export function useCreateChapter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => chaptersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
  })
}

export function useUpdateChapter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => chaptersService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      queryClient.invalidateQueries({ queryKey: ['chapters', id] })
    },
  })
}

export function useDeleteChapter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => chaptersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
  })
}

/* ===========================
   PAGES HOOKS
   =========================== */
export function usePages(chapterId) {
  return useQuery({
    queryKey: ['pages', chapterId ? { chapterId } : 'all'],
    queryFn: () => pagesService.getAll(chapterId).then(res => res.data ?? []),
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData) => pagesService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}

export function useUpdatePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pagesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.invalidateQueries({ queryKey: ['pages', id] })
    },
  })
}

export function useDeletePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => pagesService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}

export function usePageComposite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pageId) => pagesService.composite(pageId),
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.invalidateQueries({ queryKey: ['pages', pageId] })
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData) => pageLayersService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageLayers'] })
    },
  })
}

export function useUpdatePageLayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pageLayersService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pageLayers'] })
      queryClient.invalidateQueries({ queryKey: ['pageLayers', id] })
    },
  })
}

export function useDeletePageLayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => pageLayersService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageLayers'] })
    },
  })
}

export function useTogglePageLayerVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => pageLayersService.toggleVisibility(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageLayers'] })
    },
  })
}

/* ===========================
   PAGE ISSUES HOOKS
   =========================== */
export function usePageIssues(chapterId) {
  return useQuery({
    queryKey: ['pageIssues', chapterId ? { chapterId } : 'all'],
    queryFn: () => pageIssuesService.getAll(chapterId).then(res => res.data ?? []),
  })
}

export function usePageIssueById(id) {
  return useQuery({
    queryKey: ['pageIssues', id],
    queryFn: () => pageIssuesService.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreatePageIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => pageIssuesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageIssues'] })
    },
  })
}

export function useUpdatePageIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pageIssuesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pageIssues'] })
      queryClient.invalidateQueries({ queryKey: ['pageIssues', id] })
    },
  })
}

export function useDeletePageIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => pageIssuesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageIssues'] })
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

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.getAll().then(res => res.data ?? []),
    staleTime: 5 * 60 * 1000,
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => usersService.updateProfile(data, roleKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
