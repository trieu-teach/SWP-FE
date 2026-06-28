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
import axiosClient from "@/api/axiosClient.js";
import "./Eb.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { to: "/", label: "Trang chủ" },
  { to: "/mangaka", label: "Mangaka" },
  { to: "/tantou", label: "Tantou Editor" },
];

const COMMON_CRITERIA = [
  { key: "plotDialogue",   label: "Cốt truyện & Lời thoại",     hint: "Plot & Dialogue" },
  { key: "artDesign",      label: "Nét vẽ & Tạo hình nhân vật", hint: "Art Style & Character Design" },
  { key: "panelingCamera", label: "Phân khung & Góc máy",        hint: "Paneling & Camera Angles" },
  { key: "pacingHook",     label: "Nhịp độ & Cao trào",          hint: "Pacing & Hook" },
];

const TYPE_CRITERIA = {
  color: { key: "coloring", label: "Đổ màu & Phối màu", hint: "Coloring" },
};

const SCORE_MAX = 5;

// Status của EB queue — normalize để tránh case mismatch
// DB value: 'EBReview' — backend có thể trả đúng value này hoặc map sang tên khác
const EB_STATUSES = new Set(['ebreview', 'underreview', 'eb_review', 'eb-review'])

function normalizeStatus(raw) {
  return (raw ?? '').toLowerCase().replace(/[_\s-]/g, '')
}

function isEbStatus(raw) {
  return EB_STATUSES.has(normalizeStatus(raw))
}

// ─── Score helpers ─────────────────────────────────────────────────────────────
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

function buildScoreFields() {
  return [...COMMON_CRITERIA, TYPE_CRITERIA.color];
}

