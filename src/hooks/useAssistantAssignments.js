import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSession } from '@/lib/auth'
import { contractsService } from '@/api'
import { chaptersService } from '@/api'
import { seriesService } from '@/api'
import { pagesService } from '@/api'

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
    chapterNum: chapter.chapternumber ?? chapter.ChapterNumber ?? null,
    title: chapter.title ?? chapter.Title ?? null,
    status: chapter.status ?? 'pending',
    pages: pageList.map(p => ({
      id: p.pageid ?? p.Pageid ?? p.id,
      url: p.pageImageUrl ?? p.pageimageurl ?? p.Pageimageurl,
      pageNum: p.pagenumber ?? p.PageNumber ?? p.pageNumber,
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

      // Merge: chapter assignments + contract assignments chua co chapter
      const seriesIds = new Set(chapterAssignments.map(a => a.seriesId).filter(Boolean))
      const extraContracts = contractAssignments.filter(a => !a.seriesId || !seriesIds.has(a.seriesId))

      setAssignments([...chapterAssignments, ...extraContracts])
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

  return { assignments, loading, error, refresh }
}
