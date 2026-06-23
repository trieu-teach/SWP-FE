import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSession } from '@/lib/auth'
import { contractsService } from '@/api'
import { chaptersService } from '@/api'
import { pagesService } from '@/api'

async function enrichContract(contract) {
  const cid = contract.chapterId ?? contract.chapterid ?? contract.Chapterid ?? null
  const sid = contract.seriesId ?? contract.seriesid ?? contract.Seriesid ?? null

  if (!cid) {
    return {
      contractId: contract.id ?? contract.contractId ?? contract.mangakaassistantid ?? contract.Mangakaassistantid ?? null,
      mangakaId: contract.mangakaId ?? contract.mangakaid ?? contract.Mangakaid ?? null,
      mangakaName: contract.mangakaName ?? contract.mangakaname ?? null,
      seriesId: sid,
      chapterId: null,
      seriesTitle: contract.seriesTitle ?? contract.seriestitle ?? null,
      chapterNum: null,
      title: null,
      status: contract.status ?? 'pending',
      pages: [],
      pageCount: 0,
    }
  }

  try {
    const [chRes, pagesRes] = await Promise.all([
      chaptersService.getById(cid),
      pagesService.getAll(cid),
    ])
    const ch = chRes?.data ?? chRes ?? {}
    const pageList = Array.isArray(pagesRes?.data) ? pagesRes.data : (Array.isArray(pagesRes) ? pagesRes : [])

    return {
      contractId: contract.id ?? contract.contractId ?? contract.mangakaassistantid ?? contract.Mangakaassistantid ?? null,
      mangakaId: contract.mangakaId ?? contract.mangakaid ?? contract.Mangakaid ?? null,
      mangakaName: contract.mangakaName ?? contract.mangakaname ?? null,
      seriesId: sid,
      chapterId: cid,
      seriesTitle: contract.seriesTitle ?? contract.seriestitle ?? ch.seriesTitle ?? ch.series?.title ?? 'Unknown Series',
      chapterNum: ch.chapterNumber ?? ch.chapternumber ?? ch.ChapterNumber ?? null,
      title: ch.title ?? ch.Title ?? null,
      status: contract.status ?? ch.status ?? 'pending',
      pages: pageList.map(p => ({
        id: p.id ?? p.pageid ?? p.Pageid,
        url: p.pageImageUrl ?? p.pageimageurl ?? p.Pageimageurl,
        pageNum: p.pageNumber ?? p.pagenumber ?? p.PageNumber,
      })),
      pageCount: pageList.length,
    }
  } catch {
    return {
      contractId: contract.id ?? null,
      mangakaId: contract.mangakaId ?? null,
      mangakaName: contract.mangakaName ?? null,
      seriesId: sid,
      chapterId: cid,
      seriesTitle: contract.seriesTitle ?? contract.seriestitle ?? 'Unknown',
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
      const res = await contractsService.getAll({ assistantId })
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])

      const enriched = await Promise.all(list.map(enrichContract))
      setAssignments(enriched)
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
