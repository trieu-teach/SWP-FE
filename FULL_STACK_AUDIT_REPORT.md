# FULL STACK AUDIT REPORT
**Date:** June 19, 2026
**Backend:** `D:\SWP391_MangaPublishSystem_BE-Quoc_Test` (ASP.NET Core 8)
**Frontend:** `d:\SWP391-Manga\manga-project` (React + Vite)
**Focus Roles:** Mangaka, Assistant

---

## PHASE 1 — BACKEND API INVENTORY

### 1.1 Authentication — `/api/auth`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/auth/login` | POST | `{ userName, password }` | `{ token, refreshToken }` | None | Login → JWT (120min) + refresh token (7d) |
| `/api/auth/register` | POST | `{ userName, password, fullName, email, roleId }` | `{ userid, username, roleid, token, refreshToken }` | None | Self-register (roleId must be 4 or 5) |
| `/api/auth/refresh-token` | POST | `{ token }` | `{ token, refreshToken }` | None | Refresh JWT |
| `/api/auth/logout` | POST | `{ token }` | `200 OK` | None | Revoke refresh token |
| `/api/auth/create-staff` | POST | `{ userName, password, fullName, email, roleId }` | `{ ...user, token, refreshToken }` | **Admin** | Admin creates staff (roleId 1-3) |

**Login response:** Backend trả `{ token, refreshToken }` — KHÔNG trả user profile data.
**Register response:** Backend trả `{ userid, username, roleid, token, refreshToken }` — trường `roleid` (lowercase), `fullname` KHÔNG có trong response.

### 1.2 Users — `/api/users`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/users/profile` | GET | — | Mangaka: `{ userid, username, fullname, email, penName, bio, phoneNumber, bank* }` / Assistant: `{ userid, username, fullname, email, portfolioUrl, phoneNumber, isAvailable, skills, softwareUsed, bank* }` | Any JWT | Get current user profile |
| `/api/users/profile/mangaka` | PUT | `{ fullName, penName?, bio?, phoneNumber?, bank*, avatarUrl? }` | 204 No Content | Mangaka (roleId=4) | Update Mangaka profile |
| `/api/users/profile/assistant` | PUT | `{ fullName, avatarUrl?, portfolioUrl?, phoneNumber?, isAvailable?, skills?, softwareUsed?, bank* }` | 204 No Content | Assistant (roleId=5) | Update Assistant profile |

### 1.3 Series — `/api/Series`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/Series` | GET | — | `List<SeriesDto>` | None | List all series |
| `/api/Series/{id}` | GET | — | `SeriesDto` | None | Get series by ID |
| `/api/Series/mangakaid/{mangakaId}` | GET | — path segment | `List<SeriesDto>` | None | Get series by Mangaka ID |
| `/api/Series` | POST | `multipart/form-data` | `{ message, id, data, proposalfileurl, coverimageurl }` | None | Create series |
| `/api/Series/{id}` | PUT | `multipart/form-data` | 204 | None | Update series |
| `/api/Series/{id}/status` | PATCH | `{ status }` | 204 | None | Update status |
| `/api/Series/{id}/publish-format` | PATCH | `{ publishformat }` | 204 | None | Update publish format |
| `/api/Series/softdelete/{id}` | DELETE | — | 204 | None | Soft delete |

**SeriesDto fields:** `SeriesId, Title, Synopsis, AgeRating, Status, PublishFormat, MangakaId, MangakaName, CoverImageUrl, ProposalFileUrl, CreatedAt, UpdatedAt, Genres[{GenreId, GenreName}], Tags[{TagId, TagName}]`

### 1.4 Chapters — `/api/Chapters`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/Chapters` | GET | `?seriesId=` | `List<ChapterDto>` | None | List chapters |
| `/api/Chapters/{id}` | GET | — | `ChapterDto` | None | Get chapter |
| `/api/Chapters` | POST | `{ seriesid, chapternumber, title, deadline }` | `{ message, id, data }` | None | Create chapter |
| `/api/Chapters/{id}` | PUT | `{ chapternumber, title, deadline }` | 204 | None | Update chapter |
| `/api/Chapters/{id}/status` | PATCH | raw string | `{ message }` | None | Update status |
| `/api/Chapters/{id}/soft` | DELETE | — | `{ message }` | None | Soft delete |

