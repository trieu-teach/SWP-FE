import { COMMON_CRITERIA, SCORE_MAX, TYPE_CRITERIA, EB_STATUSES } from "@/constants/eb.js";

// ─── Status helpers ─────────────────────────────────────────────────────────
export function normalizeStatus(raw) {
  return (raw ?? "").toLowerCase().replace(/[_\s-]/g, "");
}

export function isEbStatus(raw) {
  return EB_STATUSES.has(normalizeStatus(raw));
}

// ─── Score helpers ───────────────────────────────────────────────────────────
export function clampScore(value) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(SCORE_MAX, Math.max(0, parsed));
}

export function validateScore(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Vui lòng nhập điểm.";
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return "Điểm phải là số.";
  if (parsed < 0 || parsed > SCORE_MAX) return `Điểm phải trong khoảng 0 - ${SCORE_MAX}.`;
  const stepped = Math.round(parsed * 2) / 2;
  if (Math.abs(stepped - parsed) > 0.001) return "Điểm chỉ nhận bước 0.5 (ví dụ: 3.5, 4.0, 4.5).";
  return "";
}

export function buildScoreFields() {
  return [...COMMON_CRITERIA, TYPE_CRITERIA.color];
}

export function buildInitialScores() {
  return { plotDialogue: "", artDesign: "", panelingCamera: "", pacingHook: "", coloring: "", toneShading: "" };
}

export function getClassification(average) {
  if (average < 2.5) {
    return {
      label: "KHÔNG ĐẠT",
      note: "Series chưa đạt chất lượng, cần chỉnh sửa lớn trước khi xét lại.",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (average < 3.5) {
    return {
      label: "ĐẠT",
      note: "Series có thể thông qua, nhưng cần cải thiện theo ghi chú.",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (average < 4.25) {
    return {
      label: "TỐT",
      note: "Chất lượng series ổn định, phù hợp duyệt nhanh.",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  return {
    label: "XUẤT SẮC",
    note: "Series chất lượng cao, phù hợp đẩy nổi bật/banner.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

// ─── Evaluation mapping / aggregation ───────────────────────────────────────
export function mapEvalDetailToScores(detail) {
  if (!detail) return buildInitialScores();
  // evalDetail đã được normalize sang camelCase khi lưu vào state
  return {
    plotDialogue: String(detail.storyScore ?? 0),
    artDesign: String(detail.artScore ?? 0),
    panelingCamera: String(detail.characterScore ?? 0),
    coloring: String(detail.commercialScore ?? 0),
    toneShading: String(detail.commercialScore ?? 0),
    pacingHook: String(detail.pacingScore ?? 0),
  };
}

export function buildCouncilAggregateFromMembers(members, scoreFields) {
  const keys = scoreFields.map(f => f.key);

  const memberRows = members.map((m) => {
    if (!m.hasEvaluated || !m.evalDetail) {
      return { ...m, scored: false, scores: {}, average: 0 };
    }
    const scores = mapEvalDetailToScores(m.evalDetail);
    const vals = keys.map(k => Number(scores[k] ?? 0));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { ...m, scored: true, scores, average: parseFloat(avg.toFixed(2)) };
  });

  const scoredRows = memberRows.filter(r => r.scored);
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