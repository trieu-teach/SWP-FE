import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Globe,
  Loader2,
  Plug,
  RefreshCw,
} from 'lucide-react'
import { api } from '@/api/index.js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const NAV = [
  { id: 'site', label: 'Trang web', icon: Globe },
  { id: 'notif', label: 'Thông báo', icon: Bell },
  { id: 'storage', label: 'Lưu trữ', icon: Database },
  { id: 'api', label: 'API & Tích hợp', icon: Plug },
  { id: 'danger', label: 'Vùng nguy hiểm', icon: AlertTriangle },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function Row({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t py-4 first:border-t-0 first:pt-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc ? <div className="text-xs text-muted-foreground">{desc}</div> : null}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const [active, setActive] = useState('site')
  const [cfg, setCfg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getSettings()
      setCfg(data)
    } catch (err) {
      setError(err.message || 'Lỗi tải cài đặt')
      console.error('Load settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(section, data) {
    try {
      await api.updateSettings(section, data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  function set(section, key, val) {
    setCfg(c => ({ ...c, [section]: { ...c[section], [key]: val } }))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="mt-3 text-sm">Đang tải cài đặt...</p>
      </div>
    )
  }

  if (error || !cfg) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-destructive">
            <p className="text-sm font-medium">{error || 'Không thể tải cài đặt'}</p>
            <Button onClick={loadSettings} className="mt-4">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quản lý cấu hình hệ thống</p>
        </div>
        {saved ? (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" variant="secondary">
            <CheckCircle2 className="size-3.5" />
            Đã lưu thay đổi
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          <nav className="space-y-1">
            {NAV.map(n => {
              const Icon = n.icon
              const isActive = active === n.id
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setActive(n.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {n.label}
                </button>
              )
            })}
          </nav>
        </Card>

        <div>
          {active === 'site' ? (
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt trang web</CardTitle>
                <CardDescription>Thông tin cơ bản hiển thị với người dùng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tên trang web</Label>
                    <Input value={cfg.site.name} onChange={e => set('site', 'name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slogan</Label>
                    <Input value={cfg.site.tagline} onChange={e => set('site', 'tagline', e.target.value)} />
                  </div>
                </div>
                <Row label="Chế độ bảo trì" desc="Tạm thời ẩn trang với người dùng thông thường">
                  <Toggle checked={cfg.site.maintenanceMode} onChange={() => set('site', 'maintenanceMode', !cfg.site.maintenanceMode)} />
                </Row>
                <div className="border-t pt-4">
                  <Button onClick={() => handleSave('site', cfg.site)}>Lưu thay đổi</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {active === 'notif' ? (
            <Card>
              <CardHeader>
                <CardTitle>Thông báo qua email</CardTitle>
                <CardDescription>Cấu hình khi nào admin nhận email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { key: 'emailOnReport', label: 'Có báo cáo mới', desc: 'Gửi email khi có báo cáo vi phạm' },
                  { key: 'emailOnNewUser', label: 'Người dùng mới đăng ký', desc: 'Thông báo khi có tài khoản mới' },
                  { key: 'emailOnComment', label: 'Bình luận bị gắn cờ', desc: 'Khi bình luận bị báo cáo' },
                ].map(row => (
                  <Row key={row.key} label={row.label} desc={row.desc}>
                    <Toggle
                      checked={cfg.notifications[row.key]}
                      onChange={() => set('notifications', row.key, !cfg.notifications[row.key])}
                    />
                  </Row>
                ))}
                <div className="space-y-2 border-t pt-5">
                  <Label>Slack Webhook URL</Label>
                  <Input
                    value={cfg.notifications.slackWebhook}
                    onChange={e => set('notifications', 'slackWebhook', e.target.value)}
                    placeholder="https://hooks.slack.com/..."
                  />
                  <p className="text-xs text-muted-foreground">Để trống nếu không dùng Slack</p>
                </div>
                <div className="pt-4">
                  <Button onClick={() => handleSave('notifications', cfg.notifications)}>Lưu thay đổi</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {active === 'storage' ? (
            <Card>
              <CardHeader>
                <CardTitle>Lưu trữ</CardTitle>
                <CardDescription>Dung lượng hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Cloud className="size-4 text-muted-foreground" />
                  <span>Đã dùng: <strong>{cfg.storage.used} {cfg.storage.unit}</strong></span>
                  <span className="text-muted-foreground">·</span>
                  <span>Tổng: <strong>{cfg.storage.total} {cfg.storage.unit}</strong></span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-rose-400 transition-all"
                    style={{ width: `${(cfg.storage.used / cfg.storage.total * 100).toFixed(0)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {(cfg.storage.used / cfg.storage.total * 100).toFixed(0)}% dung lượng đã sử dụng
                </p>
              </CardContent>
            </Card>
          ) : null}

          {active === 'api' ? (
            <Card>
              <CardHeader>
                <CardTitle>API & Tích hợp</CardTitle>
                <CardDescription>Quản lý API keys và webhook</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={cfg.apiKey} className="font-mono text-xs" />
                  <Button variant="outline">
                    <RefreshCw className="size-4" />
                    Tạo mới
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Không chia sẻ API key với bất kỳ ai</p>
              </CardContent>
            </Card>
          ) : null}

          {active === 'danger' ? (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-5" />
                  Vùng nguy hiểm
                </CardTitle>
                <CardDescription>Những hành động không thể hoàn tác</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Xoá tất cả bình luận', desc: 'Xoá vĩnh viễn toàn bộ bình luận trong hệ thống' },
                  { label: 'Reset thống kê', desc: 'Đặt lại toàn bộ dữ liệu thống kê về 0' },
                  { label: 'Xoá dữ liệu người dùng', desc: 'Xoá toàn bộ tài khoản người dùng (không thể phục hồi)' },
                ].map(item => (
                  <div key={item.label} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => alert('Chức năng này đã bị khoá trong môi trường demo')}>
                      {item.label}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}