### 1.5 Pages — `/api/Pages`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/Pages` | GET | `?chapterId=` | `List<PageDto>` | None | List pages |
| `/api/Pages/{id}` | GET | — | `PageDto` | None | Get page |
| `/api/Pages` | POST | `multipart/form-data` | `{ message, id, data, pageimageurl }` | None | Upload page |
| `/api/Pages/{id}` | PUT | `multipart/form-data` | 204 | None | Update page |
| `/api/Pages/{id}/status` | PATCH | raw string | `{ message }` | None | Update status |
| `/api/Pages/{id}/soft` | DELETE | — | `{ message }` | None | Soft delete |

**Form fields:** `pageFile` (IFormFile), `chapterid` (int), `pagenumber` (int)

### 1.6 Page Layers — `/api/PageLayers`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/PageLayers` | GET | `?pageId=` | `List<PageLayerDto>` | None | List layers |
| `/api/PageLayers/{id}` | GET | — | `PageLayerDto` | None | Get layer |
| `/api/PageLayers` | POST | `multipart/form-data` | `{ message, id, data, fileurl }` | None | Upload layer |
| `/api/PageLayers/{id}` | PUT | `multipart/form-data` | 204 | None | Update layer |
| `/api/PageLayers/{id}/visibility` | PATCH | — | 204 | None | Toggle visibility |
| `/api/PageLayers/{id}/soft` | DELETE | — | `{ message }` | None | Soft delete |
| `/api/PageLayers/{id}` | DELETE | — | 204 | None | Hard delete |

**Form fields (POST):** `layerFile` (IFormFile, required), `pageid` (int, required), `uploaderid` (int, required), `layername` (string, required), `zindex` (int, optional), `opacity` (decimal, optional)

### 1.7 Page Issues — `/api/PageIssues`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/PageIssues` | GET | `?chapterId=` | `List<PageIssueDto>` | None | List issues |
| `/api/PageIssues/{id}` | GET | — | `PageIssueDto` | None | Get issue |
| `/api/PageIssues` | POST | `{ pageid, createdById, assignedToId?, issueType, workCategory, boxX, boxY, boxWidth, boxHeight, description, deadline? }` | `{ message, id, data }` | None | Create issue |
| `/api/PageIssues/{id}` | PUT | `{ assignedToId?, description, boxX, boxY, boxWidth, boxHeight, deadline?, completedat? }` | 204 | None | Update issue |
| `/api/PageIssues/{id}/status` | PATCH | raw string | `{ message }` | None | Update status |
| `/api/PageIssues/{id}/soft` | DELETE | — | `{ message }` | None | Soft delete |

**PageIssueDto fields:** `IssueId, PageId, CreatedById, AssignedToId, IssueType, WorkCategory, BoxX, BoxY, BoxWidth, BoxHeight, Description, Status, Deadline, CompletedAt, CreatedAt, UpdatedAt`

### 1.8 Board Evaluation — `/api/BoardEvaluation`

| Endpoint | Method | Request | Response | Auth | Purpose |
|---|---|---|---|---|---|
| `/api/BoardEvaluation` | GET | — | `List<BoardEvaluationDto>` | None | List evaluations |
| `/api/BoardEvaluation/{id}` | GET | — | `BoardEvaluationDto` | None | Get evaluation |
| `/api/BoardEvaluation` | POST | `{ seriesid, inputtedbyid, storyScore, artScore, characterScore, commercialScore, pacingScore, feedback? }` | `{ message, evaluationId }` | None | EB evaluate series |
| `/api/BoardEvaluation/{id}` | PUT | `{ storyScore, artScore, characterScore, commercialScore, pacingScore, feedback? }` | `{ message }` | None | Update evaluation |
| `/api/BoardEvaluation/{id}` | DELETE | — | `{ message }` | None | Delete evaluation |

### 1.9 Security Issues in Backend
- **Series, Chapters, Pages, PageLayers, PageIssues, BoardEvaluation: NO `[Authorize]` attribute** — all endpoints are public. This is a significant security gap.
- **WeatherForecastController** still exists at `/weatherforecast` — default scaffold, should be removed.

