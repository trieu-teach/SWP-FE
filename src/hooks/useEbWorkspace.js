import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient.js";
import {
  buildCouncilAggregateFromMembers,
  buildInitialScores,
  buildScoreFields,
  clampScore,
  getClassification,
  isEbStatus,
  mapEvalDetailToScores,
  validateScore,
} from "@/pages/User/Eb/Eb.helpers.js";

/**
 * Hook điều phối toàn bộ logic của trang Eb (Editor Board):
 * - tải hàng chờ EB + danh sách thành viên hội đồng + điểm đã chấm
 * - quản lý form nhập điểm (theo từng thành viên, từng series)
 * - lưu điểm, chấp nhận / từ chối series
 */
export function useEbWorkspace() {
  // ── Server state ──────────────────────────────────────────────────────────
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm, onCancel, danger? }

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(null);
  const [activeMemberId, setActiveMemberId] = useState("");
  const [scores, setScores] = useState(buildInitialScores);
  const [scoreErrors, setScoreErrors] = useState(buildInitialScores);
  const [feedback, setFeedback] = useState("");

  const loadedRef = useRef(false);

  // ── Load hàng chờ EB ──────────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [subRes, seriesRes] = await Promise.allSettled([
        axiosClient.get("/Submissions/eb"),
        axiosClient.get("/Series"),
      ]);

      let ebData = [];
      if (subRes.status === "fulfilled") {
        const raw = subRes.value.data;
        ebData = Array.isArray(raw) ? raw : (raw?.data ?? []);
      }

      if (ebData.length === 0 && seriesRes.status === "fulfilled") {
        const raw = seriesRes.value.data;
        const all = Array.isArray(raw) ? raw : (raw?.data ?? []);
        ebData = all.filter(s => isEbStatus(s.status));
      }

      const normalized = ebData.map(item => ({
        ...item,
        _resolvedId: String(item.series_id ?? item.seriesid ?? item.id),
      }));

      setPending(normalized);

      setSelectedId(prev => {
        if (prev != null) return prev;
        return normalized.length ? normalized[0]._resolvedId : null;
      });
    } catch {
      toast.error("Không thể tải hàng chờ EB. Kiểm tra kết nối backend.");
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadQueue();
  }, [loadQueue]);

  // ── Load evaluators + evaluations ────────────────────────────────────────
  // FIX: Dùng GET /BoardEvaluation (GetAll) rồi filter theo seriesId
  // vì không có endpoint riêng cho evaluators + scores
  const loadEvaluatorsStatus = useCallback(async (seriesId) => {
    if (!seriesId) { setMembers([]); return; }
    setLoadingMembers(true);
    try {
      const [usersRes, evalsRes] = await Promise.allSettled([
        axiosClient.get("/users/evaluators"),
        axiosClient.get("/BoardEvaluation"), // ← FIX: đổi từ /Submissions/${seriesId}/evaluations
      ]);

      // Danh sách evaluator
      let userList = [];
      if (usersRes.status === "fulfilled") {
        const raw = usersRes.value.data?.data ?? usersRes.value.data ?? [];
        userList = Array.isArray(raw) ? raw : [];
      }

      // Filter evaluations của seriesId này
      let evalList = [];
      if (evalsRes.status === "fulfilled") {
        const raw = evalsRes.value.data;
        const all = Array.isArray(raw) ? raw : (raw?.data ?? []);
        evalList = all.filter(e =>
          String(e.seriesid ?? e.Seriesid) === String(seriesId)
        );
      }

      let mapped = [];
      if (userList.length > 0) {
        mapped = userList.map(u => {
          const uid = String(u.userId ?? u.user_id ?? u.id ?? u.userid);
          // Match bằng inputtedbyid (vì Create dùng inputtedbyid = người nhập = EB member)
          const myEval = evalList.find(e =>
            String(e.inputtedbyid ?? e.Inputtedbyid) === uid
          );
          return {
            id: uid,
            name: u.fullName ?? u.full_name ?? u.fullname ?? u.username,
            title: "Thành viên Hội đồng",
            hasEvaluated: Boolean(myEval),
            evalDetail: myEval ? {
              evaluationId: myEval.evaluationid ?? myEval.evaluation_id ?? myEval.Evaluationid,
              // snake_case trước vì axiosClient normalizeKeys convert camelCase -> snake_case
              storyScore: myEval.story_score ?? myEval.storyScore ?? myEval.StoryScore ?? 0,
              artScore: myEval.art_score ?? myEval.artScore ?? myEval.ArtScore ?? 0,
              characterScore: myEval.character_score ?? myEval.characterScore ?? myEval.CharacterScore ?? 0,
              commercialScore: myEval.commercial_score ?? myEval.commercialScore ?? myEval.CommercialScore ?? 0,
              pacingScore: myEval.pacing_score ?? myEval.pacingScore ?? myEval.PacingScore ?? 0,
              feedback: myEval.feedback ?? "",
            } : null,
          };
        });

        // Không bổ sung member từ evalList vì Response DTO không có name field
        // → record inputtedbyid không nằm trong userList sẽ bị bỏ qua (data rác)
      }

      setMembers(mapped);
      if (mapped.length) {
        setActiveMemberId(prev => {
          const stillExists = mapped.find(m => m.id === prev);
          return stillExists ? prev : mapped[0].id;
        });
      } else {
        setActiveMemberId("");
      }
    } catch {
      toast.error("Không thể tải danh sách thành viên Hội đồng.");
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    loadEvaluatorsStatus(selectedId);
  }, [selectedId, loadEvaluatorsStatus]);

  // ── Điền form khi đổi member ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeMemberId || !members.length) {
      setScores(buildInitialScores());
      setScoreErrors(buildInitialScores());
      setFeedback("");
      return;
    }
    const member = members.find(m => m.id === activeMemberId);
    if (!member) return;

    if (member.hasEvaluated && member.evalDetail) {
      setScores(mapEvalDetailToScores(member.evalDetail));
      setFeedback(member.evalDetail.feedback ?? "");
    } else {
      setScores(buildInitialScores());
      setFeedback("");
    }
    setScoreErrors(buildInitialScores());
  }, [activeMemberId, members]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const scoreFields = useMemo(() => buildScoreFields(), []);

  const councilAggregate = useMemo(
    () => buildCouncilAggregateFromMembers(members, scoreFields),
    [members, scoreFields]
  );

  const councilClassification = getClassification(councilAggregate.councilAverage);
  const activeMember = members.find(m => m.id === activeMemberId);

  const activeSubmission = pending.find(p => p._resolvedId === selectedId);

  const average = useMemo(() => {
    const total = scoreFields.reduce((sum, f) => sum + clampScore(scores[f.key]), 0);
    return scoreFields.length ? total / scoreFields.length : 0;
  }, [scoreFields, scores]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function updateScore(key, value) {
    setScores(cur => ({ ...cur, [key]: value }));
    setScoreErrors(cur => ({ ...cur, [key]: validateScore(value) }));
  }

  function normalizeScoreField(key) {
    const raw = String(scores[key] ?? "").trim();
    if (!raw) { setScoreErrors(cur => ({ ...cur, [key]: validateScore(raw) })); return; }
    const stepped = Math.round(clampScore(raw) * 2) / 2;
    const next = stepped.toFixed(1);
    setScores(cur => ({ ...cur, [key]: next }));
    setScoreErrors(cur => ({ ...cur, [key]: validateScore(next) }));
  }

  async function handleSaveAssessment() {
    if (!selectedId) { toast.error("Chưa chọn series để chấm điểm."); return; }
    if (!activeMemberId) { toast.error("Chưa chọn thành viên Hội đồng."); return; }

    const nextErrors = Object.fromEntries(
      scoreFields.map(f => [f.key, validateScore(scores[f.key])])
    );
    setScoreErrors(cur => ({ ...cur, ...nextErrors }));
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Có tiêu chí chưa hợp lệ. Vui lòng kiểm tra lại điểm.");
      return;
    }

    // FIX: Kiểm tra member đã có evaluation chưa để POST hay PUT
    const activeMemberData = members.find(m => m.id === activeMemberId);
    const existingEvalId = activeMemberData?.evalDetail?.evaluationId;

    setSaving(true);
    try {
      if (existingEvalId) {
        // PUT /BoardEvaluation/{id} — cập nhật evaluation đã có
        await axiosClient.put(`/BoardEvaluation/${existingEvalId}`, {
          storyScore: clampScore(scores.plotDialogue),
          artScore: clampScore(scores.artDesign),
          characterScore: clampScore(scores.panelingCamera),
          commercialScore: clampScore(scores.coloring),
          pacingScore: clampScore(scores.pacingHook),
          feedback: feedback.trim(),
        });
      } else {
        // POST /BoardEvaluation — tạo evaluation mới
        await axiosClient.post("/BoardEvaluation", {
          seriesid: Number(selectedId),
          inputtedbyid: Number(activeMemberId),
          storyScore: clampScore(scores.plotDialogue),
          artScore: clampScore(scores.artDesign),
          characterScore: clampScore(scores.panelingCamera),
          commercialScore: clampScore(scores.coloring),
          pacingScore: clampScore(scores.pacingHook),
          feedback: feedback.trim(),
        });
      }

      // Reload để cập nhật bảng điểm
      await loadEvaluatorsStatus(selectedId);
      toast.success(
        `Đã lưu điểm ${activeMember?.name ?? "thành viên"} · DTB cá nhân ${average.toFixed(1)}`
      );
    } catch {
      // axiosClient interceptor đã toast lỗi
    } finally {
      setSaving(false);
    }
  }

  function getQueueAssessment(seriesId) {
    if (String(seriesId) !== String(selectedId)) {
      return { scoredCount: 0, total: members.length, classification: null, councilAverage: 0 };
    }
    return {
      scoredCount: councilAggregate.scoredCount,
      total: members.length,
      classification: councilAggregate.scoredCount > 0 ? councilClassification : null,
      councilAverage: councilAggregate.councilAverage,
    };
  }

  async function handleApprove(seriesId, title) {
    const assessment = getQueueAssessment(seriesId);
    const failing = assessment.classification?.label === "KHÔNG ĐẠT";
    const incomplete = assessment.scoredCount < members.length;

    // Chặn cứng nếu KHÔNG ĐẠT
    if (failing) {
      toast.error(`Không thể chấp nhận — series đang ở mức KHÔNG ĐẠT (DTB ${assessment.councilAverage.toFixed(1)}). Cần đạt tối thiểu 2.5 điểm.`);
      return;
    }

    // Cảnh báo nếu chưa đủ thành viên chấm
    if (incomplete) {
      const confirmed = await new Promise((resolve) => {
        setConfirmDialog({
          message: `Series mới có ${assessment.scoredCount}/${assessment.total} thành viên Hội đồng chấm điểm. Bạn vẫn muốn chấp nhận?`,
          onConfirm: () => { setConfirmDialog(null); resolve(true); },
          onCancel: () => { setConfirmDialog(null); resolve(false); },
        });
      });
      if (!confirmed) return;
    }
    try {
      await axiosClient.patch(`/Series/${seriesId}/status`, { status: "Publishing" });

      // Gửi thông báo chấp nhận cho Mangaka
      const submission = pending.find(p => p._resolvedId === String(seriesId));
      const mangakaId = submission?.mangakaid ?? submission?.manga_ka_id ?? submission?.mangaka_id;
      if (mangakaId) {
        const evalFeedback = councilAggregate.memberRows
          .filter(r => r.scored)
          .map(r => `${r.name}: ${r.average.toFixed(1)}`)
          .join(", ");
        await axiosClient.post("/Notifications/send", {
          userId: Number(mangakaId),
          title: "Tác phẩm được chấp nhận phát hành",
          message: `Tác phẩm "${title}" đã được Hội đồng chấp nhận và chuyển sang phát hành. DTB Hội đồng: ${councilAggregate.councilAverage.toFixed(1)}/5. Điểm thành viên: ${evalFeedback || "N/A"}.`,
          seriesId: Number(seriesId),
        }).catch(() => {}); // không block nếu notification fail
      }

      toast.success(`Đã chấp nhận "${title}" — chuyển sang phát hành.`);
      setSelectedId(null);
      loadedRef.current = false;
      loadQueue();
    } catch { /* interceptor toast */ }
  }

  async function handleReject(seriesId, title) {
    const confirmed = await new Promise((resolve) => {
      setConfirmDialog({
        message: `Từ chối "${title}"? Series sẽ bị trả về Mangaka chỉnh sửa.`,
        onConfirm: () => { setConfirmDialog(null); resolve(true); },
        onCancel: () => { setConfirmDialog(null); resolve(false); },
        danger: true,
      });
    });
    if (!confirmed) return;
    try {
      await axiosClient.patch(`/Series/${seriesId}/status`, { status: "Cancelled" });

      // Gửi thông báo từ chối kèm feedback cho Mangaka
      const submission = pending.find(p => p._resolvedId === String(seriesId));
      const mangakaId = submission?.mangakaid ?? submission?.manga_ka_id ?? submission?.mangaka_id;
      if (mangakaId) {
        const evalFeedback = councilAggregate.memberRows
          .filter(r => r.scored)
          .map(r => `${r.name} (DTB ${r.average.toFixed(1)})`)
          .join(", ");
        const feedbackText = members
          .filter(m => m.hasEvaluated && m.evalDetail?.feedback)
          .map(m => `${m.name}: ${m.evalDetail.feedback}`)
          .join(" | ") || "Không có nhận xét cụ thể.";

        await axiosClient.post("/Notifications/send", {
          userId: Number(mangakaId),
          title: "Tác phẩm bị từ chối EB",
          message: `Tác phẩm "${title}" đã bị Hội đồng từ chối. DTB Hội đồng: ${councilAggregate.councilAverage.toFixed(1)}/5. Điểm thành viên: ${evalFeedback || "N/A"}. Nhận xét: ${feedbackText}`,
          seriesId: Number(seriesId),
        }).catch(() => {}); // không block nếu notification fail
      }

      toast.success(`Đã từ chối "${title}" — trả về Mangaka.`);
      setSelectedId(null);
      loadedRef.current = false;
      loadQueue();
    } catch { /* interceptor toast */ }
  }

  return {
    // server state
    pending,
    members,
    loadingQueue,
    loadingMembers,
    saving,
    confirmDialog,
    // UI state
    selectedId,
    setSelectedId,
    activeMemberId,
    setActiveMemberId,
    scores,
    scoreErrors,
    feedback,
    setFeedback,
    // derived
    scoreFields,
    councilAggregate,
    councilClassification,
    activeMember,
    activeSubmission,
    average,
    // handlers
    updateScore,
    normalizeScoreField,
    handleSaveAssessment,
    handleApprove,
    handleReject,
    getQueueAssessment,
    loadQueue,
  };
}

export default useEbWorkspace;