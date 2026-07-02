import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSession } from '@/lib/auth'
import { contractsService } from '@/api'
import { chaptersService } from '@/api'
import { seriesService } from '@/api'
import { pagesService } from '@/api'
import { submissionsService } from '@/api/submissionsService.js'
import { listAssistantSubmissions } from '@/utils/assistantWorkspaceStorage.js'

async function enrichChapterWithSeries(chapter) {
  const cid = chapter.chapterid ?? chapter.Chapterid ?? chapter.id ?? null
  const sid = chapter.seriesid ?? chapter.Seriesid ?? null

  let seriesTitle = null
  if (sid) {
    try {
      const sr = await seriesService.getById(sid)
      seriesTitle = sr?.data?.title ?? null
    } catch { /* ignore */ }
  }

  let pageList = []
  try {
    const pagesRes = await pagesService.getAll(cid)
    pageList = Array.isArray(pagesRes?.data) ? pagesRes.data : []
  } catch { /* ignore */ }

  return {
    contractId: null,
    mangakaId: chapter.mangakaid ?? chapter.Mangakaid ?? null,
    mangakaName: null,
    seriesId: sid,
    chapterId: cid,
    seriesTitle: seriesTitle ?? 'Unknown Series',
    chapterNum: chapter.chapter_number ?? chapter.chapternumber ?? chapter.ChapterNumber ?? null,
    title: chapter.title ?? chapter.Title ?? null,
    status: chapter.status ?? 'pending',
    pages: pageList.map(p => ({
      id: p.pageid,
      url: p.pageimageurl,
      pageNum: p.pagenumber,
    })),
    pageCount: pageList.length,
  }
}

async function enrichContract(contract) {
  const sid = contract.seriesId ?? contract.seriesid ?? contract.Seriesid ?? contract.series_id ?? null

  if (!sid) {
    return {
      contractId: contract.contractId ?? contract.contract_id ?? contract.ContractId ?? contract.id ?? null,
      mangakaId: contract.mangakaId ?? contract.mangaka_id ?? contract.Mangakaid ?? null,
      mangakaName: contract.mangakaName ?? contract.mangaka_name ?? null,
      seriesId: null,
      chapterId: null,
      seriesTitle: contract.seriesTitle ?? contract.series_title ?? null,
      chapterNum: null,
      title: null,
      status: contract.status ?? 'Active',
      pages: [],
      pageCount: 0,
    }
  }

  try {
    const sr = await seriesService.getById(sid)
    const seriesTitle = sr?.data?.title ?? 'Unknown Series'

    return {
      contractId: contract.contractId ?? contract.contract_id ?? contract.ContractId ?? contract.id ?? null,
      mangakaId: contract.mangakaId ?? contract.mangaka_id ?? contract.Mangakaid ?? null,
      mangakaName: contract.mangakaName ?? contract.mangaka_name ?? null,
      seriesId: sid,
      chapterId: null,
      seriesTitle,
      chapterNum: null,
      title: null,
      status: contract.status ?? 'Active',
      pages: [],
      pageCount: 0,
    }
  } catch {
    return {
      contractId: contract.contractId ?? contract.contract_id ?? null,
      mangakaId: contract.mangakaId ?? contract.mangaka_id ?? null,
      mangakaName: contract.mangakaName ?? contract.mangaka_name ?? null,
      seriesId: sid,
      chapterId: null,
      seriesTitle: 'Unknown Series',
      chapterNum: null,
      title: null,
      status: contract.status ?? 'Active',
      pages: [],
      pageCount: 0,
    }
  }
}

export function useAssistantAssignments() {
  const session = getSession()
  const assistantId = session?.id ?? session?.userid ?? null
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!assistantId) {
      console.log('[useAssistantAssignments] no assistantId, skipping')
      setAssignments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Lay tat ca chapter duoc gan cho assistant nay
      const chaptersRes = await chaptersService.getByAssistant(assistantId)
      const chapterList = Array.isArray(chaptersRes?.data) ? chaptersRes.data : []

      // Enrich chapters thanh assignments
      const chapterAssignments = await Promise.all(chapterList.map(enrichChapterWithSeries))

      // Lay contracts (quan he mangaka-assistant)
      const contractsRes = await contractsService.getAll({ assistantId })
      const contractList = Array.isArray(contractsRes?.data) ? contractsRes.data : []
      const contractAssignments = await Promise.all(contractList.map(enrichContract))

      // Lay submissions tu localStorage
      const hydratedSubs = listAssistantSubmissions(assistantId)

      // Lay submissions tu backend API
      let apiSubmissions = []
      try {
        const subsRes = await submissionsService.getByAssistant(assistantId)
        apiSubmissions = Array.isArray(subsRes?.data) ? subsRes.data : []
      } catch (err) {
        console.warn('[useAssistantAssignments] failed to fetch API submissions:', err)
      }

      // Convert API submissions sang format assignment
      const apiAssignmentItems = apiSubmissions.map(s => {
        const mapped = {
          id: s.submission_id,
          submissionId: s.submission_id,
          chapterId: s.chapter_id,
          seriesTitle: s.series_title ?? 'Unknown Series',
          chapterNum: s.chapter_num,
          mangakaId: s.mangaka_id,
          referenceImageUrl: s.reference_image_url,
          mangakaImageUrl: s.reference_image_url ?? s.mangaka_image_url,
          notes: s.notes ? String(s.notes).split('; ').filter(Boolean) : [],
          status: (s.status ?? 'pending').toLowerCase(),
          pageCount: s.reference_image_url ? 1 : 0,
          createdAt: s.created_at,
          _source: 'api',
        }
          return mapped
      })

      // Merge: chapter assignments + contract assignments + submissions (deduplicate by key)
      const seriesIds = new Set(chapterAssignments.map(a => a.seriesId).filter(Boolean))
      const extraContracts = contractAssignments.filter(a => !a.seriesId || !seriesIds.has(a.seriesId))

      // Deduplicate by composite key (source + id) to avoid collisions
      const seen = new Set()
      const dedup = (arr) => arr.filter(a => {
        const source = a._source ?? (a.id ? 'submission' : a.contractId ? 'contract' : 'chapter')
        const id = a.id ?? a.contractId ?? a.chapterId
        const key = `${source}:${id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Merge: chapter assignments + contract assignments + submissions from localStorage + submissions from API
      const merged = dedup([...chapterAssignments, ...extraContracts, ...hydratedSubs, ...apiAssignmentItems])
      setAssignments(merged)
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Khong tai duoc danh sach viec.'
      setError(msg)
      toast.error(msg)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [assistantId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Refresh when:
  //  - assistant changes
  //  - the page becomes visible again (e.g. user switches back to tab, or returns from /mangaka)
  //  - a "contract-updated" event fires (new assignment accepted, status changed, etc.)
  useEffect(() => {
    if (!assistantId) return

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onContractUpdated = () => { void refresh() }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('assistant-assignments-changed', onContractUpdated)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('assistant-assignments-changed', onContractUpdated)
    }
  }, [assistantId, refresh])

  return { assignments, loading, error, refresh }
}
