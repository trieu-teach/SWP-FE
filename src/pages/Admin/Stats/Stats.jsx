import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'
import { api } from '@/api/index.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function formatNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n
}

export default function Stats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('6m')

  useEffect(() => { api.getStats().then(d => { setData(d); setLoading(false) }) }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="mt-3 text-sm">Đang tải thống kê...</p>
      </div>
    )
  }

  const maxReads = Math.max(...data.monthly.map(m => m.reads))
  const maxUsers = Math.max(...data.monthly.map(m => m.users))
  const maxTop = data.topManga[0].reads

  const conicStop = data.deviceSplit.reduce((acc, d) => {
    const prev = acc.total
    acc.total += d.pct
    acc.parts.push(`${d.color} ${prev}% ${acc.total}%`)
    return acc
  }, { total: 0, parts: [] })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thống kê</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tổng quan hoạt động của hệ thống</p>
        </div>
        <div className="flex rounded-md border bg-card p-1">
          {[['7d', '7 ngày'], ['1m', '1 tháng'], ['6m', '6 tháng'], ['1y', '1 năm']].map(([v, l]) => (
            <Button
              key={v}
              size="sm"
              variant={range === v ? 'secondary' : 'ghost'}
              onClick={() => setRange(v)}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.overview.map(s => {
          const up = s.dir === 'up'
          return (
            <Card key={s.label}>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <div className="mt-1.5 text-2xl font-bold tracking-tight">{s.value}</div>
                <div className={cn('mt-1 flex items-center gap-1 text-xs font-medium', up ? 'text-emerald-600' : 'text-amber-600')}>
                  {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {s.delta}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lượt đọc theo tháng</CardTitle>
          <CardDescription>So sánh lượt đọc và người dùng mới</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-violet-500" />
              Lượt đọc
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-teal-500" />
              Người dùng mới
            </div>
          </div>
          <div className="flex h-52 items-end gap-4 border-b border-muted">
            {data.monthly.map((m, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1.5">
                  <div
                    className="w-3 rounded-t bg-violet-500/80 transition-all group-hover:bg-violet-600"
                    style={{ height: `${(m.reads / maxReads) * 100}%` }}
                    title={formatNum(m.reads)}
                  />
                  <div
                    className="w-3 rounded-t bg-teal-500/80 transition-all group-hover:bg-teal-600"
                    style={{ height: `${(m.users / maxUsers) * 100}%` }}
                    title={m.users}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4">
            {data.monthly.map((m, i) => (
              <div key={i} className="flex-1 text-center text-xs text-muted-foreground">{m.month}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top truyện được đọc nhiều nhất</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topManga.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                  #{i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 truncate text-sm font-medium">{m.title}</div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-rose-400"
                      style={{ width: `${(m.reads / maxTop) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{formatNum(m.reads)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thiết bị truy cập</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div
              className="relative grid size-40 place-items-center rounded-full"
              style={{ background: `conic-gradient(${conicStop.parts.join(',')})` }}
            >
              <div className="grid size-24 place-items-center rounded-full bg-card text-lg font-bold">
                {data.deviceSplit[0].pct}%
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {data.deviceSplit.map(d => (
                <div key={d.label} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-sm" style={{ background: d.color }} />
                    {d.label}
                  </div>
                  <span className="font-medium tabular-nums text-muted-foreground">{d.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
