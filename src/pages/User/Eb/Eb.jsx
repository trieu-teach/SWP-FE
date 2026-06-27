import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, Gavel, Loader2, Star, XCircle } from "lucide-react";
import Header from "@/components/User/Header/Header.jsx";
import Footer from "@/components/User/Footer/Footer.jsx";
import { WorkspaceHero } from "@/components/layout/WorkspaceHero.jsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getSession, logout } from "@/lib/auth.js";
import { placeholderPageDataUrl } from "@/utils/assistantWorkspaceStorage.js";
import { LABEL_EDITOR_BOARD } from "@/constants/roleTerminology.js";
import { getEbPendingSubmissions, getSeriesEvaluations, patchSubmissionScore } from "@/api/submissions.service.js";
import { upsertMemberEvaluation } from "@/api/boardEvaluation.service.js";
import axiosClient from "@/api/axiosClient.js";
import "./Eb.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { to: "/", label: "Trang chủ" },
  { to: "/mangaka", label: "Mangaka" },
  { to: "/tantou", label: "Tantou Editor" },
];

const COMMON_CRITERIA = [
  { key: "plotDialogue", label: "Cốt truyện & Lời thoại", hint: "Plot & Dialogue" },
  { key: "artDesign", label: "Nét vẽ & Tạo hình nhân vật", hint: "Art Style & Character Design" },
  { key: "panelingCamera", label: "Phân khung & Góc máy", hint: "Paneling & Camera Angles" },
  { key: "pacingHook", label: "Nhịp độ & Cao trào", hint: "Pacing & Hook" },
];

const TYPE_CRITERIA = {
  color: { key: "coloring", label: "Đổ màu & Phối màu", hint: "Coloring" },
  mono: { key: "toneShading", label: "Sử dụng Tone/Đánh bóng", hint: "Screentone & Shading" },
};

const SCORE_MAX = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clampScore(value) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(SCORE_MAX, Math.max(0, parsed));
}

function validateScore(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Vui lòng nhập điểm.";
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return "Điểm phải là số.";
  if (parsed < 0 || parsed > SCORE_MAX) return `Điểm phải trong khoảng 0 - ${SCORE_MAX}.`;
  const stepped = Math.round(parsed * 2) / 2;
  if (Math.abs(stepped - parsed) > 0.001) return "Điểm chỉ nhận bước 0.5 (ví dụ: 3.5, 4.0, 4.5).";
  return "";
}

function buildScoreFields(scoreType) {
  const typeField = TYPE_CRITERIA[scoreType] ?? TYPE_CRITERIA.color;
  return [...COMMON_CRITERIA, typeField];
}

