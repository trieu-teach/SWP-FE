// src/api/boardEvaluation.service.js
import axiosClient from "./axiosClient";

/**
 * Lấy tất cả BoardEvaluation (có thể filter theo seriesId nếu BE hỗ trợ query param)
 * GET /api/BoardEvaluation
 */
export async function getBoardEvaluations(params = {}) {
  const res = await axiosClient.get("/BoardEvaluation", { params });
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
}

/**
 * Lấy 1 BoardEvaluation theo id
 * GET /api/BoardEvaluation/{id}
 */
export async function getBoardEvaluationById(id) {
  const res = await axiosClient.get(`/BoardEvaluation/${id}`);
  return res.data;
}

/**
 * Lấy tổng hợp điểm Hội đồng của một evaluationId
 * GET /api/BoardEvaluation/{evaluationId}/summary
 */
export async function getBoardEvaluationSummary(evaluationId) {
  const res = await axiosClient.get(`/BoardEvaluation/${evaluationId}/summary`);
  return res.data;
}

/**
 * Tạo mới điểm cho một thành viên Hội đồng
 * POST /api/BoardEvaluation
 * @param {{
 *   series_id: number,
 *   member_id: string,
 *   score_type: "color"|"mono",
 *   scores: Record<string, number>,
 *   criterion_notes: Record<string, string>,
 *   average: number,
 *   assessed_at: string,
 *   entered_by: string,
 * }} payload
 */
export async function createBoardEvaluation(payload) {
  const res = await axiosClient.post("/BoardEvaluation", payload);
  return res.data;
}

/**
 * Cập nhật điểm cho một thành viên Hội đồng đã có
 * PUT /api/BoardEvaluation/{id}
 */
export async function updateBoardEvaluation(id, payload) {
  const res = await axiosClient.put(`/BoardEvaluation/${id}`, payload);
  return res.data;
}

/**
 * Batch upsert — gửi nhiều đánh giá cùng lúc
 * POST /api/BoardEvaluation/batch
 * @param {Array} evaluations
 */
export async function batchBoardEvaluation(evaluations) {
  const res = await axiosClient.post("/BoardEvaluation/batch", evaluations);
  return res.data;
}

/**
 * Upsert thông minh: tìm evaluation hiện tại của member trong series,
 * nếu có thì PUT, nếu chưa có thì POST.
 * @param {object} params
 * @param {number} params.seriesId
 * @param {string} params.memberId
 * @param {object} params.assessment - { scoreType, scores, criterionNotes, average, assessedAt, enteredBy }
 * @param {Array}  params.existingEvaluations - kết quả từ getSeriesEvaluations() để tránh gọi thêm
 */
export async function upsertMemberEvaluation({ seriesId, memberId, assessment, existingEvaluations = [] }) {
  // axiosClient normalizeKeys → response về snake_case
  // request body gửi lên cần PascalCase hoặc camelCase tùy BE — dùng camelCase theo convention Spring Boot
  const body = {
    seriesId,
    memberId,
    scoreType: assessment.scoreType,
    scores: assessment.scores,
    criterionNotes: assessment.criterionNotes ?? {},
    average: assessment.average,
    assessedAt: assessment.assessedAt,
    enteredBy: assessment.enteredBy,
  };

  // Tìm record cũ của chính member này trong series
  const existing = existingEvaluations.find(
    (e) => e.member_id === memberId || e.memberId === memberId
  );

  if (existing?.id) {
    return updateBoardEvaluation(existing.id, body);
  }
  return createBoardEvaluation(body);
}