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
      const pending = all.filter(c => {
        const s = c.status ?? c.Status ?? ''
        return s.toLowerCase() === 'pending'
      })
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
    if (!contractId) return false
    setAcceptingId(contractId)
    try {
      await contractsService.updateStatus(contractId, { status: 'Active' })
      setPendingRequests(prev => prev.filter(c =>
        (c.contractId ?? c.ContractId ?? c.id) !== contractId
      ))
      return true
    } catch (err) {
      throw err
    } finally {
      setAcceptingId(null)
    }
  }, [])

  const rejectRequest = useCallback(async (contractId) => {
    if (!contractId) return false
    setRejectingId(contractId)
    try {
      await contractsService.updateStatus(contractId, { status: 'Terminated' })
      setPendingRequests(prev => prev.filter(c =>
        (c.contractId ?? c.ContractId ?? c.id) !== contractId
      ))
      return true
    } catch (err) {
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