### 1.10 Backend Missing
- **No endpoint to finalize/composite layers** — no `/api/PageLayers/finalize` or `/api/Pages/{id}/finalize`
- **No endpoint to get chapter assignments for a specific Assistant** — `GET /api/Chapters` returns all chapters; no way to filter by assistant
- **No endpoint to update issue status to "resolved" from Assistant side** — `PageIssues` controller has `PATCH /status` but no FE integration
- **No endpoint for MangakaAssistant contract management** — `MangakaAssistant` entity and service exist but no controller
- **No endpoint for notifications** — `notifications` table exists but no controller
- **No role-specific `GET /api/users/profile`** — BE has different PUT endpoints but only one GET endpoint

---

## PHASE 2 — LUONG NGHIEP VU

### Mangaka Workflow

```
1. Tạo Series (POST /api/Series) với proposal PDF + cover image
   ↓
2. Tạo Chapter (POST /api/Chapters)
   ↓
3. Upload Pages (POST /api/Pages) — mỗi trang là 1 file ảnh
   ↓
4. Annotate: Đánh dấu vùng trên trang (POST /api/PageIssues) — gửi toạ độ boxX/boxY/boxWidth/boxHeight + issueType
   ↓
5. Gửi cho Assistant (localStorage: pushAssistantSubmission)
   ↓
6. Assistant nhận, vẽ layer PNG trong suốt, gửi lại (localStorage: pushAssistantDeliverable)
   ↓
7. Mangaka duyệt bản tổng hợp → Gửi Tantou Editor (localStorage: pushTantouSubmission)
   ↓
8. Tantou Editor duyệt → forward lên EB (localStorage)
   ↓
9. EB biểu quyết → approve/reject
   ↓
10. Nếu approve → publish
```

### Assistant Workflow

```
1. Nhận assignment từ Mangaka (localStorage: listAssistantSubmissions)
   ↓
2. Xem ảnh gốc + ghi chú vùng (GET /api/PageIssues?pageId=)
   ↓
3. Tải ảnh gốc về → vẽ trên phần mềm → export layer PNG trong suốt
   ↓
4. Upload layer lên (POST /api/PageLayers) — mỗi layer là 1 file
   ↓
5. Xem preview nhiều layer chồng lên nhau (local UI)
   ↓
6. Gửi cho Mangaka (localStorage: pushAssistantDeliverable)
```

---

## PHASE 3 — SO KHỚP FE & BE

### 3.1 Auth Flow — CRITICAL BUGS

**FE gửi:** `{ userName, password }` → BE nhận đúng ✅

**BE trả sau login:** `{ token, refreshToken }` — KHÔNG có user data
**FE đọc:** `buildSessionFromAuthResponse(data)` → tìm `data.roleid` → KHÔNG TÌM THẤY → `user.role = null` → redirect về `/`

**Fix:** Sau login, gọi `GET /api/users/profile` để lấy đầy đủ user data.

### 3.2 Register Flow

**FE gửi:** `{ userName, password, fullName, email, roleId }` → BE nhận đúng ✅
**BE trả:** `{ userid, username, roleid, token, refreshToken }` — lowercase `roleid` ✅
**FE đọc:** `buildSessionFromAuthResponse` check `data.roleid` → đúng ✅

### 3.3 Mangaka — Series Creation

**FE gửi FormData fields:** `title, synopsis, mangakaid, tantoueditorid, agerating, genreIds[], tagIds[], proposalFile, coverImage`
**BE nhận:** `title, synopsis, tantoueditorid, agerating, mangakaid, genreIds[], tagIds[], proposalFile, coverImage` ✅

**Issue:** `tantoueditorid` hardcoded là `1` → gán cho Editor ID=1 (Admin). Cần BE trả về danh sách Editors để Mangaka chọn.

### 3.4 Mangaka — Series by Mangaka ID

**FE:** `GET /Series/mangakaid/{mangakaId}` — path segment ✅
**Issue:** `mangakaId` lấy từ `user.id ?? user.userid ?? 'demo-mangaka'`. Nếu chưa login → gọi với string `'demo-mangaka'` → BE trả empty array ✅ (graceful)