function buildInitialScores() {
  return { plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" };
}

function getClassification(average) {
  if (average < 2.5) return { label: "KHÔNG ĐẠT", note: "Series chưa đạt chất lượng, cần chỉnh sửa lớn trước khi xét lại.", className: "border-red-200 bg-red-50 text-red-700" };
  if (average < 3.5) return { label: "ĐẠT", note: "Series có thể thông qua, nhưng cần cải thiện theo ghi chú.", className: "border-amber-200 bg-amber-50 text-amber-700" };
  if (average < 4.25) return { label: "TỐT", note: "Chất lượng series ổn định, phù hợp duyệt nhanh.", className: "border-sky-200 bg-sky-50 text-sky-700" };
  return { label: "XUẤT SẮC", note: "Series chất lượng cao, phù hợp đẩy nổi bật/banner.", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function buildCouncilRecordFromApi(evaluations, members) {
  if (!evaluations?.length) return null;
  const membersMap = {};
  for (const ev of evaluations) {
    const memberId = ev.member_id ?? ev.memberId;
    const member = members.find(m => m.id === memberId);
    membersMap[memberId] = {
      evaluationId: ev.id,
      scoreType: ev.score_type ?? ev.scoreType ?? "color",
      scores: ev.scores ?? {},
      criterionNotes: ev.criterion_notes ?? ev.criterionNotes ?? {},
      average: ev.average ?? 0,
      assessedAt: ev.assessed_at ?? ev.assessedAt,
      enteredBy: ev.entered_by ?? ev.enteredBy ?? member?.name ?? "",
      scored: true,
    };
  }
  return {
    seriesTitle: evaluations[0]?.series_title ?? "",
    scoreType: evaluations[0]?.score_type ?? "color",
    members: membersMap,
    updatedAt: evaluations[0]?.updated_at ?? null,
  };
}

function buildCouncilAggregate(councilRecord, members, criterionKeys = []) {
  const membersData = councilRecord?.members ?? {};
  const memberRows = members.map((member) => {
    const entry = membersData[member.id];
    if (!entry?.scored) return { ...member, scored: false, scores: {}, average: 0 };
    const scores = entry.scores ?? {};
    const keys = criterionKeys.length ? criterionKeys : Object.keys(scores);
    const values = keys.map(k => Number(scores[k] ?? 0));
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { ...member, scored: true, scores, average: parseFloat(avg.toFixed(2)), assessedAt: entry.assessedAt, enteredBy: entry.enteredBy };
  });

  const scoredRows = memberRows.filter(r => r.scored);
  const scoredCount = scoredRows.length;

  const criterionAverages = {};
  if (scoredCount > 0) {
    for (const key of criterionKeys) {
      const vals = scoredRows.map(r => Number(r.scores?.[key] ?? 0));
      criterionAverages[key] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
    }
  }

  const councilAverage = scoredCount > 0
    ? parseFloat((scoredRows.reduce((sum, r) => sum + r.average, 0) / scoredCount).toFixed(2))
    : 0;

  return { memberRows, criterionAverages, councilAverage, scoredCount };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const safe = clampScore(value);
  const display = hovered ?? safe;
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: SCORE_MAX }, (_, idx) => {
        const fullScore = idx + 1;
        const halfScore = idx + 0.5;
        const isFull = display >= fullScore;
        const isHalf = !isFull && display >= halfScore;
        return (
          <span key={fullScore} className="relative inline-flex size-6 cursor-pointer">
            <span className="absolute inset-0 z-10 w-1/2" onMouseEnter={() => setHovered(halfScore)} onClick={() => onChange(halfScore.toFixed(1))} />
            <span className="absolute inset-y-0 right-0 z-10 w-1/2" onMouseEnter={() => setHovered(fullScore)} onClick={() => onChange(fullScore.toFixed(1))} />
            <Star className="size-6 text-muted-foreground/30" />
            {isFull && <Star className="absolute inset-0 size-6 fill-amber-400 text-amber-400" />}
            {isHalf && <span className="absolute inset-0 w-1/2 overflow-hidden"><Star className="size-6 fill-amber-400 text-amber-400" /></span>}
          </span>
        );
      })}
    </div>
  );
}

function ScoreStars({ value }) {
  const safe = clampScore(value);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: SCORE_MAX }, (_, idx) => {
        const score = idx + 1;
        const isFull = safe >= score;
        const isHalf = !isFull && safe >= score - 0.5;
        return (
          <span key={score} className="relative inline-flex size-4">
            <Star className="size-4 text-muted-foreground/35" />
            {isFull && <Star className="absolute inset-0 size-4 fill-amber-400 text-amber-400" />}
            {isHalf && <span className="absolute inset-0 w-1/2 overflow-hidden"><Star className="size-4 fill-amber-400 text-amber-400" /></span>}
          </span>
        );
      })}
    </div>
  );
}

