// src/api/submissions.service.js
import axiosClient from "./axiosClient";

/**
 * Lấy danh sách series đang chờ EB duyệt
 * GET /api/Submissions/eb
 * @returns {Promise<Array>}
 */
export async function getEbPendingSubmissions() {
  const res = await axiosClient.get("/Submissions/eb");
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
}

/**
 * Lấy tất cả đánh giá của Hội đồng cho một series
 * GET /api/Submissions/{seriesId}/evaluations
 * @param {number|string} seriesId
 * @returns {Promise<Array>}
 */
export async function getSeriesEvaluations(seriesId) {
  const res = await axiosClient.get(`/Submissions/${seriesId}/evaluations`);
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
}

/**
 * Cập nhật điểm tổng hợp Hội đồng cho series
 * PATCH /api/Submissions/{seriesId}/score
 * @param {number|string} seriesId
 * @param {{ score: number, classification: string }} payload
 */
export async function patchSubmissionScore(seriesId, payload) {
  const res = await axiosClient.patch(`/Submissions/${seriesId}/score`, payload);
  return res.data;
}