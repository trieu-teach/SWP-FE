import axios from './axiosClient'

function unwrap(res) {
  return res?.data !== undefined ? res.data : res
}

export const boardEvaluationService = {
  getAll() {
    return axios.get('/BoardEvaluation').then(unwrap)
  },

  getById(id) {
    return axios.get(`/BoardEvaluation/${id}`).then(unwrap)
  },

  // Swagger chi co GET /BoardEvaluation (list tat ca), khong co route rieng
  // loc theo seriesId (khac voi /Series/mangakaid/{mangakaId} ben Series).
  // Tam thoi lay tat ca roi filter o FE — giong pattern getMyAssignments()
  // trong assistantService.js. Neu sau nay backend them route
  // /BoardEvaluation/seriesid/{seriesId} thi doi lai cho do tai du lieu thua.
  getBySeriesId(seriesId) {
    return this.getAll().then(list => (list ?? []).filter(ev => ev.series_id === seriesId))
  },

  // data ki vong (theo cot DB board_evaluations, da bo evaluationid/average_score/
  // evaluatedat vi nhung field nay nhieu kha nang do BE tu sinh):
  // {
  //   seriesId, storyScore, artScore, characterScore, commercialScore,
  //   pacingScore, finalDecision, approvedPublishFormat, feedback
  // }
  // CHUA XAC NHAN duoc casing chinh xac BE doi (camelCase/PascalCase) va
  // gia tri enum cua finalDecision ("approved"/"rejected" hay so?) vi chua
  // co JSON mau tu Swagger "Try it out". ASP.NET Core mac dinh case-insensitive
  // khi bind body nen camelCase o duoi thuong se chay duoc, nhung NEN xac nhan
  // lai truoc khi dung that.
  create(data) {
    return axios.post('/BoardEvaluation', data).then(unwrap)
  },

  update(id, data) {
    return axios.put(`/BoardEvaluation/${id}`, data).then(unwrap)
  },

  remove(id) {
    return axios.delete(`/BoardEvaluation/${id}`).then(unwrap)
  },
}