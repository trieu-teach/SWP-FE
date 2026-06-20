import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { assistantService } from '@/api/assistantService.js'

export function useAssistantAssignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await assistantService.getMyAssignments()
      const list = Array.isArray(data) ? data : []

      // Enrich each chapter with its pages
      const enriched = await Promise.all(
        list.map(async (chapter) => {
          try {
            const pages = await assistantService.getChapterPages(chapter.chapterid ?? chapter.Chapterid)
            const pageList = Array.isArray(pages) ? pages : []
            return {
              chapterId: chapter.chapterid ?? chapter.Chapterid,
              seriesTitle: chapter.seriesTitle ?? chapter.series?.title ?? 'Unknown Series',
              chapterNum: chapter.chapternumber ?? chapter.ChapterNumber,
              title: chapter.title ?? chapter.Title,
              status: chapter.status ?? 'pending',
              pages: pageList.map(p => ({
                id: p.pageid ?? p.Pageid,
                url: p.pageimageurl ?? p.Pageimageurl,
                pageNum: p.pagenumber ?? p.PageNumber,
              })),
              pageCount: pageList.length,
            }
          } catch {
            return {
              chapterId: chapter.chapterid ?? chapter.Chapterid,
              seriesTitle: chapter.seriesTitle ?? 'Unknown',
              chapterNum: chapter.chapternumber ?? 0,
              status: chapter.status ?? 'pending',
              pages: [],
              pageCount: 0,
            }
          }
        }),
      )
      setAssignments(enriched)
    } catch (err) {
      const msg = err?.message ?? 'Khong tai duoc danh sach viec duoc gan.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { assignments, loading, error, refresh }
}
