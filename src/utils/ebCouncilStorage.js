// @/utils/ebCouncilStorage.js
// localStorage key prefix
const COUNCIL_KEY_PREFIX = "eb_council_scores_";

// ─── Council members ──────────────────────────────────────────────────────────
export const EB_COUNCIL_MEMBERS = [
  { id: "member_01", name: "Nguyễn Văn An",  title: "Trưởng ban Biên tập" },
  { id: "member_02", name: "Trần Thị Bích",  title: "Phó ban Nội dung" },
  { id: "member_03", name: "Lê Minh Cường",  title: "Chuyên viên Mỹ thuật" },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
function storageKey(seriesTitle) {
  return `${COUNCIL_KEY_PREFIX}${seriesTitle}`;
}

/**
 * Đọc toàn bộ record điểm hội đồng của một series.
 * @returns {object|null}
 */
export function readCouncilSeriesScores(seriesTitle) {
  if (!seriesTitle) return null;
  try {
    const raw = localStorage.getItem(storageKey(seriesTitle));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Lưu điểm của một thành viên hội đồng cho một series.
 * @param {string} seriesTitle
 * @param {string} memberId
 * @param {{ scoreType, scores, criterionNotes, average, assessedAt, enteredBy }} assessment
 */
export function saveCouncilMemberAssessment(seriesTitle, memberId, assessment) {
  if (!seriesTitle || !memberId) return;

  const existing = readCouncilSeriesScores(seriesTitle) ?? {
    seriesTitle,
    scoreType: assessment.scoreType ?? "color",
    members: {},
    updatedAt: null,
  };

  existing.scoreType = assessment.scoreType ?? existing.scoreType;
  existing.members[memberId] = {
    ...assessment,
    scored: true,
  };
  existing.updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(storageKey(seriesTitle), JSON.stringify(existing));
    window.dispatchEvent(new Event("mk-eb-council-update"));
  } catch (err) {
    console.error("[ebCouncilStorage] saveCouncilMemberAssessment error:", err);
  }
}

/**
 * Seed điểm demo cho tất cả thành viên (chỉ gọi khi chưa có record).
 * @param {string} seriesTitle
 * @param {"color"|"mono"} scoreType
 */
export function seedCouncilDemoScores(seriesTitle, scoreType = "color") {
  if (!seriesTitle) return;

  const demoScoresPerMember = [
    // member_01
    { plotDialogue: 4.0, artDesign: 3.5, panelingCamera: 4.0, pacingHook: 3.5, coloring: 4.5, toneShading: 4.0 },
    // member_02
    { plotDialogue: 3.5, artDesign: 4.0, panelingCamera: 3.5, pacingHook: 4.0, coloring: 4.0, toneShading: 3.5 },
    // member_03
    { plotDialogue: 4.5, artDesign: 4.5, panelingCamera: 4.0, pacingHook: 4.0, coloring: 4.5, toneShading: 4.5 },
  ];

  const members = {};
  EB_COUNCIL_MEMBERS.forEach((member, idx) => {
    const scores = demoScoresPerMember[idx] ?? demoScoresPerMember[0];
    const values = Object.values(scores);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    members[member.id] = {
      scoreType,
      scores,
      criterionNotes: {},
      average: parseFloat(average.toFixed(1)),
      assessedAt: new Date().toISOString(),
      enteredBy: member.name,
      scored: true,
    };
  });

  const record = {
    seriesTitle,
    scoreType,
    members,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(storageKey(seriesTitle), JSON.stringify(record));
    window.dispatchEvent(new Event("mk-eb-council-update"));
  } catch (err) {
    console.error("[ebCouncilStorage] seedCouncilDemoScores error:", err);
  }
}

/**
 * Tính trung bình tổng hợp từ record hội đồng.
 * @param {object|null} councilRecord - từ readCouncilSeriesScores()
 * @param {string[]} criterionKeys - danh sách key tiêu chí đang dùng
 * @returns {{ memberRows, criterionAverages, councilAverage, scoredCount }}
 */
export function buildCouncilAggregate(councilRecord, criterionKeys = []) {
  const members = councilRecord?.members ?? {};

  const memberRows = EB_COUNCIL_MEMBERS.map((member) => {
    const entry = members[member.id];
    if (!entry?.scored) {
      return { ...member, scored: false, scores: {}, average: 0 };
    }
    const scores = entry.scores ?? {};
    const keys = criterionKeys.length ? criterionKeys : Object.keys(scores);
    const values = keys.map((k) => Number(scores[k] ?? 0));
    const average = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
    return {
      ...member,
      scored: true,
      scores,
      average: parseFloat(average.toFixed(2)),
      assessedAt: entry.assessedAt,
      enteredBy: entry.enteredBy,
    };
  });

  const scoredRows = memberRows.filter((r) => r.scored);
  const scoredCount = scoredRows.length;

  // Trung bình từng tiêu chí
  const criterionAverages = {};
  if (scoredCount > 0) {
    for (const key of criterionKeys) {
      const vals = scoredRows.map((r) => Number(r.scores?.[key] ?? 0));
      criterionAverages[key] = parseFloat(
        (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
      );
    }
  }

  // DTB hội đồng = trung bình của các DTB cá nhân
  const councilAverage =
    scoredCount > 0
      ? parseFloat(
          (
            scoredRows.reduce((sum, r) => sum + r.average, 0) / scoredCount
          ).toFixed(2),
        )
      : 0;

  return { memberRows, criterionAverages, councilAverage, scoredCount };
}