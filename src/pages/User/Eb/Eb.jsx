import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, Gavel, Star, XCircle } from "lucide-react";
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
import {
  approveEbDebutSeries,
  readEbDebutApproved,
  readEbDebutPending,
  // TODO: cần thêm 2 hàm này vào utils/ebDebutStorage.js — xem gợi ý implementation
  // ở cuối phần giải thích. Đặt tạm comment để file không vỡ build trước khi bạn thêm.
  readEbDebutRejected,
  rejectEbDebutSeries,
} from "@/utils/ebDebutStorage.js";
import { updateSeriesEbAssessmentInWorkspace } from "@/utils/mangakaWorkspaceReader.js";
import { listTantouSubmissions } from "@/utils/tantouWorkspaceStorage.js";
import { placeholderPageDataUrl } from "@/utils/assistantWorkspaceStorage.js";
import { LABEL_EDITOR_BOARD } from "@/constants/roleTerminology.js";
import {
  EB_COUNCIL_MEMBERS,
  buildCouncilAggregate,
  readCouncilSeriesScores,
  saveCouncilMemberAssessment,
  seedCouncilDemoScores,
} from "@/utils/ebCouncilStorage.js";
import "./Eb.css";

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

// ── Interactive star rating ──────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const safe = clampScore(value);
  const display = hovered ?? safe;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: SCORE_MAX }, (_, idx) => {
        const fullScore = idx + 1;
        const halfScore = idx + 0.5;
        const isFull = display >= fullScore;
        const isHalf = !isFull && display >= halfScore;

        return (
          <span
            key={fullScore}
            className="relative inline-flex size-6 cursor-pointer"
          >
            <span
              className="absolute inset-0 z-10 w-1/2"
              onMouseEnter={() => setHovered(halfScore)}
              onClick={() => onChange(halfScore.toFixed(1))}
            />
            <span
              className="absolute inset-y-0 right-0 z-10 w-1/2"
              onMouseEnter={() => setHovered(fullScore)}
              onClick={() => onChange(fullScore.toFixed(1))}
            />
            <Star className="size-6 text-muted-foreground/30" />
            {isFull && (
              <Star className="absolute inset-0 size-6 fill-amber-400 text-amber-400" />
            )}
            {isHalf && (
              <span className="absolute inset-0 w-1/2 overflow-hidden">
                <Star className="size-6 fill-amber-400 text-amber-400" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── Read-only stars (for table) ───────────────────────────────────────────────
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
            {isHalf && (
              <span className="absolute inset-0 w-1/2 overflow-hidden">
                <Star className="size-4 fill-amber-400 text-amber-400" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function getClassification(average) {
  if (average < 2.5) return { label: "KHÔNG ĐẠT", note: "Series chưa đạt chất lượng, cần chỉnh sửa lớn trước khi xét lại.", className: "border-red-200 bg-red-50 text-red-700" };
  if (average < 3.5) return { label: "ĐẠT", note: "Series có thể thông qua, nhưng cần cải thiện theo ghi chú.", className: "border-amber-200 bg-amber-50 text-amber-700" };
  if (average < 4.25) return { label: "TỐT", note: "Chất lượng series ổn định, phù hợp duyệt nhanh.", className: "border-sky-200 bg-sky-50 text-sky-700" };
  return { label: "XUẤT SẮC", note: "Series chất lượng cao, phù hợp đẩy nổi bật/banner.", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function buildScoreFields(scoreType) {
  const typeField = TYPE_CRITERIA[scoreType] ?? TYPE_CRITERIA.color;
  return [...COMMON_CRITERIA, typeField];
}

// FIX #2: mặc định để rỗng "" thay vì "0" — tránh nhầm "chưa chấm" thành "chấm 0 điểm"
function buildInitialNotes() {
  return { plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" };
}

function buildInitialScores() {
  return { plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" };
}

function CouncilScoresTable({ memberRows, scoreFields, criterionAverages, councilAverage, scoredCount, activeMemberId }) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{scoredCount}/{memberRows.length} thành viên đã chấm</p>
        <button type="button" onClick={() => setShowDetail(v => !v)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          {showDetail ? <><ChevronUp className="size-3" />Ẩn chi tiết</> : <><ChevronDown className="size-3" />Xem theo tiêu chí</>}
        </button>
      </div>
      <div className="eb-council-table-wrap overflow-x-auto rounded-xl border bg-card">
        <table className="eb-council-table w-full text-sm" style={{ minWidth: showDetail ? "640px" : "0" }}>
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Thành viên HĐ</th>
              {showDetail && scoreFields.map(f => <th key={f.key} className="px-2 py-2.5 font-medium">{f.hint}</th>)}
              <th className="px-3 py-2.5 text-right font-medium">DTB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {memberRows.map(row => {
              const isActive = row.id === activeMemberId;
              return (
                <tr key={row.id} className={isActive ? "bg-primary/5" : undefined}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.title}</p>
                    {isActive && <Badge variant="outline" className="mt-1 text-[10px]">Đang nhập</Badge>}
                  </td>
                  {showDetail && scoreFields.map(f => (
                    <td key={f.key} className="px-2 py-2.5 text-center tabular-nums">
                      {row.scored ? (
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <span className="font-medium">{clampScore(row.scores?.[f.key]).toFixed(1)}</span>
                          <ScoreStars value={row.scores?.[f.key]} />
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {row.scored ? <span className={row.average >= 2.5 ? "text-emerald-700" : "text-red-600"}>{row.average.toFixed(1)}</span> : <span className="text-muted-foreground">—</span>}
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
              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary">{councilAverage.toFixed(1)}</td>
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
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
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

// ── Score field card ──────────────────────────────────────────────────────────
function ScoreFieldCard({ field, score, error, note, onScoreChange, onBlur, onNoteChange }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={field.key}>{field.label}</Label>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {clampScore(score).toFixed(1)} / {SCORE_MAX}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{field.hint}</p>
        <StarRating
          value={score}
          onChange={(val) => {
            onScoreChange(val);
          }}
        />
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
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Nhập điểm hoặc click ngôi sao. Bước 0.5.</p>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${field.key}-note`} className="text-xs text-muted-foreground">
          Ghi chú riêng cho tiêu chí này
        </Label>
        <Textarea
          id={`${field.key}-note`}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Nhận xét ngắn cho tiêu chí này..."
          className="min-h-20"
        />
      </div>
    </div>
  );
}

export default function Eb() {
  const navigate = useNavigate();
  const user = getSession();
  const [councilTick, bumpCouncil] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [activeMemberId, setActiveMemberId] = useState(EB_COUNCIL_MEMBERS[0].id);
  const [scoreType, setScoreType] = useState("color");
  const [scores, setScores] = useState(buildInitialScores);
  const [criterionNotes, setCriterionNotes] = useState(buildInitialNotes);
  const [scoreErrors, setScoreErrors] = useState({ plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" });
  const refresh = useCallback(() => bumpCouncil(n => n + 1), []);

  useEffect(() => {
    const onSync = () => refresh();
    window.addEventListener("mk-eb-pending-update", onSync);
    window.addEventListener("mk-eb-council-update", onSync);
    window.addEventListener("storage", onSync);
    window.addEventListener("mk-eb-approved-update", onSync);
    return () => {
      window.removeEventListener("mk-eb-pending-update", onSync);
      window.removeEventListener("mk-eb-council-update", onSync);
      window.removeEventListener("storage", onSync);
      window.removeEventListener("mk-eb-approved-update", onSync);
    };
  }, [refresh]);

  function handleLogout() { logout(); navigate("/login"); }

  const approved = readEbDebutApproved();
  const rejected = readEbDebutRejected ? readEbDebutRejected() : {}; // FIX #4 dependency
  const pending = readEbDebutPending().filter(p => p?.title && !approved[p.title] && !rejected[p.title]);
  const approvedList = Object.keys(approved).filter(k => approved[k]);
  const scoreFields = useMemo(() => buildScoreFields(scoreType), [scoreType]);
  const activeTitle = pending.some(item => item.title === selectedTitle) ? selectedTitle : (pending[0]?.title ?? "");

  // FIX #5: chỉ auto-seed điểm demo ở môi trường dev, không chạy ở production
  useEffect(() => {
    if (!activeTitle) return;
    const existing = readCouncilSeriesScores(activeTitle);
    const isDev = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;
    if (!existing && isDev) {
      seedCouncilDemoScores(activeTitle, scoreType);
      refresh();
    }
  }, [activeTitle, scoreType, refresh]);

  const councilRecord = useMemo(() => activeTitle ? readCouncilSeriesScores(activeTitle) : null, [activeTitle, councilTick]);

  useEffect(() => {
    if (!activeTitle) return;
    const record = readCouncilSeriesScores(activeTitle);
    if (record?.scoreType) setScoreType(record.scoreType);
    const memberEntry = record?.members?.[activeMemberId];
    if (memberEntry?.scores) {
      setScores(cur => ({ ...cur, ...Object.fromEntries(Object.entries(memberEntry.scores).map(([k, v]) => [k, Number(v).toFixed(1)])) }));
      setCriterionNotes(cur => ({ ...cur, ...(memberEntry.criterionNotes ?? {}) }));
      setScoreErrors({ plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" });
      return;
    }
    setScores(buildInitialScores());
    setCriterionNotes(buildInitialNotes());
    setScoreErrors({ plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" });
  }, [activeTitle, activeMemberId, councilTick]);

  const activeTantouSubmission = listTantouSubmissions().find(s => s.seriesTitle === activeTitle) ?? null;
  const activeSeriesImage = activeTantouSubmission?.mangakaImageUrl || placeholderPageDataUrl(activeTitle ? `${activeTitle} · Tantou` : "Chưa chọn series");

  const average = useMemo(() => {
    const total = scoreFields.reduce((sum, f) => sum + clampScore(scores[f.key]), 0);
    return scoreFields.length ? total / scoreFields.length : 0;
  }, [scoreFields, scores]);

  const councilAggregate = useMemo(() => {
    const keys = scoreFields.map(f => f.key);
    return buildCouncilAggregate(councilRecord, keys);
  }, [councilRecord, scoreFields]);

  const councilClassification = getClassification(councilAggregate.councilAverage);
  const activeMember = EB_COUNCIL_MEMBERS.find(m => m.id === activeMemberId);

  // FIX #3: đọc trạng thái điểm của BẤT KỲ title nào trong hàng chờ (không chỉ activeTitle)
  // để hiển thị badge + gate khi bấm Chấp nhận/Từ chối ngay trên từng card.
  const getQueueAssessment = useCallback((title) => {
    const record = readCouncilSeriesScores(title);
    const total = EB_COUNCIL_MEMBERS.length;
    if (!record) return { scoredCount: 0, total, classification: null, councilAverage: 0 };
    const fields = buildScoreFields(record.scoreType ?? "color");
    const keys = fields.map(f => f.key);
    const aggregate = buildCouncilAggregate(record, keys);
    return {
      scoredCount: aggregate.scoredCount,
      total,
      classification: aggregate.scoredCount > 0 ? getClassification(aggregate.councilAverage) : null,
      councilAverage: aggregate.councilAverage,
    };
  }, [councilTick]);

  function updateScore(key, value) {
    setScores(cur => ({ ...cur, [key]: value }));
    setScoreErrors(cur => ({ ...cur, [key]: validateScore(value) }));
  }

  // FIX #1: snap về bước 0.5 thật, và không tự điền 0 khi ô đang để trống
  function normalizeScoreField(key) {
    const raw = String(scores[key] ?? "").trim();
    if (!raw) {
      setScoreErrors(cur => ({ ...cur, [key]: validateScore(raw) }));
      return;
    }
    const stepped = Math.round(clampScore(raw) * 2) / 2;
    const next = stepped.toFixed(1);
    setScores(cur => ({ ...cur, [key]: next }));
    setScoreErrors(cur => ({ ...cur, [key]: validateScore(next) }));
  }

  function updateCriterionNote(key, value) {
    setCriterionNotes(cur => ({ ...cur, [key]: value }));
  }

  // FIX #3: soft-gate — vẫn cho phép EB override (vì Tantou có thể đã chịu trách nhiệm
  // nội dung từ trước), nhưng phải xác nhận rõ ràng khi chưa đủ điểm hoặc đang KHÔNG ĐẠT.
  function handleApprove(title) {
    const { scoredCount, total, classification } = getQueueAssessment(title);
    const incomplete = scoredCount < total;
    const failing = classification?.label === "KHÔNG ĐẠT";
    if (incomplete || failing) {
      const reason = failing
        ? `Series đang ở mức "${classification.label}".`
        : `Series mới có ${scoredCount}/${total} thành viên Hội đồng chấm điểm.`;
      const confirmed = window.confirm(`${reason} Bạn vẫn muốn chấp nhận?`);
      if (!confirmed) return;
    }
    approveEbDebutSeries(title);
    toast.success(`Đã chấp nhận "${title}".`);
    refresh();
  }

  // FIX #4: thêm hành động Từ chối — cần thêm rejectEbDebutSeries/readEbDebutRejected
  // vào utils/ebDebutStorage.js (xem gợi ý implementation trong phần giải thích đi kèm).
  function handleReject(title) {
    const confirmed = window.confirm(`Từ chối "${title}"? Series sẽ bị loại khỏi hàng chờ duyệt.`);
    if (!confirmed) return;
    if (typeof rejectEbDebutSeries === "function") {
      rejectEbDebutSeries(title);
    }
    toast.success(`Đã từ chối "${title}".`);
    refresh();
  }

  function handleSaveAssessment() {
    if (!activeTitle) { toast.error("Chưa có chapter trong hàng chờ để chấm điểm."); return; }
    const nextErrors = Object.fromEntries(scoreFields.map(f => [f.key, validateScore(scores[f.key])]));
    setScoreErrors(cur => ({ ...cur, ...nextErrors }));
    if (Object.values(nextErrors).some(Boolean)) { toast.error("Có tiêu chí chưa hợp lệ. Vui lòng kiểm tra lại điểm."); return; }

    const criterionDetails = scoreFields.map(f => ({ key: f.key, label: f.label, hint: f.hint, score: clampScore(scores[f.key]), note: criterionNotes[f.key] || "" }));
    const summaryNotes = criterionDetails.filter(c => c.note.trim()).map(c => `${c.label}: ${c.note.trim()}`);

    saveCouncilMemberAssessment(activeTitle, activeMemberId, {
      scoreType,
      scores: Object.fromEntries(criterionDetails.map(c => [c.key, c.score])),
      criterionNotes: { ...criterionNotes },
      average: Number(average.toFixed(1)),
      assessedAt: new Date().toISOString(),
      enteredBy: user?.name ?? "Đại diện EB",
    });

    const updatedRecord = readCouncilSeriesScores(activeTitle);
    const keys = scoreFields.map(f => f.key);
    const aggregate = buildCouncilAggregate(updatedRecord, keys);
    const councilClass = getClassification(aggregate.councilAverage);
    const memberAssessments = aggregate.memberRows.filter(r => r.scored).map(r => ({ memberId: r.id, memberName: r.name, memberTitle: r.title, average: r.average, scores: r.scores, assessedAt: r.assessedAt, enteredBy: r.enteredBy }));

    updateSeriesEbAssessmentInWorkspace(activeTitle, {
      seriesTitle: activeTitle,
      chapterNum: activeTantouSubmission?.chapterNum ?? null,
      scoreType,
      average: aggregate.councilAverage,
      councilAverage: aggregate.councilAverage,
      memberAverage: Number(average.toFixed(1)),
      activeMemberId,
      activeMemberName: activeMember?.name ?? null,
      classification: councilClass.label,
      classificationNote: councilClass.note,
      scores: aggregate.criterionAverages,
      criteria: scoreFields.map(f => ({ key: f.key, label: f.label, hint: f.hint, score: aggregate.criterionAverages[f.key] ?? 0, note: "" })),
      memberAssessments,
      councilScoredCount: aggregate.scoredCount,
      councilMemberCount: EB_COUNCIL_MEMBERS.length,
      summaryNotes,
      source: "eb-council",
      assessedAt: new Date().toISOString(),
      enteredBy: user?.name ?? "Đại diện EB",
    });

    refresh();
    toast.success(`Đã lưu điểm ${activeMember?.name ?? "thành viên"} · DTB HĐ ${aggregate.councilAverage.toFixed(1)} (${aggregate.scoredCount}/${EB_COUNCIL_MEMBERS.length})`);
  }

  return (
    <div className="ws-page--eb flex min-h-screen flex-col bg-background">
      <Header links={NAV_LINKS} onLogout={user ? handleLogout : undefined} />
      <WorkspaceHero
        label={`${LABEL_EDITOR_BOARD} · demo`}
        title={`Xin chào${user?.name ? `, ${user.name}` : ""}`}
        description="Một tài khoản đại diện nhập điểm từng thành viên — bảng tổng hợp hiển thị đầy đủ điểm Hội đồng."
        className="ws-hero--eb"
      />

      <main className="page-container flex-1 space-y-8 py-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Nhập điểm (tài khoản đại diện)</CardTitle>
              <CardDescription>
                Đại diện Hội đồng nhập điểm cho từng thành viên. Bảng bên dưới luôn hiển thị đủ điểm của cả Hội đồng và DTB chung.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="eb-rep-banner rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  Tài khoản đại diện: <span className="text-primary">{user?.name ?? "Thư ký Hội đồng"}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chọn thành viên HĐ, nhập điểm thay họ, rồi lưu — có thể lần lượt nhập cho từng người trong cùng series.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Series đang chấm</Label>
                  <Select value={activeTitle || undefined} onValueChange={setSelectedTitle} disabled={pending.length === 0}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={pending.length ? "Chọn series trong hàng chờ" : "Chưa có series chờ EB duyệt"} />
                    </SelectTrigger>
                    <SelectContent>
                      {pending.map(item => <SelectItem key={item.title} value={item.title}>{item.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {pending.length === 0 && (
                    <p className="text-xs text-muted-foreground">Hàng chờ lấy từ localStorage (demo). Chưa nối API <code className="text-[10px]">/submissions/eb</code>.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Loại truyện</Label>
                  <Select value={scoreType} onValueChange={setScoreType}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Chọn loại truyện" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="color">Truyện màu</SelectItem>
                      <SelectItem value="mono">Truyện không màu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Thành viên đang nhập điểm</Label>
                <Select value={activeMemberId} onValueChange={setActiveMemberId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Chọn thành viên Hội đồng" /></SelectTrigger>
                  <SelectContent>
                    {EB_COUNCIL_MEMBERS.map(member => {
                      const scored = councilAggregate.memberRows.find(r => r.id === member.id)?.scored;
                      return <SelectItem key={member.id} value={member.id}>{member.name}{scored ? " · đã chấm" : ""}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                {activeMember && (
                  <p className="text-xs text-muted-foreground">
                    {activeMember.title} — DTB cá nhân tạm tính: <strong className="text-foreground">{average.toFixed(1)}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Điểm các thành viên Hội đồng</h3>
                  <p className="text-xs text-muted-foreground">Hiển thị đầy đủ điểm đã lưu của từng thành viên và trung bình chung.</p>
                </div>
                <CouncilScoresTable
                  memberRows={councilAggregate.memberRows}
                  scoreFields={scoreFields}
                  criterionAverages={councilAggregate.criterionAverages}
                  councilAverage={councilAggregate.councilAverage}
                  scoredCount={councilAggregate.scoredCount}
                  activeMemberId={activeMemberId}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {scoreFields.map((field, idx) => {
                  const isLastOdd = idx === scoreFields.length - 1 && scoreFields.length % 2 === 1;
                  return (
                    <div key={field.key} className={isLastOdd ? "md:col-span-2" : ""}>
                      <ScoreFieldCard
                        field={field}
                        score={scores[field.key]}
                        error={scoreErrors[field.key]}
                        note={criterionNotes[field.key]}
                        onScoreChange={(val) => updateScore(field.key, val)}
                        onBlur={() => normalizeScoreField(field.key)}
                        onNoteChange={(val) => updateCriterionNote(field.key, val)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">DTB Hội đồng (tổng hợp)</p>
                <div className="flex items-end justify-between gap-3">
                  <div className="text-4xl font-bold tracking-tight text-foreground">{councilAggregate.councilAverage.toFixed(1)}</div>
                  <Badge variant="outline">/ {SCORE_MAX}.0</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {councilAggregate.scoredCount}/{EB_COUNCIL_MEMBERS.length} thành viên đã chấm
                  {activeMember && <> · Đang nhập cho <strong className="text-foreground">{activeMember.name}</strong> (DTB {average.toFixed(1)})</>}
                </p>
                <Badge variant="secondary" className={`border ${councilClassification.className}`}>{councilClassification.label}</Badge>
                <p className="text-sm text-muted-foreground">{councilClassification.note}</p>
                <ThresholdTable />
              </div>

              <div className="sticky bottom-4 z-10">
                <div className="flex items-center gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-md backdrop-blur">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activeMember?.name ?? "Chọn thành viên"}{" · "}
                      <span className="text-muted-foreground">DTB cá nhân</span>{" "}
                      {average.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DTB HĐ: <strong className="text-foreground">{councilAggregate.councilAverage.toFixed(1)}</strong>{" · "}
                      <Badge variant="secondary" className={`border text-[10px] py-0 px-1.5 ${councilClassification.className}`}>{councilClassification.label}</Badge>
                    </p>
                  </div>
                  <Button onClick={handleSaveAssessment} className="shrink-0">Lưu điểm</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Ảnh series từ Tantou</CardTitle>
              <CardDescription>Hình preview của series đang được chấm, lấy trực tiếp từ submission Tantou.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-2xl border bg-muted/30">
                <img src={activeSeriesImage} alt={activeTitle ? `Ảnh series ${activeTitle}` : "Ảnh series đang chấm"} className="aspect-[3/4] w-full object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Tantou gửi sang EB</Badge>
                  {activeTantouSubmission?.chapterNum && <Badge variant="outline">Ch. {activeTantouSubmission.chapterNum}</Badge>}
                </div>
                <p className="text-sm font-medium text-foreground">{activeTitle || "Chưa có series trong hàng chờ"}</p>
                <p className="text-sm text-muted-foreground">{activeTantouSubmission?.pageLabel ?? "Ảnh đang hiển thị là bản gửi từ Tantou hoặc ảnh thay thế nếu chưa có submission tương ứng."}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Gavel className="size-5 text-primary" />
              Hàng chờ duyệt
            </h2>
            <p className="text-sm text-muted-foreground">
              Đồng bộ từ <Link to="/mangaka" className="font-medium text-primary hover:underline">Mangaka</Link>{" / "}
              <Link to="/tantou" className="font-medium text-primary hover:underline">Tantou</Link>
            </p>
          </div>
          {pending.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Không có series lần đầu trong hàng chờ.</CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {pending.map(p => {
                const assessment = getQueueAssessment(p.title);
                const isActive = p.title === activeTitle;
                return (
                  <Card
                    key={p.id ?? p.title}
                    onClick={() => setSelectedTitle(p.title)}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{p.title}</h3>
                          <Badge variant="secondary">✦ Lần đầu</Badge>
                          {assessment.scoredCount > 0 ? (
                            <Badge variant="secondary" className={`border text-[11px] ${assessment.classification.className}`}>
                              {assessment.scoredCount}/{assessment.total} đã chấm · {assessment.classification.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">Chưa có điểm</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[p.genres?.slice(0, 2).join(" · "), p.formatLabel?.replace(/\s*\(.*\)$/, ""), p.authorName].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleReject(p.title)}
                        >
                          <XCircle className="size-4" />
                          Từ chối
                        </Button>
                        <Button onClick={() => handleApprove(p.title)}>
                          <CheckCircle2 className="size-4" />
                          Chấp nhận
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {approvedList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Đã chấp nhận</h2>
            <div className="flex flex-wrap gap-2">
              {approvedList.map(title => <Badge key={title} variant="outline" className="px-3 py-1">{title}</Badge>)}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}