### 3.5 Mangaka — Send to Assistant (PageIssues)

**FE gửi:** `{ pageid, createdById, issueType, workCategory, boxX, boxY, boxWidth, boxHeight, description }`
**BE nhận:** `{ pageid, createdById, issueType, workCategory, boxX, boxY, boxWidth, boxHeight, description }` ✅

**BUG đã fix:** `note` undefined trong forEach loop → giờ dùng `notes.forEach(note => ...)`

### 3.6 Assistant — Get Assignments

**Problem:** Backend không có endpoint riêng để lấy assignments theo Assistant ID. FE dùng `GET /Chapters` rồi filter ở client → không chính xác. FE chỉ lấy tất cả chapters từ BE.

**Impact:** Assistant thấy TẤT CẢ chapters, không phải chỉ assignments của họ.

### 3.7 Assistant — Get Page Issues

**FE:** `pageIssuesService.getAll(selectedAssignment?.chapterId)` → gửi `?chapterId=`
**BE:** `GET /PageIssues` nhận param `chapterId` ✅

**Tuy nhiên:** Backend có vấn đề thiết kế — PageIssue có `PageId` nhưng list API lọc theo `ChapterId`. Nếu FE muốn issues cho 1 page cụ thể, không có cách (phải fetch all rồi filter).

### 3.8 Page Layers

**FE addLayer gửi:** raw file object → **SAI** (BE cần FormData với `layerFile, pageid, uploaderid, layername`)
**Fix đã áp dụng:** Tạo `FormData` với đúng fields.

**FE updateLayer gửi:** plain `{ index, opacity }` → **SAI** (BE cần FormData)
**Fix đã áp dụng:** Tạo `FormData` với `layername, zindex, opacity`.

**FE refresh:** `pageLayersService.getAll(pageId)` → trả Axios response → FE dùng `res.data` ✅ (sau fix)

### 3.9 Profile Update

**FE gửi:** `PUT /users/profile` → **SAI endpoint**
**BE có:** `PUT /users/profile/mangaka` và `PUT /users/profile/assistant`
**Fix đã áp dụng:** Gọi endpoint đúng theo `roleKey`.

### 3.10 HandleSubmitToMangaka — CRITICAL

**Bug cũ:** Chỉ hiện toast, không lưu gì → Assistant gửi bản vẽ nhưng Mangaka không nhận được.
**Fix đã áp dụng:** Gọi `pushAssistantDeliverable()` → lưu vào localStorage/IDB.

---

## PHASE 4 — FRONTEND FILES FIXED

### FILE: `src/lib/auth.js`
**Lý do:** Login chỉ nhận `{ token, refreshToken }` từ BE, không lấy user profile → `user.role = null` → redirect sai.
**Thay đổi:**
- Sau login, gọi `GET /api/users/profile` để populate session đầy đủ
- Lưu token vào localStorage TRƯỚC khi gọi profile (cần Bearer header)
- Map tất cả field variants: `roleid/Roleid/roleId/RoleId`

### FILE: `src/api/api.js`
**Lý do:** `usersService.updateProfile` gọi sai endpoint.
**Thay đổi:**
- Thêm `authService.profile()` → `GET /users/profile`
- `usersService.updateProfile(data, roleKey)` → gọi endpoint đúng theo role (`/users/profile/mangaka` hoặc `/users/profile/assistant`)

### FILE: `src/api/hooks/useApi.js`
**Lý do:** `useUpdateProfile` không truyền `roleKey`.
**Thay đổi:** `useUpdateProfile(roleKey)` → truyền xuống service.

### FILE: `src/pages/User/Profile/Profile.jsx`
**Lý do:** Gọi `useUpdateProfile()` không có roleKey.
**Thay đổi:** `useUpdateProfile(roleKey)` — truyền roleKey động.

### FILE: `src/pages/User/Mangaka/Mangaka.jsx`
**Lý do 1:** `mangakaId` fallback là `'demo-mangaka'` string → gọi API với string thay vì null.
**Thay đổi:** Fallback thành `null` → `useSeriesByMangaka` có `enabled: !!mangakaId` → không gọi khi không có ID.