// FIX 1: key={row.id ?? idx} thay vì key={row.id}
function CouncilScoresTable({ memberRows, scoreFields, criterionAverages, councilAverage, scoredCount, activeMemberId }) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{scoredCount}/{memberRows.length} thành viên đã chấm</p>
        <button
          type="button"
          onClick={() => setShowDetail(v => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showDetail
            ? <><ChevronUp className="size-3" />Ẩn chi tiết</>
            : <><ChevronDown className="size-3" />Xem theo tiêu chí</>}
        </button>
      </div>
      <div className="eb-council-table-wrap overflow-x-auto rounded-xl border bg-card">
        <table className="eb-council-table w-full text-sm" style={{ minWidth: showDetail ? "640px" : "0" }}>
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Thành viên HĐ</th>
              {showDetail && scoreFields.map(f => (
                <th key={f.key} className="px-2 py-2.5 font-medium">{f.hint}</th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium">DTB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {memberRows.map((row, idx) => {
              const isActive = row.id === activeMemberId;
              return (
                <tr key={row.id ?? idx} className={isActive ? "bg-primary/5" : undefined}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.title}</p>
                    {isActive && <Badge variant="outline" className="mt-1 text-[10px]">Đang nhập</Badge>}
                  </td>
                  {showDetail && scoreFields.map(f => (
                    <td key={f.key} className="px-2 py-2.5 text-center tabular-nums">
                      {row.scored
                        ? (
                          <span className="inline-flex flex-col items-center gap-0.5">
                            <span className="font-medium">{clampScore(row.scores?.[f.key]).toFixed(1)}</span>
                            <ScoreStars value={row.scores?.[f.key]} />
                          </span>
                        )
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {row.scored
                      ? <span className={row.average >= 2.5 ? "text-emerald-700" : "text-red-600"}>{row.average.toFixed(1)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
            <tr className="eb-council-table__avg border-t-2 bg-muted/25 font-medium">
              <td className="px-3 py-3">Trung bình Hội đồng</td>
              {showDetail && scoreFields.map(f => (
                <td key={f.key} className="px-2 py-3 text-center tabular-nums text-foreground">
                  {criterionAverages?.[f.key] != null ? criterionAverages[f.key].toFixed(1) : "—"}
                </td>
              ))}
              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary">
                {councilAverage.toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThresholdTable() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/50">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="font-medium uppercase tracking-wider">Bảng ngưỡng xếp loại</span>
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      {open && (
        <div className="border-t px-3 pb-3 pt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Dưới 2.5 điểm</span><span className="font-medium text-red-700">KHÔNG ĐẠT</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Từ 2.5 đến dưới 3.5 điểm</span><span className="font-medium text-amber-700">ĐẠT</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Từ 3.5 đến dưới 4.25 điểm</span><span className="font-medium text-sky-700">TỐT</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Từ 4.25 đến 5.0 điểm</span><span className="font-medium text-emerald-700">XUẤT SẮC</span></div>
        </div>
      )}
    </div>
  );
}

function ScoreFieldCard({ field, score, error, onScoreChange, onBlur }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={field.key}>{field.label}</Label>
          <span className="text-sm font-semibold tabular-nums text-foreground">{clampScore(score).toFixed(1)} / {SCORE_MAX}</span>
        </div>
        <p className="text-xs text-muted-foreground">{field.hint}</p>
        <StarRating value={score} onChange={onScoreChange} />
      </div>
      <Input
        id={field.key}
        type="number"
        inputMode="decimal"
        min="0"
        max={String(SCORE_MAX)}
        step="0.5"
        value={score}
        onChange={(e) => onScoreChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
      />
      {error
        ? <p className="text-xs text-red-600">{error}</p>
        : <p className="text-xs text-muted-foreground">Nhập điểm hoặc click ngôi sao. Bước 0.5.</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Eb() {
  const navigate = useNavigate();
  const user = getSession();

  // ── Server state ──────────────────────────────────────────────────────────
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingEval, setLoadingEval] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(null);
  // FIX 2: init "" thay vì null để Select luôn controlled
  const [activeMemberId, setActiveMemberId] = useState("");
  const [scoreType, setScoreType] = useState("color");
  const [scores, setScores] = useState(buildInitialScores);
  const [scoreErrors, setScoreErrors] = useState(buildInitialScores);
  const [feedback, setFeedback] = useState("");

  // ── Load danh sách thành viên HĐ từ /users/tantou-editors ──────────────────
  useEffect(() => {
    axiosClient.get("/users/tantou-editors")
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        if (!list.length) throw new Error("empty");
        setMembers(list.map(u => ({
          id: String(u.user_id),
          name: u.full_name ?? u.username,
          title: "Thành viên Hội đồng",
        })));
      })
      .catch(() => {
        toast.error("Không thể tải danh sách thành viên Hội đồng.");
        setMembers([]);
      });
  }, []);

  // ── Khởi tạo activeMemberId khi members load xong ────────────────────────
  useEffect(() => {
    if (members.length && !activeMemberId) setActiveMemberId(members[0].id);
  }, [members]);

  // ── Load hàng chờ ─────────────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const data = await getEbPendingSubmissions();
      // Chỉ hiển thị series đã qua Tantou (UnderReview)
      const filtered = data.filter(p =>
        (p.status ?? p.Status ?? "").toLowerCase() === "underreview"
      );
      setPending(filtered);
      if (filtered.length && !selectedId) {
        setSelectedId(filtered[0].seriesid ?? filtered[0].series_id ?? filtered[0].id);
      }
    } catch {
      toast.error("Không thể tải hàng chờ EB. Kiểm tra kết nối backend.");
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // ── Load evaluations khi chọn series ─────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setEvaluations([]); return; }
    setLoadingEval(true);
    getSeriesEvaluations(selectedId)
      .then(data => {
        setEvaluations(Array.isArray(data) ? data : []);
        const first = Array.isArray(data) ? data[0] : null;
        if (first?.score_type) setScoreType(first.score_type);
      })
      .catch(() => setEvaluations([]))
      .finally(() => setLoadingEval(false));
  }, [selectedId]);

  // ── Điền form khi đổi member hoặc evaluations ────────────────────────────
  useEffect(() => {
    if (!activeMemberId || !evaluations.length) {
      setScores(buildInitialScores());
      setScoreErrors(buildInitialScores());
      return;
    }
    const myEval = evaluations.find(e => String(e.member_id ?? e.memberId) === String(activeMemberId));
    if (myEval?.scores) {
      setScores(cur => ({ ...cur, ...Object.fromEntries(Object.entries(myEval.scores).map(([k, v]) => [k, Number(v).toFixed(1)])) }));
    } else {
      setScores(buildInitialScores());
    }
    setScoreErrors(buildInitialScores());
  }, [activeMemberId, evaluations]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const scoreFields = useMemo(() => buildScoreFields(scoreType), [scoreType]);

  const councilRecord = useMemo(
    () => buildCouncilRecordFromApi(evaluations, members),
    [evaluations, members]
  );

  const councilAggregate = useMemo(() => {
    const keys = scoreFields.map(f => f.key);
    return buildCouncilAggregate(councilRecord, members, keys);
  }, [councilRecord, members, scoreFields]);

  const councilClassification = getClassification(councilAggregate.councilAverage);
  const activeMember = members.find(m => m.id === activeMemberId);

  const activeSubmission = pending.find(p => (p.seriesid ?? p.series_id ?? p.id) === selectedId);
  const activeTitle = activeSubmission?.title ?? activeSubmission?.series_title ?? "";
  const activeSeriesImage = activeSubmission?.coverimageurl ?? activeSubmission?.cover_image_url ?? activeSubmission?.manga_image_url ?? placeholderPageDataUrl(activeTitle || "Chưa chọn series");

  const average = useMemo(() => {
    const total = scoreFields.reduce((sum, f) => sum + clampScore(scores[f.key]), 0);
    return scoreFields.length ? total / scoreFields.length : 0;
  }, [scoreFields, scores]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleLogout() { logout(); navigate("/login"); }

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

    const nextErrors = Object.fromEntries(scoreFields.map(f => [f.key, validateScore(scores[f.key])]));
    setScoreErrors(cur => ({ ...cur, ...nextErrors }));
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Có tiêu chí chưa hợp lệ. Vui lòng kiểm tra lại điểm.");
      return;
    }

    setSaving(true);
    try {
      await upsertMemberEvaluation({
        seriesId: selectedId,
        memberId: activeMemberId,
        assessment: {
          scoreType,
          scores: Object.fromEntries(scoreFields.map(f => [f.key, clampScore(scores[f.key])])),
          average: parseFloat(average.toFixed(1)),
          assessedAt: new Date().toISOString(),
          enteredBy: user?.name ?? "Đại diện EB",
        },
        existingEvaluations: evaluations,
      });

      const updated = await getSeriesEvaluations(selectedId);
      setEvaluations(Array.isArray(updated) ? updated : []);

      const updatedRecord = buildCouncilRecordFromApi(updated, members);
      const keys = scoreFields.map(f => f.key);
      const aggregate = buildCouncilAggregate(updatedRecord, members, keys);
      const cls = getClassification(aggregate.councilAverage);

      if (aggregate.scoredCount === members.length) {
        await patchSubmissionScore(selectedId, {
          score: aggregate.councilAverage,
          classification: cls.label,
        });
      }

      toast.success(`Đã lưu điểm ${activeMember?.name ?? "thành viên"} · DTB HĐ ${aggregate.councilAverage.toFixed(1)} (${aggregate.scoredCount}/${members.length})`);
    } catch {
      // axiosClient interceptor đã toast lỗi
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(seriesId, title) {
    const assessment = getQueueAssessment(seriesId);
    const incomplete = assessment.scoredCount < members.length;
    const failing = assessment.classification?.label === "KHÔNG ĐẠT";
    if (incomplete || failing) {
      const reason = failing
        ? `Series đang ở mức "${assessment.classification.label}".`
        : `Series mới có ${assessment.scoredCount}/${members.length} thành viên Hội đồng chấm điểm.`;
      if (!window.confirm(`${reason} Bạn vẫn muốn chấp nhận?`)) return;
    }
    try {
      await axiosClient.patch(`/Series/${seriesId}/status`, { Status: "Approved" });
      toast.success(`Đã chấp nhận "${title}".`);
      loadQueue();
    } catch { /* interceptor toast */ }
  }

  async function handleReject(seriesId, title) {
    if (!window.confirm(`Từ chối "${title}"? Series sẽ bị loại khỏi hàng chờ duyệt.`)) return;
    try {
      await axiosClient.patch(`/Series/${seriesId}/status`, { Status: "Rejected" });
      toast.success(`Đã từ chối "${title}".`);
      loadQueue();
    } catch { /* interceptor toast */ }
  }

  function getQueueAssessment(seriesId) {
    if (seriesId !== selectedId) return { scoredCount: 0, total: members.length, classification: null, councilAverage: 0 };
    return {
      scoredCount: councilAggregate.scoredCount,
      total: members.length,
      classification: councilAggregate.scoredCount > 0 ? councilClassification : null,
      councilAverage: councilAggregate.councilAverage,
    };
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ws-page--eb flex min-h-screen flex-col bg-background">
      <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />
      <WorkspaceHero
        label={`${LABEL_EDITOR_BOARD} · Hội đồng`}
        title={`Xin chào${user?.name ? `, ${user.name}` : ""}`}
        description="Nhập điểm từng thành viên Hội đồng — bảng tổng hợp cập nhật realtime từ API."
        className="ws-hero--eb"
      />

      <main className="page-container flex-1 space-y-8 py-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Nhập điểm (tài khoản đại diện)</CardTitle>
              <CardDescription>Chọn series trong hàng chờ, chọn thành viên, nhập điểm rồi Lưu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Banner đại diện */}
              <div className="eb-rep-banner rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">Tài khoản đại diện: <span className="text-primary">{user?.name ?? "Thư ký Hội đồng"}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Chọn thành viên HĐ, nhập điểm thay họ, rồi lưu — có thể lần lượt nhập cho từng người trong cùng series.</p>
              </div>

              {/* Series + loại truyện */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Series đang chấm</Label>
                  {loadingQueue
                    ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tải hàng chờ…</div>
                    : (
                      <Select
                        value={selectedId != null ? String(selectedId) : ""}
                        onValueChange={v => setSelectedId(Number(v) || v)}
                        disabled={pending.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={pending.length ? "Chọn series trong hàng chờ" : "Chưa có series chờ EB duyệt"} />
                        </SelectTrigger>
                        <SelectContent>
                          {pending.map((item, idx) => {
                            const id = item.seriesid ?? item.series_id ?? item.id;
                            const label = item.title ?? item.series_title ?? `Series #${id}`;
                            return (
                              <SelectItem key={id ?? idx} value={String(id)}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                </div>
                <div className="space-y-2">
                  <Label>Loại truyện</Label>
                  <Select value={scoreType} onValueChange={setScoreType}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="color">Truyện màu</SelectItem>
                      <SelectItem value="mono">Truyện không màu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Thành viên */}
              <div className="space-y-2">
                <Label>Thành viên đang nhập điểm</Label>
                {members.length === 0
                  ? <p className="text-sm text-muted-foreground">Không có thành viên Hội đồng nào.</p>
                  : (
                    // FIX 3: value="" thay vì value={null ?? undefined}
                    // FIX 4: key={memberId} dùng fallback idx
                    <Select value={activeMemberId} onValueChange={setActiveMemberId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn thành viên Hội đồng" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member, idx) => {
                          const memberId = member.id ?? String(idx);
                          const scored = councilAggregate.memberRows.find(r => r.id === member.id)?.scored;
                          return (
                            <SelectItem key={memberId} value={memberId}>
                              {member.name}{scored ? " · đã chấm" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                {activeMember && (
                  <p className="text-xs text-muted-foreground">
                    {activeMember.title} — DTB cá nhân tạm tính: <strong className="text-foreground">{average.toFixed(1)}</strong>
                  </p>
                )}
              </div>

              {/* Bảng điểm HĐ */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Điểm các thành viên Hội đồng</h3>
                  <p className="text-xs text-muted-foreground">
                    {loadingEval ? "Đang tải điểm…" : "Hiển thị điểm đã lưu của từng thành viên và trung bình chung."}
                  </p>
                </div>
                {loadingEval
                  ? <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tải…</div>
                  : (
                    <CouncilScoresTable
                      memberRows={councilAggregate.memberRows}
                      scoreFields={scoreFields}
                      criterionAverages={councilAggregate.criterionAverages}
                      councilAverage={councilAggregate.councilAverage}
                      scoredCount={councilAggregate.scoredCount}
                      activeMemberId={activeMemberId}
                    />
                  )}
              </div>

              {/* Score fields */}
              <div className="grid gap-4 md:grid-cols-2">
                {scoreFields.map((field, idx) => {
                  const isLastOdd = idx === scoreFields.length - 1 && scoreFields.length % 2 === 1;
                  return (
                    <div key={field.key} className={isLastOdd ? "md:col-span-2" : ""}>
                      <ScoreFieldCard
                        field={field}
                        score={scores[field.key]}
                        error={scoreErrors[field.key]}
                        onScoreChange={val => updateScore(field.key, val)}
                        onBlur={() => normalizeScoreField(field.key)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Nhận xét chung */}
              <div className="space-y-2">
                <Label htmlFor="feedback">Nhận xét chung cho series</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Nhận xét tổng quan của Hội đồng về series này..."
                  className="min-h-28"
                />
              </div>

              {/* DTB tổng hợp */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">DTB Hội đồng (tổng hợp)</p>
                <div className="flex items-end justify-between gap-3">
                  <div className="text-4xl font-bold tracking-tight text-foreground">{councilAggregate.councilAverage.toFixed(1)}</div>
                  <Badge variant="outline">/ {SCORE_MAX}.0</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {councilAggregate.scoredCount}/{members.length} thành viên đã chấm
                  {activeMember && <> · Đang nhập cho <strong className="text-foreground">{activeMember.name}</strong> (DTB {average.toFixed(1)})</>}
                </p>
                <Badge variant="secondary" className={`border ${councilClassification.className}`}>{councilClassification.label}</Badge>
                <p className="text-sm text-muted-foreground">{councilClassification.note}</p>
                <ThresholdTable />
              </div>

              {/* Sticky save bar */}
              <div className="sticky bottom-4 z-10">
                <div className="flex items-center gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-md backdrop-blur">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activeMember?.name ?? "Chọn thành viên"}{" · "}
                      <span className="text-muted-foreground">DTB cá nhân</span>{" "}{average.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DTB HĐ: <strong className="text-foreground">{councilAggregate.councilAverage.toFixed(1)}</strong>{" · "}
                      <Badge variant="secondary" className={`border text-[10px] py-0 px-1.5 ${councilClassification.className}`}>{councilClassification.label}</Badge>
                    </p>
                  </div>
                  <Button onClick={handleSaveAssessment} disabled={saving || !activeMemberId || !selectedId} className="shrink-0">
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    Lưu điểm
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ảnh series */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Ảnh series từ Tantou</CardTitle>
              <CardDescription>Hình preview của series đang được chấm.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-2xl border bg-muted/30">
                <img
                  src={activeSeriesImage}
                  alt={activeTitle ? `Ảnh series ${activeTitle}` : "Ảnh series đang chấm"}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Tantou gửi sang EB</Badge>
                  {activeSubmission?.chapter_num && <Badge variant="outline">Ch. {activeSubmission.chapter_num}</Badge>}
                </div>
                <p className="text-sm font-medium text-foreground">{activeTitle || "Chưa có series trong hàng chờ"}</p>
                <p className="text-sm text-muted-foreground">{activeSubmission?.page_label ?? "Ảnh lấy từ submission Tantou hoặc ảnh thay thế nếu chưa có."}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Hàng chờ duyệt */}
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Gavel className="size-5 text-primary" />Hàng chờ duyệt</h2>
            <p className="text-sm text-muted-foreground">
              Đồng bộ từ{" "}
              <Link to="/mangaka" className="font-medium text-primary hover:underline">Mangaka</Link>{" / "}
              <Link to="/tantou" className="font-medium text-primary hover:underline">Tantou</Link>
            </p>
          </div>
          {loadingQueue
            ? <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Đang tải hàng chờ…</CardContent></Card>
            : pending.length === 0
              ? <Card><CardContent className="py-16 text-center text-muted-foreground">Không có series lần đầu trong hàng chờ.</CardContent></Card>
              : (
                <div className="grid gap-4">
                  {pending.map((p, idx) => {
                    const id = p.seriesid ?? p.series_id ?? p.id;
                    const title = p.title ?? p.series_title ?? `Series #${id}`;
                    const assessment = getQueueAssessment(id);
                    const isActive = id === selectedId;
                    return (
                      <Card
                        key={id ?? idx}
                        onClick={() => setSelectedId(id)}
                        className={`cursor-pointer transition-shadow hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""}`}
                      >
                        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{title}</h3>
                              <Badge variant="secondary">✦ Lần đầu</Badge>
                              {assessment.scoredCount > 0
                                ? <Badge variant="secondary" className={`border text-[11px] ${assessment.classification.className}`}>{assessment.scoredCount}/{assessment.total} đã chấm · {assessment.classification.label}</Badge>
                                : <Badge variant="outline" className="text-[11px] text-muted-foreground">Chưa có điểm</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {[
                                p.genres?.slice(0, 2).map(g => g?.genrename ?? g?.name ?? "").filter(Boolean).join(" · "),
                                p.publishformat,
                              ].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleReject(id, title)}>
                              <XCircle className="size-4" />Từ chối
                            </Button>
                            <Button onClick={() => handleApprove(id, title)}>
                              <CheckCircle2 className="size-4" />Chấp nhận
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
        </section>
      </main>

      <Footer />
    </div>
  );
}