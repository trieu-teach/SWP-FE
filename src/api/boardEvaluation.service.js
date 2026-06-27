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
 */
export async function batchBoardEvaluation(evaluations) {
  const res = await axiosClient.post("/BoardEvaluation/batch", evaluations);
  return res.data;
}

export const boardEvaluationService = {
  getBoardEvaluations,
  getBoardEvaluationById,
  getBoardEvaluationSummary,
  createBoardEvaluation,
  updateBoardEvaluation,
  batchBoardEvaluation,
  upsertMemberEvaluation,
};

export async function upsertMemberEvaluation({ seriesId, memberId, assessment, existingEvaluations = [] }) {
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

  const existing = existingEvaluations.find(
    (e) => e.member_id === memberId || e.memberId === memberId
  );

  if (existing?.id) {
    return updateBoardEvaluation(existing.id, body);
  }
  return createBoardEvaluation(body);
}