**Lý do 2:** `note` undefined trong forEach của `handleSendToAssistant`.
**Thay đổi:** `notes.forEach(note => ...)` đúng scope.

**Lý do 3:** `completeDebutPipeline` gửi plain object thay vì FormData.
**Thay đổi:** Tạo FormData với đúng fields.

### FILE: `src/hooks/usePageLayers.js`
**Lý do:** Nhiều lỗi form-data:
- `addLayer` gửi raw file thay vì FormData
- `updateLayer` gửi plain object thay vì FormData
- `uploadNewVersion` gửi `{ file }` thay vì FormData
- `rollback` gọi endpoint không tồn tại
- `refresh` dùng response trực tiếp thay vì `res.data`
- `loadVersions` dùng `list.versions` thay vì `res.data.versions`

**Thay đổi:**
- Thêm helper `buildLayerFormData()` và `buildLayerPatchFormData()`
- Sửa `addLayer` → tạo FormData đúng
- Sửa `updateLayer` → tạo FormData đúng
- Sửa `uploadNewVersion` → tạo FormData
- Sửa `refresh` → dùng `res.data`
- Sửa `loadVersions` → dùng `res?.data`
- Sửa `rollback` → disable với message (BE chưa có endpoint)
- `reorderLayers` → gửi FormData với `zindex`

### FILE: `src/pages/User/Assistant/Assistant.jsx`
**Lý do 1:** 3 hooks bị viết sai (`useMemo` với side effects, `useState` thay vì `useEffect`).
**Thay đổi:** Đổi thành `useEffect`.

**Lý do 2:** `handleSubmitToMangaka` chỉ hiện toast, không push data.
**Thay đổi:** Gọi `pushAssistantDeliverable()` để lưu deliverables vào localStorage/IDB, fire storage event để Mangaka nhận.

**Lý do 3:** `LayerStack` đọc field lowercase (`n.boxx`) nhưng BE trả PascalCase (`BoxX`).
**Thay đổi:** Thêm fallback cho cả 2 case: `n.boxx ?? n.boxX ?? n.BoxX`.

**Lý do 4:** `handleAddLayerFiles` chỉ lưu local, không push lên API.
**Thay đổi:** Sau khi đọc file local, gọi `addLayer()` (từ `usePageLayers`) để push lên BE.

---

## PHASE 5 — BACKEND GAP ANALYSIS

### CRITICAL — Thiếu API cho Assistant Workflow

#### 1. Get Assignments by Assistant ID
**Thiếu:** `GET /api/Chapters/assistant/{assistantId}` hoặc `GET /api/mangaka-assistants/{assistantId}/assignments`
**Lý do:** Backend chỉ có `GET /api/Chapters` trả tất cả. FE Assistant lọc ở client → thấy TẤT CẢ chapters.
**Đề xuất:**
```
GET /api/mangaka-assistants/assignments/{assistantId}
Response: [{ chapterId, seriesTitle, chapterNumber, status, pageCount }]
```

#### 2. Finalize/Composite Layers
**Thiếu:** Endpoint gộp layers thành 1 ảnh hoàn chỉnh.
**Đề xuất:**
```
POST /api/Pages/{pageId}/finalize
Body: { layerIds: int[] }
Response: { compositeImageUrl: string }
```

#### 3. MangakaAssistant Controller
**Thiếu:** Không có controller cho `mangaka_assistants` table.
**Đề xuất:**
```
GET /api/mangaka-assistants?mangakaId=
POST /api/mangaka-assistants
DELETE /api/mangaka-assistants/{id}
```

### MEDIUM

#### 4. Tantou Editor — Get Submissions
**Thiếu:** FE Tantou lưu trữ trong localStorage. Cần API backend để lưu trữ thực sự.

#### 5. Board Evaluation — Auto-notify Mangaka
**Thiếu:** Khi EB approve/reject, không có notification cho Mangaka.

#### 6. Series Status Workflow
**Thiếu:** Không có API để update series từ `Draft` → `PendingEB` → `ApprovedEB` → `Published`.

