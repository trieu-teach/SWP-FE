import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useCollaborationRequests } from '@/hooks/useCollaborationRequests.js'

function SalaryBadge({ salaryAmount, salaryType }) {
  const typeLabel = {
    Fixed: 'Cố định',
    PerChapter: 'Mỗi chương',
    Monthly: 'Hàng tháng',
  }[salaryType ?? salaryType] ?? salaryType ?? ''

  return (
    <Badge variant="secondary" className="font-mono text-xs">
      {salaryAmount?.toLocaleString('vi-VN') ?? '—'}đ / {typeLabel}
    </Badge>
  )
}

export default function CollaborationRequestsDialog({ open, onOpenChange }) {
  const {
    pendingRequests,
    loading,
    acceptingId,
    rejectingId,
    acceptRequest,
    rejectRequest,
  } = useCollaborationRequests()

  async function handleAccept(contract) {
    const id = contract.contract_id ?? contract.contractId ?? contract.ContractId ?? contract.id
    console.log('[CollabDialog] Accept contract:', id, contract)
    if (!id) {
      toast.error('Không tìm thấy ID hợp đồng')
      return
    }
    try {
      await acceptRequest(id)
      toast.success('Đã chấp nhận lời mời hợp tác!')
      onOpenChange(false)
    } catch (err) {
      toast.error('Chấp nhận thất bại: ' + (err?.response?.data?.message ?? err?.message))
    }
  }

  async function handleReject(contract) {
    const id = contract.contract_id ?? contract.contractId ?? contract.ContractId ?? contract.id
    console.log('[CollabDialog] Reject contract:', id, contract)
    if (!id) {
      toast.error('Không tìm thấy ID hợp đồng')
      return
    }
    try {
      await rejectRequest(id)
      toast.success('Đã từ chối lời mời hợp tác.')
    } catch (err) {
      toast.error('Từ chối thất bại: ' + (err?.response?.data?.message ?? err?.message))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Yêu cầu hợp tác
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Đang tải...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Users className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Không có yêu cầu hợp tác nào đang chờ.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {pendingRequests.map((req) => {
                const id = req.contractId ?? req.ContractId ?? req.id
                const isAccepting = acceptingId === id
                const isRejecting = rejectingId === id
                const busy = isAccepting || isRejecting

                return (
                  <div
                    key={id ?? `req-${Math.random()}`}
                    className="rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">
                          {req.mangakaName ?? req.mangakaname ?? req.MangakaName ?? 'Mangaka'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Gửi lúc: {req.createdAt ?? req.createdat ?? req.Createdat
                            ? new Date(req.createdAt ?? req.createdat ?? req.Createdat).toLocaleDateString('vi-VN')
                            : '—'}
                        </p>
                        {req.contractTerms || req.contractterms || req.ContractTerms ? (
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            {req.contractTerms ?? req.contractterms ?? req.ContractTerms}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2">
                          <SalaryBadge
                            salaryAmount={req.salaryAmount ?? req.Salaryamount ?? req.salary_amount}
                            salaryType={req.salaryType ?? req.Salarytype ?? req.salary_type}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                          disabled={busy}
                          onClick={() => handleAccept(req)}
                        >
                          <CheckCircle2 className="size-3.5" />
                          {isAccepting ? 'Đang xử lý...' : 'Đồng ý'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive hover:bg-destructive/10"
                          disabled={busy}
                          onClick={() => handleReject(req)}
                        >
                          <XCircle className="size-3.5" />
                          {isRejecting ? 'Đang xử lý...' : 'Từ chối'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
