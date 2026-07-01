import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Calendar, Loader2, User as UserIcon } from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import axiosClient from '@/api/axiosClient.js'
import { useChapters } from '@/api/hooks'
import { getSession, logout } from '@/lib/auth.js'
import { NAV_LINKS } from '@/constants/tantou.js'
import { statusVariant, statusLabel } from './TantouEditor.helpers.js'
import { CoverThumb } from '@/components/User/Tantou/CoverThumb.jsx'
import { StatusStepper } from '@/components/User/Tantou/StatusStepper.jsx'
import './TantouEditor.css'

export default function SeriesProfile() {
  const { seriesId } = useParams()
  const navigate = useNavigate()
  const user = getSession()

  const [series, setSeries] = useState(null)
  const [loading, setLoading] = useState(true)

  const { data: chapters = [], isLoading: chaptersLoading } = useChapters(seriesId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    axiosClient.get(`/Series/${seriesId}`)
      .then(res => { if (!cancelled) setSeries(res.data?.data ?? res.data) })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [seriesId])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const latestSubmission = [...chapters].sort((a, b) => {
    const ad = new Date(a.createdat ?? a.Createdat ?? 0).getTime()
    const bd = new Date(b.createdat ?? b.Createdat ?? 0).getTime()
    return bd - ad
  })[0]

  return (
    <div className="ws-page--tantou flex min-h-screen flex-col bg-background">
      <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />

      <main className="page-container flex-1 space-y-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" /> Quay lại
        </Button>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Đang tải...
          </div>
        ) : !series ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Không tìm thấy series.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row">
                <CoverThumb url={series.coverimageurl} sizeClass="size-32" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h1 className="text-2xl font-bold">{series.title}</h1>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <UserIcon className="size-3.5" />
                      {series.mangakaname ?? series.mangakaName ?? `Mangaka #${series.mangakaid}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(series.status)}>{statusLabel(series.status)}</Badge>
                    {series.genre && <Badge variant="outline">{series.genre}</Badge>}
                    {series.agerating && <Badge variant="outline">{series.agerating}</Badge>}
                  </div>
                  <StatusStepper status={series.status} />
                  {series.synopsis && (
                    <p className="text-sm text-muted-foreground">{series.synopsis}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <BookOpen className="size-5 text-sky-600" />
                  <div>
                    <p className="text-xl font-bold">{chaptersLoading ? '—' : chapters.length}</p>
                    <p className="text-xs text-muted-foreground">Tổng chapter</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="sm:col-span-2">
                <CardContent className="flex items-center gap-3 p-4">
                  <Calendar className="size-5 text-sky-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {latestSubmission
                        ? `Ch.${latestSubmission.chapternumber ?? latestSubmission.Chapternumber ?? '—'} — ${statusLabel(latestSubmission.status ?? latestSubmission.Status)}`
                        : 'Chưa có submission'}
                    </p>
                    <p className="text-xs text-muted-foreground">Submission gần nhất</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Tất cả chapter</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {chapters.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Chưa có chapter nào.</p>
                ) : (
                  chapters.map(ch => (
                    <div
                      key={ch.chapterid ?? ch.Chapterid}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">
                        Ch. {ch.chapternumber ?? ch.Chapternumber}
                      </span>
                      <Badge variant={statusVariant(ch.status ?? ch.Status)}>
                        {statusLabel(ch.status ?? ch.Status)}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}