#### 7. Pagelayer Rollback Endpoint
**Thiếu:** `POST /api/PageLayers/{id}/rollback/{versionId}`

### LOW — Nice to Have

#### 8. Pagination
Tất cả list API không hỗ trợ pagination → khi dữ liệu lớn sẽ chậm.

#### 9. Soft-delete cho tất cả entities
Chỉ có Series, Chapters, Pages, PageLayers, PageIssues hỗ trợ soft delete. Pages cần thêm soft delete.

#### 10. Role-specific GET /users/profile
Hiện tại chỉ có 1 GET endpoint trả cả Mangaka và Assistant data. Nên tách ra 2 endpoint.

---

## PHASE 6 — ROLE CHECK

### Mangaka ✅ (Sau khi fix)
| Chức năng | Status | Ghi chú |
|---|---|---|
| Login → redirect `/mangaka` | ✅ | Đã fix: login gọi profile để populate session |
| Tạo Series (POST /api/Series) | ✅ | FormData đúng |
| Upload Chapter Pages | ✅ | |
| Annotate (POST /api/PageIssues) | ✅ | Đã fix: note scope bug |
| Gửi Assistant (localStorage) | ✅ | |
| Nhận bản tổng hợp từ Assistant | ✅ | localStorage listener |
| Duyệt bản tổng hợp | ✅ | |
| Gửi Tantou (localStorage) | ✅ | |
| Xem EB approval status | ✅ | localStorage |
| Update Profile | ✅ | Đã fix: gọi endpoint đúng theo role |

### Assistant ⚠️ (Sau khi fix, vẫn còn issues)
| Chức năng | Status | Ghi chú |
|---|---|---|
| Login → redirect `/assistant` | ✅ | |
| Nhận assignments | ⚠️ | BE không có endpoint riêng — FE lọc client |
| Xem ảnh gốc + ghi chú | ✅ | Đã fix: useEffect thay vì useMemo |
| Upload layers | ✅ | Đã fix: FormData |
| Preview nhiều layers | ✅ | Local UI |
| Gửi cho Mangaka | ✅ | Đã fix: pushAssistantDeliverable |
| Update Profile | ✅ | |
| Xem income/revenue | ❌ | Backend không có revenue API |

### Tantou Editor
| Chức năng | Status | Ghi chú |
|---|---|---|
| Xem submissions | ⚠️ | localStorage only, không có API |
| Approve/reject | ⚠️ | localStorage only |
| Forward to EB | ⚠️ | localStorage only |

### Editor Board
| Chức năng | Status | Ghi chú |
|---|---|---|
| Xem pending series | ⚠️ | localStorage only |
| Evaluate (POST /api/BoardEvaluation) | ✅ | API có sẵn |
| Approve/reject | ⚠️ | localStorage only |

---

## PHASE 7 — FINAL REPORT

### FRONTEND FIXED ✅

