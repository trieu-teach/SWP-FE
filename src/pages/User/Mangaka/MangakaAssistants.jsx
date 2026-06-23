import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Clock,
  Filter,
  Globe,
  Search,
  Send,
  Sparkles,
  Star,
  UserCheck,
  Users,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  ASSISTANT_SPECIALTIES,
  ASSISTANT_STYLES,
  specialtyLabel,
  styleLabel,
} from '@/constants/assistantCatalog.js'
import {
  useAvailableAssistantProfiles,
  useContracts,
  useCreateContract,
} from '@/api'

const AVAILABILITY_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Có thể thuê' },
  { value: 'mine', label: 'Đội của tôi' },
  { value: 'pending', label: 'Đang chờ' },
]

const AVAILABILITY_BADGE = {
  available: { label: 'Sẵn sàng', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400' },
  mine: { label: 'Đội của bạn', className: 'bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-400' },
  pending: { label: 'Chờ phản hồi', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400' },
}

function AssistantAvatar({ profile, size = 'default', className }) {
  return (
    <Avatar size={size} className={cn('ring-2 ring-background', className)}>
      <AvatarFallback
        className="text-sm font-semibold text-white"
        style={{ background: profile.avatarColor }}
      >
        {profile.initials}
      </AvatarFallback>
    </Avatar>
  )
}

function ActionButton({ profile }) {
  if (profile.availability === 'pending') {
    return (
      <Button className="h-9 w-full" size="sm" variant="secondary" disabled>
        Đang chờ phản hồi
      </Button>
    )
  }
  if (profile.availability === 'mine') {
    return (
      <Button className="h-9 w-full" size="sm" variant="outline" disabled>
        <CheckCircle2 className="size-3.5" />
        Đã trong đội
      </Button>
    )
  }
  return (
    <Button className="h-9 w-full" size="sm" variant="outline" disabled>
      Không thể gửi yêu cầu
    </Button>
  )
}

function AssistantProfileCard({ profile, onHire }) {
  const badge = AVAILABILITY_BADGE[profile.availability] ?? AVAILABILITY_BADGE.available
  const canHire = profile.availability === 'available' && profile.isAvailable !== false

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md',
        profile.availability === 'mine' && 'ring-1 ring-violet-500/30',
      )}
    >
      <div className="flex flex-1 flex-col p-5 pb-4">
        <div className="flex min-h-[92px] gap-3">
          <AssistantAvatar profile={profile} size="lg" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight">{profile.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge className={cn('w-fit', badge.className)}>{badge.label}</Badge>
              {profile.isAvailable === false ? (
                <Badge className="w-fit bg-zinc-100 text-zinc-500 dark:bg-zinc-500/15 dark:text-zinc-400">Tạm ngưng</Badge>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{profile.handle}</p>
            <div className="mt-2 flex h-5 items-center gap-1 text-xs text-amber-600">
              <Star className="size-3 shrink-0 fill-current" />
              <strong>{profile.rating}</strong>
              <span className="text-muted-foreground">· {profile.completedPages} trang</span>
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 h-10 text-sm leading-5 text-muted-foreground">
          {profile.bio}
        </p>

        <div className="mt-3 flex h-14 flex-wrap content-start gap-1.5 overflow-hidden">
          {profile.specialties.map(s => (
            <Badge key={s} variant="secondary" className="h-6 shrink-0 text-[10px]">
              {specialtyLabel(s)}
            </Badge>
          ))}
          <Badge variant="outline" className="h-6 shrink-0 text-[10px]">
            {styleLabel(profile.style)}
          </Badge>
        </div>

        <div className="mt-auto grid h-8 grid-cols-2 items-center gap-2 pt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Clock className="size-3 shrink-0" />
            <span className="truncate">{profile.responseTime}</span>
          </span>
          <span className="inline-flex min-w-0 items-center justify-end gap-1">
            <Globe className="size-3 shrink-0" />
            <span className="truncate">{profile.languages.join(' · ')}</span>
          </span>
        </div>
      </div>

      <CardFooter className="shrink-0 border-t bg-muted/20 p-4 pt-3">
        {canHire ? (
          <Button className="h-9 w-full" size="sm" onClick={() => onHire(profile)}>
            <Send className="size-3.5" />
            Gửi yêu cầu thuê
          </Button>
        ) : (
          <ActionButton profile={profile} />
        )}
      </CardFooter>
    </Card>
  )
}

export default function MangakaAssistants({ mangakaId, mangakaName }) {
  const [query, setQuery] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [styleFilter, setStyleFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [hireTarget, setHireTarget] = useState(null)
  const [hireSalaryAmount, setHireSalaryAmount] = useState('')
  const [hireSalaryType, setHireSalaryType] = useState('Monthly')
  const [hireContractTerms, setHireContractTerms] = useState('')
  const [hireStartDate, setHireStartDate] = useState('')
  const [hireEndDate, setHireEndDate] = useState('')
  const [sending, setSending] = useState(false)

  // API: fetch available assistants from backend
  const { data: apiAssistantsRaw = [], isLoading: assistantsLoading } = useAvailableAssistantProfiles()

  // API: fetch contracts for this mangaka (roster = accepted contracts)
  const { data: contractsRaw = [] } = useContracts({ mangakaId })

  // API: create contract (hire request)
  const createContract = useCreateContract()

  // Compute roster (accepted) from API contracts
  const rosterFromApi = useMemo(() => {
    return contractsRaw
      .filter(c => {
        const status = (c.status ?? '').toLowerCase()
        return status === 'accepted' || status === 'active'
      })
      .map(c => ({
        assistantId: c.assistant_id ?? c.assistantid ?? c.user_id ?? c.userId,
        name: c.assistant_name ?? c.assistantname ?? 'Assistant',
        handle: c.assistant_handle ?? `@asst_${c.assistant_id ?? c.assistantid ?? ''}`,
        avatarColor: c.avatar_color ?? '#8b5cf6',
        hiredAt: c.accepted_at ?? c.created_at ?? Date.now(),
        status: 'active',
      }))
  }, [contractsRaw])

  // Compute pending requests from API contracts
  const pendingFromApi = useMemo(() => {
    return contractsRaw.filter(c => {
      const status = (c.status ?? '').toLowerCase()
      return status === 'pending' || status === 'waiting'
    })
  }, [contractsRaw])

  // Map API assistants to the same shape as demo catalog, merging with roster/pending status
  const catalog = useMemo(() => {
    const rosterIds = new Set(rosterFromApi.map(r => String(r.assistantId)))
    const pendingIds = new Set(pendingFromApi.map(p => String(p.assistant_id ?? p.assistantid ?? '')))

    return apiAssistantsRaw.map(a => {
      const id = a.id ?? a.user_id ?? a.userid ?? a.assistant_id ?? a.assistantid ?? '?'
      const userId = id
      const name = a.fullname ?? a.fullName ?? a.name ?? a.username ?? 'Assistant'
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AS'

      let availability = 'available'
      if (rosterIds.has(String(id))) availability = 'mine'
      else if (pendingIds.has(String(id))) availability = 'pending'

      const skills = Array.isArray(a.skills)
        ? a.skills
        : (a.skills ? String(a.skills).split(/[,;]/).map(s => s.trim().toLowerCase()) : [])
      const softwareUsed = Array.isArray(a.software_used)
        ? a.software_used
        : (a.software_used ? String(a.software_used).split(/[,;]/).map(s => s.trim().toLowerCase()) : [])

      return {
        id: String(id),
        userId: String(userId),
        name,
        handle: a.handle ?? `@${a.username ?? 'asst_' + id}`,
        avatarColor: a.avatar_color ?? a.avatarUrl ?? '#8b5cf6',
        initials,
        bio: a.bio ?? a.introduction ?? '',
        specialties: skills,
        preferredSoftware: softwareUsed,
        style: a.style ?? a.preferredStyle ?? 'manga',
        rating: Number(a.rating ?? a.averageRating ?? a.avgRating ?? 0),
        completedPages: Number(a.completedPages ?? a.completed_pages ?? 0),
        responseTime: a.responseTime ?? '< 24h',
        languages: Array.isArray(a.languages) ? a.languages : (a.languages ? [a.languages] : ['VI']),
        timezone: a.timezone ?? 'GMT+7',
        availability,
        isAvailable: a.is_available ?? a.isAvailable ?? a.isavailable ?? true,
        portfolioUrl: a.portfolio_url ?? a.portfolioUrl ?? null,
      }
    })
  }, [apiAssistantsRaw, rosterFromApi, pendingFromApi])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter(a => {
      if (specialtyFilter !== 'all' && !a.specialties.includes(specialtyFilter)) return false
      if (styleFilter !== 'all' && a.style !== styleFilter) return false
      if (availabilityFilter !== 'all' && a.availability !== availabilityFilter) return false
      if (availabilityFilter === 'available' && a.isAvailable === false) return false
      if (!q) return true
      const hay = `${a.name} ${a.handle} ${a.bio} ${styleLabel(a.style)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [catalog, query, specialtyFilter, styleFilter, availabilityFilter])

  const stats = useMemo(() => ({
    total: catalog.length,
    available: catalog.filter(a => a.availability === 'available' && a.isAvailable !== false).length,
    team: rosterFromApi.length,
    pending: catalog.filter(a => a.availability === 'pending').length,
  }), [catalog, rosterFromApi.length])

  const pendingRequests = useMemo(
    () => pendingFromApi.map(p => ({
      id: p.id ?? p.contract_id ?? p.mangakaassistantid ?? p.mangaka_assistant_id ?? String(Math.random()),
      assistantName: p.assistant_name ?? p.assistantname ?? p.assistant?.fullname ?? 'Assistant',
    })),
    [pendingFromApi],
  )

  function openHireDialog(profile) {
    if (profile.availability !== 'available') return
    setHireTarget(profile)
    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setHireSalaryAmount('')
    setHireSalaryType('Monthly')
    setHireContractTerms('')
    setHireStartDate(today.toISOString().split('T')[0])
    setHireEndDate(nextMonth.toISOString().split('T')[0])
  }

  async function submitHireRequest() {
    if (!hireTarget || !mangakaId) return

    const salaryAmount = Number(hireSalaryAmount)
    if (!hireSalaryAmount || isNaN(salaryAmount) || salaryAmount <= 0) {
      toast.error('Vui long nhap so tien luong hop le.')
      return
    }
    if (!hireContractTerms.trim()) {
      toast.error('Vui long nhap noi dung hop dong.')
      return
    }
    if (!hireStartDate || !hireEndDate) {
      toast.error('Vui long chon ngay bat dau va ket thuc hop dong.')
      return
    }

    setSending(true)
    try {
      await createContract.mutateAsync({
        mangakaId,
        assistantId: hireTarget.userId ?? hireTarget.id,
        salaryAmount,
        salaryType: hireSalaryType,
        contractTerms: hireContractTerms,
        startDate: hireStartDate,
        endDate: hireEndDate,
      })
      toast.success(`Da gui yeu cau thue ${hireTarget.name} — cho Assistant chap nhan.`)
      setHireTarget(null)
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Khong gui duoc yeu cau.'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500/10 via-background to-rose-500/5 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-2">
            <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300">
              <Sparkles className="size-3" />
              Thuê Assistant
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Chọn trợ lý phù hợp</h2>
            <p className="text-sm text-muted-foreground">
              Một Mangaka có thể thuê nhiều Assistant. Một Assistant cũng có thể làm việc cho nhiều Mangaka —
              sau khi chấp nhận, tên sẽ xuất hiện sẵn khi giao việc ở tab Upload & Ghi chú.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Trên hệ thống', value: stats.total, icon: Users },
              { label: 'Có thể thuê', value: stats.available, icon: UserCheck },
              { label: 'Đội của bạn', value: stats.team, icon: CheckCircle2 },
              { label: 'Đang chờ', value: stats.pending, icon: Clock },
            ].map(item => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="flex min-h-[76px] flex-col justify-between rounded-xl border bg-card/80 px-3 py-3 backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="text-2xl font-bold leading-none">{item.value}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" />
                Đội Assistant
              </CardTitle>
              <CardDescription>Đã chấp nhận yêu cầu thuê</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[120px] flex-1">
              {rosterFromApi.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Chưa có Assistant — gửi yêu cầu thuê và chờ họ chấp nhận.
                </p>
              ) : (
                <ScrollArea className="max-h-72 pr-2">
                  <ul className="space-y-2">
                    {rosterFromApi.map(r => (
                      <li
                        key={r.assistantId}
                        className="flex h-14 items-center gap-3 rounded-lg border px-3"
                      >
                        <Avatar size="sm" className="shrink-0">
                          <AvatarFallback
                            className="text-[10px] font-semibold text-white"
                            style={{ background: r.avatarColor ?? '#8b5cf6' }}
                          >
                            {r.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{r.handle ?? 'Assistant'}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">Active</Badge>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {pendingRequests.length > 0 ? (
            <Card className="border-amber-200/60 bg-amber-50/30 dark:border-amber-500/20 dark:bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Yêu cầu đang chờ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingRequests.map(r => (
                  <div
                    key={r.id}
                    className="flex h-11 items-center rounded-lg border bg-background/80 px-3 text-sm"
                  >
                    <strong className="truncate">{r.assistantName}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </aside>

        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  placeholder="Tìm tên, handle, mô tả..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[480px]">
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Chuyên môn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mọi chuyên môn</SelectItem>
                    {ASSISTANT_SPECIALTIES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={styleFilter} onValueChange={setStyleFilter}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Phong cách" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mọi phong cách</SelectItem>
                    {ASSISTANT_STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="h-10 w-full">
                    <Filter className="mr-1 size-3.5 opacity-60" />
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY_FILTERS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {assistantsLoading ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Đang tải danh sách Assistant...
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Không có Assistant phù hợp bộ lọc — thử đổi từ khóa hoặc filter.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
              {filtered.map(profile => (
                <AssistantProfileCard
                  key={profile.id}
                  profile={profile}
                  onHire={openHireDialog}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!hireTarget} onOpenChange={open => !open && setHireTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gửi yêu cầu thuê Assistant</DialogTitle>
            <DialogDescription>
              {hireTarget ? (
                <>
                  Gửi lời mời làm việc cho <strong>{hireTarget.name}</strong>.
                  Assistant có thể đồng thời hợp tác với nhiều Mangaka.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {hireTarget ? (
            <div className="space-y-4 py-2">
              <div className="flex h-16 items-center gap-3 rounded-lg border bg-muted/30 px-3">
                <AssistantAvatar profile={hireTarget} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{hireTarget.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{hireTarget.handle}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="salary-amount">So tien *</Label>
                  <Input
                    id="salary-amount"
                    type="number"
                    min="0"
                    placeholder="VD: 5000000"
                    value={hireSalaryAmount}
                    onChange={e => setHireSalaryAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salary-type">Hinh thuc *</Label>
                  <Select value={hireSalaryType} onValueChange={setHireSalaryType}>
                    <SelectTrigger id="salary-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Theo thang</SelectItem>
                      <SelectItem value="Fixed">Co dinh</SelectItem>
                      <SelectItem value="PerChapter">Theo chap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">Ngay bat dau *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={hireStartDate}
                    onChange={e => setHireStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date">Ngay ket thuc *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={hireEndDate}
                    onChange={e => setHireEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contract-terms">Noi dung hop dong *</Label>
                <Textarea
                  id="contract-terms"
                  rows={3}
                  className="min-h-[88px] resize-none"
                  placeholder="VD: Ho tro ve phong cách nền fantasy, 2 chapter/thang, ưu tiên hoan thanh dung han..."
                  value={hireContractTerms}
                  onChange={e => setHireContractTerms(e.target.value)}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHireTarget(null)}>Huỷ</Button>
            <Button onClick={submitHireRequest} disabled={sending}>
              <Send className="size-3.5" />
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
