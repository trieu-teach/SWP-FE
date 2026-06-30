import { useCallback, useEffect, useState } from 'react'
import { contractsService } from '@/api'
import { getSession } from '@/lib/auth'

export function useCollaborationRequests() {
  const session = getSession()
  const assistantId = session?.id ?? session?.userid ?? null

  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)

  const fetchPending = useCallback(async () => {
    if (!assistantId) {
      setPendingRequests([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await contractsService.getAll({ assistantId })
      const all = Array.isArray(res?.data) ? res.data : []
      console.log('[useCollaborationRequests] All contracts:', all)
      const pending = all.filter(c => {
        const s = (c.status ?? c.Status ?? '').toLowerCase()
        return s === 'pending' || s === 'cho nhan'
      })
      console.log('[useCollaborationRequests] Pending contracts:', pending)
      setPendingRequests(pending)
    } catch {
      setPendingRequests([])
    } finally {
      setLoading(false)
    }
  }, [assistantId])

  useEffect(() => {
    void fetchPending()
  }, [fetchPending])

  const acceptRequest = useCallback(async (contractId) => {
    console.log('[useCollaborationRequests] acceptRequest called with:', contractId)
    if (!contractId) return false
    setAcceptingId(contractId)
    try {
      const res = await contractsService.updateStatus(contractId, 'Active')
      console.log('[useCollaborationRequests] acceptRequest success:', res)
      setPendingRequests(prev => prev.filter(c =>
        (c.contractId ?? c.ContractId ?? c.id ?? c.contract_id) !== contractId
      ))
      return true
    } catch (err) {
      console.error('[useCollaborationRequests] acceptRequest error:', err)
      throw err
    } finally {
      setAcceptingId(null)
    }
  }, [])

  const rejectRequest = useCallback(async (contractId) => {
    console.log('[useCollaborationRequests] rejectRequest called with:', contractId)
    if (!contractId) return false
    setRejectingId(contractId)
    try {
      const res = await contractsService.updateStatus(contractId, 'Terminated')
      console.log('[useCollaborationRequests] rejectRequest success:', res)
      setPendingRequests(prev => prev.filter(c =>
        (c.contractId ?? c.ContractId ?? c.id ?? c.contract_id) !== contractId
      ))
      return true
    } catch (err) {
      console.error('[useCollaborationRequests] rejectRequest error:', err)
      throw err
    } finally {
      setRejectingId(null)
    }
  }, [])

  return {
    pendingRequests,
    pendingCount: pendingRequests.length,
    loading,
    acceptingId,
    rejectingId,
    acceptRequest,
    rejectRequest,
    refresh: fetchPending,
  }
}