| File | Bug | Fix |
|---|---|---|
| `src/lib/auth.js` | Login không lấy user profile → `user.role = null` | Gọi `GET /api/users/profile` sau login |
| `src/api/api.js` | `usersService.updateProfile` gọi sai endpoint | Gọi `/users/profile/mangaka` hoặc `/users/profile/assistant` theo role |
| `src/api/hooks/useApi.js` | `useUpdateProfile` không truyền roleKey | Thêm tham số `roleKey` |
| `src/pages/User/Profile/Profile.jsx` | Gọi hook không có roleKey | Truyền `roleKey` |
| `src/pages/User/Mangaka/Mangaka.jsx` | `mangakaId` = `'demo-mangaka'` | Đổi thành `null` |
| `src/pages/User/Mangaka/Mangaka.jsx` | `note` undefined trong forEach | Dùng `notes.forEach(note => ...)` |
| `src/pages/User/Mangaka/Mangaka.jsx` | `completeDebutPipeline` gửi plain object | Đổi thành FormData |
| `src/hooks/usePageLayers.js` | `addLayer` gửi raw file | Tạo FormData với `layerFile, pageid, uploaderid, layername, zindex, opacity` |
| `src/hooks/usePageLayers.js` | `updateLayer` gửi plain object | Tạo FormData với `layername, zindex, opacity, versionnumber` |
| `src/hooks/usePageLayers.js` | `uploadNewVersion` gửi `{ file }` | Tạo FormData |
| `src/hooks/usePageLayers.js` | `rollback` gọi endpoint không tồn tại | Disable với message |
| `src/hooks/usePageLayers.js` | `refresh` dùng `res` thay vì `res.data` | Fix `res.data` |
| `src/hooks/usePageLayers.js` | `loadVersions` dùng `list.versions` | Fix `res?.data?.versions` |
| `src/hooks/usePageLayers.js` | `reorderLayers` gửi `{ index }` | Gửi FormData với `zindex` |
| `src/pages/User/Assistant/Assistant.jsx` | 3 hooks viết sai (useMemo/useState thay vì useEffect) | Đổi thành useEffect |
| `src/pages/User/Assistant/Assistant.jsx` | `handleSubmitToMangaka` chỉ toast | Gọi `pushAssistantDeliverable()` |
| `src/pages/User/Assistant/Assistant.jsx` | `LayerStack` đọc lowercase field sai | Thêm fallback PascalCase |
| `src/pages/User/Assistant/Assistant.jsx` | `handleAddLayerFiles` không push lên API | Gọi `addLayer()` sau khi đọc local |
| `src/pages/User/Assistant/Assistant.jsx` | `pageNotes` fetch dùng `res` thay vì `res.data` | Fix |

### FRONTEND STILL MISSING

| Màn hình | File | Ghi chú |
|---|---|---|
| Revenue/Income Dashboard | — | Backend không có API revenue |
| Assignment Queue (cho Assistant) | — | Cần BE bổ sung endpoint |
| EB Evaluation Form | — | Có API nhưng FE không có form nhập điểm |
| Notification Center | — | Backend có table nhưng không có API |
| MangakaAssistant Contract Manager | — | Backend có entity nhưng không có controller |
| Chapter Status Management UI | — | FE có table nhưng không update status qua API |
| Publish Schedule Management | — | Tantou workspace localStorage |

### BACKEND MISSING

| API | Method | Priority | Notes |
|---|---|---|---|
| Get assignments for Assistant | GET | **CRITICAL** | Hiện tại Assistant thấy TẤT CẢ chapters |
| Composite/finalize page | POST | HIGH | Gộp layers thành ảnh hoàn chỉnh |
| MangakaAssistant CRUD | GET/POST/DELETE | HIGH | Contract giữa Mangaka và Assistant |
| PageLayer rollback | POST | MEDIUM | Rollback layer về version cũ |
| Series workflow status | PATCH | MEDIUM | Draft → PendingEB → Approved → Published |
| Notifications | GET/PATCH | MEDIUM | Backend có table nhưng không có controller |
| Paginate all list APIs | GET | LOW | Khi dữ liệu lớn |

### BLOCKERS

1. **Assistant không nhận đúng assignments** — Backend không có endpoint lọc theo Assistant ID. Assistant thấy tất cả chapters.
2. **Không finalize được layers** — Backend không có endpoint composite layers.
3. **Revenue dashboard trống** — Backend không có revenue API.
4. **Tantou/EB hoàn toàn localStorage** — Không có API → không có cross-device sync.
5. **Bảo mật yếu** — Series/Chapters/Pages/PageLayers/PageIssues không có `[Authorize]` → ai cũng đọc/ghi được.

### QUESTIONS

1. **Assistant assignments** — Backend dùng bảng `mangaka_assistants` để map Mangaka ↔ Assistant. FE dùng localStorage. Có nên BE bổ sung endpoint `GET /api/mangaka-assistants/{assistantId}/chapters` không?

2. **Series workflow status values** — Backend có trường `Status` trong Series nhưng không có API rõ ràng để update qua các bước (Draft → PendingEB → Approved → Published). Nên thêm `PATCH /api/Series/{id}/workflow-status`?

3. **Tantou Editor routing** — Backend gán `tantoueditorid` khi tạo Series. FE có trang Tantou nhưng hoạt động localStorage hoàn toàn. Nên BE bổ sung endpoint để Tantou nhận submissions không?
