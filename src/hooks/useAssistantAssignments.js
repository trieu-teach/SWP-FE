import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSession } from '@/lib/auth'
import { contractsService } from '@/api'
import { chaptersService } from '@/api'
import { seriesService } from '@/api'
import { pagesService } from '@/api'
import { pageIssuesService } from '@/api'

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
  const sid = contract.seriesId ?? contract.seriesid ?? contract.Seriesid ?? null

  if (!sid) {
    return {
      contractId: contract.contractId ?? contract.ContractId ?? contract.id ?? null,
      mangakaId: contract.mangakaId ?? contract.Mangakaid ?? null,
      mangakaName: contract.mangakaName ?? null,
      seriesId: null,
      chapterId: null,
      seriesTitle: contract.seriesTitle ?? null,
      chapterNum: null,
      title: null,
      status: contract.status ?? 'pending',
      pages: [],
      pageCount: 0,
    }
  }

  try {
    const sr = await seriesService.getById(sid)
    const seriesTitle = sr?.data?.title ?? 'Unknown Series'

    return {
      contractId: contract.contractId ?? contract.ContractId ?? contract.id ?? null,
      mangakaId: contract.mangakaId ?? contract.Mangakaid ?? null,
      mangakaName: contract.mangakaName ?? null,
      seriesId: sid,
      chapterId: null,
      seriesTitle,
      chapterNum: null,
      title: null,
      status: contract.status ?? 'pending',
      pages: [],
      pageCount: 0,
    }
  } catch {
    return {
      contractId: contract.contractId ?? null,
      mangakaId: contract.mangakaId ?? null,
      mangakaName: contract.mangakaName ?? null,
      seriesId: sid,
      chapterId: null,
      seriesTitle: 'Unknown Series',
      chapterNum: null,
      title: null,
      status: contract.status ?? 'pending',
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
      console.log('[useAssistantAssignments] chaptersRes raw:', JSON.stringify(chaptersRes?.data))
      const chapterList = Array.isArray(chaptersRes?.data) ? chaptersRes.data : []

      // Enrich chapters thanh assignments
      const chapterAssignments = await Promise.all(chapterList.map(enrichChapterWithSeries))
      console.log('[useAssistantAssignments] chapterAssignments:', chapterAssignments.map(a => ({ chapterId: a.chapterId, pageCount: a.pageCount, firstPageUrl: a.pages[0]?.url })))

      // Lay contracts (quan he mangaka-assistant) — chua co chapter
      const contractsRes = await contractsService.getAll({ assistantId })
      const contractList = Array.isArray(contractsRes?.data) ? contractsRes.data : []
      console.log('[useAssistantAssignments] contractsRes →', JSON.stringify(contractList.map(c => ({ contractId: c.contract_id, mangakaId: c.mangaka_id, assistantId: c.assistant_id }))))
      const contractAssignments = await Promise.all(contractList.map(enrichContract))

      // Merge: chapter assignments + contract assignments
      // (da bo localStorage submissions - bay gio chi lay tu API)
      const seriesIds = new Set(chapterAssignments.map(a => a.seriesId).filter(Boolean))
      const extraContracts = contractAssignments.filter(a => !a.seriesId || !seriesIds.has(a.seriesId))

      const merged = [...chapterAssignments, ...extraContracts]
      console.log('[useAssistantAssignments] merged assignments →', merged.map(a => ({
        key: a.contractId ?? a.chapterId,
        chapterId: a.chapterId,
        seriesTitle: a.seriesTitle,
        pageCount: a.pageCount,
        source: a.contractId ? 'contract' : 'chapter',
      })))
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
