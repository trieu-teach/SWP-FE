import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Gavel } from 'lucide-react'
import Header from '@/components/User/Header/Header.jsx'
import Footer from '@/components/User/Footer/Footer.jsx'
import { WorkspaceHero } from '@/components/layout/WorkspaceHero.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSession, logout } from '@/lib/auth.js'
import {
  approveEbDebutSeries,
  readEbDebutApproved,
  readEbDebutPending,
} from '@/utils/ebDebutStorage.js'
import { LABEL_EDITOR_BOARD } from '@/constants/roleTerminology.js'

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/mangaka', label: 'Mangaka' },
  { to: '/tantou', label: 'Tantou Editor' },
]

export default function Eb() {
  const navigate = useNavigate()
  const user = getSession()
  const [, bump] = useState(0)
  const refresh = useCallback(() => bump(n => n + 1), [])

  useEffect(() => {
    function onSync() { refresh() }
    window.addEventListener('mk-eb-pending-update', onSync)
    window.addEventListener('storage', onSync)
    window.addEventListener('mk-eb-approved-update', onSync)
    return () => {
      window.removeEventListener('mk-eb-pending-update', onSync)
      window.removeEventListener('storage', onSync)
      window.removeEventListener('mk-eb-approved-update', onSync)
    }
  }, [refresh])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const approved = readEbDebutApproved()
  const pending = readEbDebutPending().filter(p => p?.title && !approved[p.title])
  const approvedList = Object.keys(approved).filter(k => approved[k])

  function handleApprove(title) {
    approveEbDebutSeries(title)
    toast.success(`Đã chấp nhận "${title}".`)
    refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />

      <WorkspaceHero
        label={`${LABEL_EDITOR_BOARD} · demo`}
        title={`Xin chào${user?.name ? `, ${user.name}` : ''}`}
        description="Biểu quyết series lần đầu — chỉ xem tóm tắt từ Mangaka / Tantou."
      />

      <main className="page-container flex-1 space-y-8 py-8">
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Gavel className="size-5 text-primary" />
              Hàng chờ duyệt
            </h2>
            <p className="text-sm text-muted-foreground">
              Đồng bộ từ <Link to="/mangaka" className="font-medium text-primary hover:underline">Mangaka</Link>
              {' / '}
              <Link to="/tantou" className="font-medium text-primary hover:underline">Tantou</Link>
            </p>
          </div>

          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Không có series lần đầu trong hàng chờ.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pending.map(p => (
                <Card key={p.id ?? p.title} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.title}</h3>
                        <Badge variant="secondary">✦ Lần đầu</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[p.genres?.slice(0, 2).join(' · '), p.formatLabel?.replace(/\s*\(.*\)$/, ''), p.authorName].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button onClick={() => handleApprove(p.title)}>
                      <CheckCircle2 className="size-4" />
                      Chấp nhận
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {approvedList.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Đã chấp nhận</h2>
            <div className="flex flex-wrap gap-2">
              {approvedList.map(title => (
                <Badge key={title} variant="outline" className="px-3 py-1">
                  {title}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