function buildInitialScores() {
  return { plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" };
}

function getClassification(average) {
  if (average < 2.5)  return { label: "KHÔNG ĐẠT", note: "Series chưa đạt chất lượng, cần chỉnh sửa lớn trước khi xét lại.", className: "border-red-200 bg-red-50 text-red-700" };
  if (average < 3.5)  return { label: "ĐẠT",       note: "Series có thể thông qua, nhưng cần cải thiện theo ghi chú.",       className: "border-amber-200 bg-amber-50 text-amber-700" };
  if (average < 4.25) return { label: "TỐT",        note: "Chất lượng series ổn định, phù hợp duyệt nhanh.",                  className: "border-sky-200 bg-sky-50 text-sky-700" };
  return               { label: "XUẤT SẮC",          note: "Series chất lượng cao, phù hợp đẩy nổi bật/banner.",              className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function mapEvalDetailToScores(detail) {
  if (!detail) return buildInitialScores();
  return {
    plotDialogue:   String(detail.storyScore      ?? detail.story_score      ?? 0),
    artDesign:      String(detail.artScore        ?? detail.art_score        ?? 0),
    panelingCamera: String(detail.characterScore  ?? detail.character_score  ?? 0),
    coloring:       String(detail.commercialScore ?? detail.commercial_score ?? 0),
    toneShading:    String(detail.commercialScore ?? detail.commercial_score ?? 0),
    pacingHook:     String(detail.pacingScore     ?? detail.pacing_score     ?? 0),
  };
}

function buildCouncilAggregateFromMembers(members, scoreFields) {
  const keys = scoreFields.map(f => f.key);

  const memberRows = members.map((m) => {
    if (!m.hasEvaluated || !m.evalDetail) {
      return { ...m, scored: false, scores: {}, average: 0 };
    }
    const scores = mapEvalDetailToScores(m.evalDetail);
    const vals   = keys.map(k => Number(scores[k] ?? 0));
    const avg    = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { ...m, scored: true, scores, average: parseFloat(avg.toFixed(2)) };
  });

  const scoredRows  = memberRows.filter(r => r.scored);
  const scoredCount = scoredRows.length;

  const criterionAverages = {};
  if (scoredCount > 0) {
    for (const key of keys) {
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
  const [pending, setPending]               = useState([]);
  const [members, setMembers]               = useState([]);
  const [loadingQueue, setLoadingQueue]     = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving]                 = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId]         = useState(null);
  const [activeMemberId, setActiveMemberId] = useState("");
  const [scores, setScores]                 = useState(buildInitialScores);
  const [scoreErrors, setScoreErrors]       = useState(buildInitialScores);
  const [feedback, setFeedback]             = useState("");

  // ── Load hàng chờ EB ──────────────────────────────────────────────────────
  // Strategy: thử /Submissions/eb trước. Nếu trả [] thì fallback về /Series
  // và tự filter status EBReview ở FE — đảm bảo luôn có data kể cả khi
  // backend endpoint /Submissions/eb chưa hoạt động đúng.
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [subRes, seriesRes] = await Promise.allSettled([
        axiosClient.get("/Submissions/eb"),
        axiosClient.get("/Series"),
      ]);

      // Lấy data từ /Submissions/eb
      let ebData = [];
      if (subRes.status === "fulfilled") {
        const raw = subRes.value.data;
        ebData = Array.isArray(raw) ? raw : (raw?.data ?? []);
      }

      // Nếu /Submissions/eb trả [] → fallback: lọc /Series theo EBReview
      if (ebData.length === 0 && seriesRes.status === "fulfilled") {
        const raw = seriesRes.value.data;
        const all = Array.isArray(raw) ? raw : (raw?.data ?? []);
        ebData = all.filter(s => isEbStatus(s.status));
      }

      // Normalize: đảm bảo mỗi item có field id nhất quán
      const normalized = ebData.map(item => ({
        ...item,
        // Backend có thể dùng series_id, seriesid, hoặc id
        _resolvedId: item.series_id ?? item.seriesid ?? item.id,
      }));

      setPending(normalized);

      if (normalized.length && !selectedId) {
        setSelectedId(normalized[0]._resolvedId);
      }
    } catch {
      toast.error("Không thể tải hàng chờ EB. Kiểm tra kết nối backend.");
    } finally {
      setLoadingQueue(false);
    }
  }, [selectedId]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // ── Load evaluators + evaluations ────────────────────────────────────────
  const loadEvaluatorsStatus = useCallback(async (seriesId) => {
    if (!seriesId) { setMembers([]); return; }
    setLoadingMembers(true);
    try {
      const [usersRes, evalsRes] = await Promise.allSettled([
        axiosClient.get("/users/evaluators"),
        axiosClient.get(`/Submissions/${seriesId}/evaluations`),
      ]);

      let userList = [];
      if (usersRes.status === "fulfilled") {
        const raw = usersRes.value.data?.data ?? usersRes.value.data ?? [];
        userList = Array.isArray(raw) ? raw : [];
      } else {
        toast.error("Không thể tải danh sách thành viên Hội đồng.");
      }

      let evalList = [];
      if (evalsRes.status === "fulfilled") {
        const raw = evalsRes.value.data;
        evalList = Array.isArray(raw) ? raw : (raw?.data ?? []);
      }

      const mapped = userList.map(u => {
        const uid = String(u.userId ?? u.user_id ?? u.id ?? u.userid);
        const myEval = evalList.find(e =>
          String(e.ebId ?? e.eb_id ?? e.memberId ?? e.member_id ?? e.userid) === uid
        );
        return {
          id:           uid,
          name:         u.fullName ?? u.full_name ?? u.fullname ?? u.username,
          title:        "Thành viên Hội đồng",
          hasEvaluated: Boolean(myEval),
          evalDetail:   myEval
            ? {
                storyScore:      myEval.storyScore      ?? myEval.story_score      ?? 0,
                artScore:        myEval.artScore        ?? myEval.art_score        ?? 0,
                characterScore:  myEval.characterScore  ?? myEval.character_score  ?? 0,
                commercialScore: myEval.commercialScore ?? myEval.commercial_score ?? 0,
                pacingScore:     myEval.pacingScore     ?? myEval.pacing_score     ?? 0,
                feedback:        myEval.feedback        ?? "",
              }
            : null,
        };
      });

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
  const activeTitle = activeSubmission?.title ?? activeSubmission?.series_title ?? "";
  const activeSeriesImage =
    activeSubmission?.cover_image_url ??
    activeSubmission?.coverimageurl ??
    activeSubmission?.manga_image_url ??
    placeholderPageDataUrl(activeTitle || "Chưa chọn series");

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
    if (!selectedId)     { toast.error("Chưa chọn series để chấm điểm."); return; }
    if (!activeMemberId) { toast.error("Chưa chọn thành viên Hội đồng."); return; }

    const nextErrors = Object.fromEntries(
      scoreFields.map(f => [f.key, validateScore(scores[f.key])])
    );
    setScoreErrors(cur => ({ ...cur, ...nextErrors }));
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Có tiêu chí chưa hợp lệ. Vui lòng kiểm tra lại điểm.");
      return;
    }

    const scoreBody = {
      ebId:            Number(activeMemberId),
      storyScore:      clampScore(scores.plotDialogue),
      artScore:        clampScore(scores.artDesign),
      characterScore:  clampScore(scores.panelingCamera),
      commercialScore: clampScore(scores.coloring),
      pacingScore:     clampScore(scores.pacingHook),
      feedback:        feedback.trim(),
    };

    setSaving(true);
    try {
      await axiosClient.patch(`/Submissions/${selectedId}/score`, scoreBody);
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

  async function handleApprove(seriesId, title) {
    const assessment = getQueueAssessment(seriesId);
    const incomplete = assessment.scoredCount < members.length;
    const failing    = assessment.classification?.label === "KHÔNG ĐẠT";

    if (incomplete || failing) {
      const reason = failing
        ? `Series đang ở mức "${assessment.classification.label}".`
        : `Series mới có ${assessment.scoredCount}/${members.length} thành viên Hội đồng chấm điểm.`;
      if (!window.confirm(`${reason} Bạn vẫn muốn chấp nhận?`)) return;
    }
    try {
      // Theo DB constraint: status hợp lệ là 'Publishing'
      await axiosClient.patch(`/Series/${seriesId}/status`, { status: "Publishing" });
      toast.success(`Đã chấp nhận "${title}" — chuyển sang phát hành.`);
      loadQueue();
    } catch { /* interceptor toast */ }
  }

  async function handleReject(seriesId, title) {
    if (!window.confirm(`Từ chối "${title}"? Series sẽ bị trả về Mangaka chỉnh sửa.`)) return;
    try {
      // Trả về Draft để Mangaka chỉnh lại
      await axiosClient.patch(`/Series/${seriesId}/status`, { status: "Draft" });
      toast.success(`Đã từ chối "${title}" — trả về Mangaka.`);
      loadQueue();
    } catch { /* interceptor toast */ }
  }

  function getQueueAssessment(seriesId) {
    if (seriesId !== selectedId) return { scoredCount: 0, total: members.length, classification: null, councilAverage: 0 };
    return {
      scoredCount:    councilAggregate.scoredCount,
      total:          members.length,
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

              {/* Series */}
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
                          const id    = item._resolvedId;
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

              {/* Thành viên */}
              <div className="space-y-2">
                <Label>Thành viên đang nhập điểm</Label>
                {loadingMembers
                  ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tải danh sách Hội đồng…</div>
                  : members.length === 0
                    ? <p className="text-sm text-muted-foreground">Không có thành viên Hội đồng nào.</p>
                    : (
                      <Select value={activeMemberId} onValueChange={setActiveMemberId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn thành viên Hội đồng" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member, idx) => (
                            <SelectItem key={member.id ?? idx} value={member.id}>
                              {member.name}{member.hasEvaluated ? " · đã chấm ✓" : " · chưa chấm"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                {activeMember && (
                  <p className="text-xs text-muted-foreground">
                    {activeMember.title} — DTB cá nhân tạm tính:{" "}
                    <strong className="text-foreground">{average.toFixed(1)}</strong>
                    {activeMember.hasEvaluated && (
                      <Badge variant="outline" className="ml-2 text-[10px] border-emerald-200 text-emerald-700">Đã chấm</Badge>
                    )}
                  </p>
                )}
              </div>

              {/* Bảng điểm HĐ */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Điểm các thành viên Hội đồng</h3>
                  <p className="text-xs text-muted-foreground">
                    {loadingMembers ? "Đang tải điểm…" : "Hiển thị điểm đã lưu của từng thành viên và trung bình chung."}
                  </p>
                </div>
                {loadingMembers
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
                  <Button
                    onClick={handleSaveAssessment}
                    disabled={saving || !activeMemberId || !selectedId}
                    className="shrink-0"
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {activeMember?.hasEvaluated ? "Cập nhật điểm" : "Lưu điểm"}
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
                  {activeSubmission?.agerating && <Badge variant="outline">{activeSubmission.agerating}</Badge>}
                  {activeSubmission?.publishformat && <Badge variant="outline">{activeSubmission.publishformat}</Badge>}
                </div>
                <p className="text-sm font-medium text-foreground">{activeTitle || "Chưa có series trong hàng chờ"}</p>
                <p className="text-sm text-muted-foreground">
                  {activeSubmission?.synopsis
                    ? <span className="line-clamp-3">{activeSubmission.synopsis}</span>
                    : "Ảnh lấy từ submission Tantou hoặc ảnh thay thế nếu chưa có."}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Hàng chờ duyệt */}
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Gavel className="size-5 text-primary" />Hàng chờ duyệt EB
            </h2>
            <p className="text-sm text-muted-foreground">
              Series đang ở trạng thái EBReview — click để chọn và nhập điểm.
            </p>
          </div>
          {loadingQueue
            ? (
              <Card>
                <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />Đang tải hàng chờ…
                </CardContent>
              </Card>
            )
            : pending.length === 0
              ? (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground">
                    Không có series trong hàng chờ EB duyệt.
                  </CardContent>
                </Card>
              )
              : (
                <div className="grid gap-4">
                  {pending.map((p, idx) => {
                    const id         = p._resolvedId;
                    const title      = p.title ?? p.series_title ?? `Series #${id}`;
                    const assessment = getQueueAssessment(id);
                    const isActive   = id === selectedId;
                    return (
                      <Card
                        key={id ?? idx}
                        onClick={() => setSelectedId(id)}
                        className={`cursor-pointer transition-shadow hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""}`}
                      >
                        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex gap-4">
                            {/* Cover thumbnail */}
                            {(p.coverimageurl || p.cover_image_url) && (
                              <div className="size-14 shrink-0 overflow-hidden rounded-lg">
                                <img
                                  src={p.coverimageurl ?? p.cover_image_url}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{title}</h3>
                                <Badge variant="secondary">✦ EBReview</Badge>
                                {p.agerating && <Badge variant="outline" className="text-[11px]">{p.agerating}</Badge>}
                                {assessment.scoredCount > 0
                                  ? (
                                    <Badge variant="secondary" className={`border text-[11px] ${assessment.classification.className}`}>
                                      {assessment.scoredCount}/{assessment.total} đã chấm · {assessment.classification.label}
                                    </Badge>
                                  )
                                  : <Badge variant="outline" className="text-[11px] text-muted-foreground">Chưa có điểm</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {p.synopsis ?? ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleReject(id, title)}
                            >
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