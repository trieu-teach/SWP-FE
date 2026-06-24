# APIUPDATE.md — Prompt BE cho luồng Mangaka ↔ Assistant ↔ Tantou

> File này chứa **10 prompt riêng biệt** để anh dán vào AI IDE (Antigravity) bên BE, mỗi prompt tương ứng **một API / một thay đổi database**. Mục đích: tránh AI "đi lệch hướng" và gộp nhầm nhiều thứ vào 1 commit.
>
> **Quy tắc đọc prompt:**
> - Mỗi prompt là **độc lập**, có đầy đủ context endpoint, request/response, bảng liên quan.
> - Luôn bắt đầu bằng "Bước 0: Đọc file `*.cs`/table hiện có để biết schema trước khi code".
> - Nếu bảng/field đã tồn tại → dùng, nếu thiếu → tạo migration thêm.
> - Không sửa các API khác ngoài phạm vi prompt.
> - Commit riêng từng prompt, đặt tên: `feat(prompt-N): <tên ngắn>`.

---

## 0. Tổng quan hệ thống status (context chung cho cả 10 prompt)

### `Chapter.Status` FSM hiện tại (giả định — cần xác nhận ở Bước 0)
```
Draft → SubmittedToEditor → EditorReviewing → ReadyForPrint → Published
                    ↓               ↓
                 Rejected      Rejected
```

### `Chapter.Status` FSM MỚI (sau khi làm xong Prompt 1)
```
Draft → SubmittedToAssistant → AssistantReviewing → SendingToMangaka
                                                                        ↓
                                                          ┌─ MangakaAccepted (→ SubmittedToEditor)
                                                          └─ MangakaRejected (→ AssistantReviewing lại)
SubmittedToAssistant → AssistantReviewing → SendingToMangaka
                                                  ↓
                                              SubmittedToEditor → EditorReviewing → ReadyForPrint → Published
                                                                                       ↓
                                                                                   Rejected
```

### `PageIssue.Status` FSM MỚI (sau Prompt 10)
```
Open → InProgress → Resolved
  ↓        ↓
Closed   Closed  (Assistant hoặc Mangaka bấm "Bỏ note" → Closed)
```

### Notification type mới (sau Prompt 8)
- `chapter.send_to_mangaka` — Assistant gửi, nhận: Mangaka
- `chapter.mangaka_accepted` — Mangaka duyệt, nhận: Assistant + Tantou (nếu có)
- `chapter.mangaka_rejected` — Mangaka từ chối, nhận: Assistant
- `chapter.sent_to_tantou` — Mangaka gửi thẳng cho Tantou (không qua Assistant), nhận: Tantou + Assistant
- `pageissue.dismissed` — Assistant bỏ note, nhận: Mangaka

### Bảng hiện có BE **phải check** trước khi tạo (context chung)
- `Users` — có `Role` enum (Admin, Mangaka, Assistant, Tantou, Reader), `IsActive`, `FullName`.
- `Series` — có `Id`, `Title`, `Slug`, `MangakaId`, `EditorId` (Tantou phụ trách), `Status`.
- `Chapters` — có `Id`, `SeriesId`, `ChapterNumber`, `Title`, `Status`, `CreatedAt`, `UpdatedAt`, `MangakaId`, `AssistantId?`, `EditorId?`.
- `Pages` — có `Id`, `ChapterId`, `PageNumber`, `PageImageUrl`, `LayerCount`.
- `PageLayers` — có `Id`, `PageId`, `LayerName`, `LayerFileUrl`, `IsVisible`, `Opacity`, `OrderIndex`, `CreatedAt`, `IsDeleted`.
- `PageIssues` — có `Id`, `PageId` (hoặc `ChapterId`), `X`, `Y`, `Width`, `Height`, `Status`, `Note`, `CreatedById`, `CreatedAt`, `ResolvedAt?`.
- `Contracts` — `Id`, `MangakaId`, `AssistantId`, `Status` (Active/Paused/Ended), `StartDate`, `EndDate?`.
- `Notifications` — `Id`, `UserId`, `Type`, `Title`, `Message`, `RelatedEntityId`, `IsRead`, `CreatedAt`.
- `AssistantProfiles` — `UserId`, `PricePerChapter`, `Bio`, `IsAvailable`.
- `TantouProfiles` — `UserId`, `PricePerChapter`, `Bio`, `IsAvailable`.

> Nếu bất kỳ bảng/field nào **chưa có** thì trong prompt tương ứng có ghi rõ "cần thêm migration". Mặc định: **dùng bảng hiện có, KHÔNG tự ý đổi tên cột**.

---

## Prompt 1: Mở rộng `Chapter.Status` FSM — thêm 3 status mới

**Endpoint:** (không có — chỉ sửa enum/FSM)
**Auth:** N/A (internal)
**Mục đích:** Thêm 3 giá trị status mới để hỗ trợ luồng Assistant → Mangaka review.

**Yêu cầu:**
1. **Bước 0 — Đọc trước khi code:**
   - Tìm file enum `ChapterStatus.cs` (hoặc `Chapter.cs` có enum nested). Liệt kê các giá trị hiện tại.
   - Tìm nơi validate transition status (thường là trong `ChaptersService.UpdateStatusAsync` hoặc `ChapterStatusTransition.cs`). Liệt kê luật hiện tại.
2. **Thêm 3 giá trị enum** (giữ thứ tự, không xóa giá trị cũ):
   - `SendingToMangaka = 6` — chapter đã được Assistant composite xong, đang chờ Mangaka duyệt.
   - `MangakaRejected = 7` — Mangaka đã từ chối, quay lại cho Assistant sửa.
   - `MangakaAccepted = 8` — Mangaka đã duyệt, chờ chuyển cho Tantou (transient — sẽ tự chuyển sang `SubmittedToEditor`).
3. **Cập nhật transition FSM** (cho phép các luồng mới):
   ```
   AssistantReviewing → SendingToMangaka      (Assistant bấm "Gửi Mangaka")
   SendingToMangaka → MangakaAccepted         (Mangaka duyệt)
   SendingToMangaka → MangakaRejected         (Mangaka từ chối)
   MangakaRejected → SendingToMangaka          (Assistant sửa xong, gửi lại)
   MangakaAccepted → SubmittedToEditor        (auto, trong cùng transaction)
   Draft → SubmittedToAssistant               (giữ nguyên)
   SubmittedToAssistant → AssistantReviewing  (giữ nguyên)
   ```
4. **Bổ sung field nullable** vào bảng `Chapters` (nếu chưa có — check migration history):
   - `MangakaReviewedAt DATETIME NULL` — timestamp Mangaka duyệt.
   - `MangakaRejectionReason NVARCHAR(MAX) NULL` — lý do từ chối.
   - `MangakaReviewedById UNIQUEIDENTIFIER NULL FK → Users(Id)` — ai duyệt.
5. **Tạo migration** `AddChapterStatusMangakaReview`.
6. **Unit test** transition: viết test cho 6 transition mới ở trên (PASS nếu hợp lệ, throw `InvalidChapterStatusTransitionException` nếu không).

**Edge case cần xử lý:**
- Không cho chuyển `SendingToMangaka` thành `Draft` hoặc bất kỳ status cũ nào khác ngoài `MangakaAccepted` / `MangakaRejected`.
- Nếu `MangakaRejectionReason` null khi chuyển sang `MangakaRejected` → throw validation error.

**Commit message:** `feat(prompt-1): extend chapter status FSM with Mangaka review states`

---

## Prompt 2: `GET /api/chapters?seriesId=&status=&statuses=` — filter chapter

**Endpoint:** `GET /api/chapters?seriesId={id}&status={status}&statuses={csv}&mangakaId={id}&assistantId={id}&page=1&pageSize=20`
**Auth:** `[Authorize]` — chỉ trả chapter thuộc quyền của user hiện tại (Mangaka/Assistant/Tantou/Admin).
**Mục đích:** FE cần filter chapter theo status để hiển thị "Bản tổng hợp từ Assistant" + "Lịch sử".

**Yêu cầu:**
1. **Bước 0:** Tìm `ChaptersController.GetAll` (hoặc route `[HttpGet]` đầu tiên của `ChaptersController`). Liệt kê các query param hiện tại. **KHÔNG xóa param cũ**, chỉ thêm.
2. **Thêm 3 query param mới** vào method `GetAll`:
   - `status` (string, optional) — filter đơn, ví dụ `?status=SendingToMangaka`. Map sang enum.
   - `statuses` (string, optional) — filter nhiều, ví dụ `?statuses=EditorReviewing,ReadyForPrint,Published,Rejected`. Phân tách bằng dấu phẩy.
   - `mangakaId` (Guid, optional) — lọc chapter của 1 Mangaka cụ thể.
   - `assistantId` (Guid, optional) — lọc chapter mà Assistant đang xử lý.
3. **Authorization rule** (check trong service `GetAllChaptersAsync`):
   - Role `Mangaka` → chỉ trả `Chapters.MangakaId == currentUser.Id`.
   - Role `Assistant` → chỉ trả `Chapters.AssistantId == currentUser.Id`.
   - Role `Tantou` → chỉ trả `Chapters.EditorId == currentUser.Id`.
   - Role `Admin` → trả tất cả.
4. **Service:** trong `ChaptersService.GetAllAsync`, thêm `Expression<Func<Chapter, bool>>` filter động theo param truyền vào. **Dùng `IQueryable` + `AsNoTracking()`** (không `ToList()` sớm).
5. **Response format** — giữ nguyên envelope chuẩn `{ succeeded, data, message, errors }`. Trong `data` trả:
   ```
   {
     "items": [ChapterDto, ...],
     "total": 42,
     "page": 1,
     "pageSize": 20
   }
   ```
   Nếu endpoint cũ trả `List<ChapterDto>` thẳng → **giữ nguyên behavior cũ** khi không truyền param mới, chỉ trả paginated khi có `page` param (backward compatible).

**Request:**
```
GET /api/chapters?status=SendingToMangaka&mangakaId=8a3c... HTTP/1.1
Authorization: Bearer <jwt>
```

**Response 200:**
```
{
  "succeeded": true,
  "data": {
    "items": [
      { "id": "...", "seriesId": "...", "chapterNumber": 3, "title": "Ch.3 - Đại chiến", "status": "SendingToMangaka", ... }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  },
  "message": null,
  "errors": null
}
```

**Edge case cần xử lý:**
- `status` không hợp lệ (không thuộc enum) → trả 400 với message `"Invalid status value"`.
- `statuses` rỗng hoặc trùng → bỏ qua duplicate, không lỗi.
- User không có quyền xem chapter của Mangaka khác → trả `items: []`, `total: 0` (không 403 — tránh lộ thông tin).

**Commit message:** `feat(prompt-2): chapters GET filter by status and statuses`

---

## Prompt 3: `POST /api/pages/{id}/send-to-mangaka` — Assistant gửi composite

**Endpoint:** `POST /api/pages/{id}/send-to-mangaka`
**Auth:** `[Authorize(Roles = "Assistant")]`
**Mục đích:** Assistant bấm "Gửi Mangaka" trên page → BE composite ảnh cuối + set chapter status `SendingToMangaka` + tạo notification cho Mangaka.

**Yêu cầu:**
1. **Bước 0:**
   - Tìm `PagesController` + `PagesService` đã có method `CompositeAsync` (gọi lại nó).
   - Tìm `ChaptersService.UpdateStatusAsync` (gọi lại nó).
   - Tìm `INotificationService` hoặc `NotificationsService` (gọi lại nó).
2. **Tạo method mới** `PagesService.SendToMangakaAsync(Guid pageId, Guid assistantId)`:
   ```
   Bước 1: Validate page tồn tại, lấy Chapter.
   Bước 2: Validate user hiện tại là Assistant của chapter (Chapter.AssistantId == assistantId).
   Bước 3: Validate chapter status phải là AssistantReviewing (transition sang SendingToMangaka).
   Bước 4: Gọi CompositeAsync(pageId) — composite tất cả layer IsVisible=true.
   Bước 5: Cập nhật Chapter.Status = SendingToMangaka, UpdatedAt = NOW.
   Bước 6: Tạo notification type "chapter.send_to_mangaka" cho Chapter.MangakaId.
   Bước 7: Return PageDto (kèm PageImageUrl mới sau composite).
   ```
3. **Tạo controller method:**
   ```
   [HttpPost("api/pages/{id:guid}/send-to-mangaka")]
   [Authorize(Roles = "Assistant")]
   public async Task<IActionResult> SendToMangaka(Guid id) { ... }
   ```
4. **Notification payload:**
   ```
   Title: "Bản ghép từ Assistant đã sẵn sàng"
   Message: "Chapter {chapterNumber} - {seriesTitle} đang chờ bạn duyệt"
   Type: "chapter.send_to_mangaka"
   RelatedEntityId: chapterId
   ```
5. **Idempotency:** Nếu chapter đã ở `SendingToMangaka` rồi → trả 200 với PageDto hiện tại (không composite lại, không tạo notification mới). Tránh spam.

**Request:**
```
POST /api/pages/8a3c.../send-to-mangaka HTTP/1.1
Authorization: Bearer <jwt-assistant>
```

**Response 200:**
```
{
  "succeeded": true,
  "data": {
    "id": "8a3c...",
    "chapterId": "b1f2...",
    "pageNumber": 5,
    "pageImageUrl": "https://cdn.../pages/8a3c_final_20260625.png",
    "layerCount": 3
  },
  "message": "Đã gửi cho Mangaka duyệt",
  "errors": null
}
```

**Edge case cần xử lý:**
- Page chưa có layer nào → trả 400 `"Page chưa có layer nào, vui lòng upload ít nhất 1 layer"`.
- Chapter không thuộc Assistant này → 403.
- Chapter status không phải `AssistantReviewing` → 400 với message rõ ràng.
- Composite thất bại (lỗi file ảnh) → 500, **KHÔNG** set status (rollback transaction).

**Commit message:** `feat(prompt-3): endpoint send-to-mangaka for assistant`

---

## Prompt 4: `POST /api/chapters/{id}/accept` — Mangaka chấp nhận

**Endpoint:** `POST /api/chapters/{id}/accept`
**Auth:** `[Authorize(Roles = "Mangaka")]`
**Mục đích:** Mangaka bấm "Chấp nhận" → chapter chuyển `SendingToMangaka` → `MangakaAccepted` → auto `SubmittedToEditor`, đồng thời gán Tantou từ series + tạo notification.

**Yêu cầu:**
1. **Bước 0:**
   - Tìm `ChaptersService.GetByIdAsync`.
   - Tìm `Series.EditorId` (Tantou phụ trách series).
   - Tìm transition status (Prompt 1 đã thêm `MangakaAccepted`).
2. **Tạo method mới** `ChaptersService.AcceptByMangakaAsync(Guid chapterId, Guid mangakaId, AcceptChapterRequest request)`:
   ```
   Bước 1: Validate chapter, kiểm tra Chapter.MangakaId == mangakaId.
   Bước 2: Validate status == SendingToMangaka (nếu không → 400).
   Bước 3: Set Chapter.Status = MangakaAccepted, MangakaReviewedAt = NOW, MangakaReviewedById = mangakaId.
   Bước 4: Set Chapter.EditorId = Series.EditorId (Tantou mặc định của series).
   Bước 5: Set Chapter.Status = SubmittedToEditor, EditorId = Series.EditorId.
   Bước 6: Tạo 2 notification:
         - type "chapter.mangaka_accepted" cho Chapter.AssistantId
         - type "chapter.sent_to_tantou" cho Chapter.EditorId
   Bước 7: Return ChapterDto cập nhật.
   ```
3. **Tạo DTO request** (optional):
   ```
   {
     "tantouId": "guid-or-null"   // nếu muốn override Tantou khác series.EditorId, truyền vào
   }
   ```
   Nếu `tantouId` null → dùng `Series.EditorId`.
4. **Controller:**
   ```
   [HttpPost("api/chapters/{id:guid}/accept")]
   [Authorize(Roles = "Mangaka")]
   public async Task<IActionResult> Accept(Guid id, [FromBody] AcceptChapterRequest? request) { ... }
   ```

**Request:**
```
POST /api/chapters/c4d5.../accept HTTP/1.1
Authorization: Bearer <jwt-mangaka>
Content-Type: application/json

{ "tantouId": null }
```

**Response 200:**
```
{
  "succeeded": true,
  "data": {
    "id": "c4d5...",
    "status": "SubmittedToEditor",
    "editorId": "e9b1...",
    "mangakaReviewedAt": "2026-06-25T04:30:00Z",
    ...
  },
  "message": "Đã chấp nhận và gửi cho Tantou",
  "errors": null
}
```

**Edge case cần xử lý:**
- Chapter không có Series.EditorId VÀ không truyền `tantouId` → 400 `"Series chưa có Tantou phụ trách, vui lòng chọn Tantou"`.
- Status sai (không phải `SendingToMangaka`) → 400.
- Tantou được chỉ định không có role "Tantou" → 400.
- Đã từng accept rồi (gọi lại) → idempotent, trả 200 với data hiện tại, không tạo notification mới.

**Commit message:** `feat(prompt-4): endpoint accept chapter by mangaka`

---

## Prompt 5: `POST /api/chapters/{id}/reject` — Mangaka từ chối

**Endpoint:** `POST /api/chapters/{id}/reject`
**Auth:** `[Authorize(Roles = "Mangaka")]`
**Mục đích:** Mangaka bấm "Từ chối" → chapter chuyển `SendingToMangaka` → `MangakaRejected` + lưu lý do + tạo notification cho Assistant.

**Yêu cầu:**
1. **Bước 0:**
   - Check bảng `Chapters` đã có `MangakaRejectionReason` (Prompt 1) chưa.
   - Tìm transition status `MangakaRejected`.
2. **Tạo DTO request:**
   ```
   {
     "reason": "Lớp tiếng Nhật che mất mặt nhân vật chính"  // required, max 1000 ký tự
   }
   ```
3. **Tạo method** `ChaptersService.RejectByMangakaAsync(Guid chapterId, Guid mangakaId, RejectChapterRequest request)`:
   ```
   Bước 1: Validate chapter + ownership.
   Bước 2: Validate status == SendingToMangaka.
   Bước 3: Set Chapter.Status = MangakaRejected, MangakaRejectionReason = request.reason, MangakaReviewedAt = NOW, MangakaReviewedById = mangakaId.
   Bước 4: Tạo notification type "chapter.mangaka_rejected" cho Chapter.AssistantId.
         Title: "Mangaka yêu cầu sửa lại"
         Message: "Chapter {chapterNumber} - {seriesTitle}: {reason}"
   Bước 5: Return ChapterDto.
   ```
4. **Controller:**
   ```
   [HttpPost("api/chapters/{id:guid}/reject")]
   [Authorize(Roles = "Mangaka")]
   public async Task<IActionResult> Reject(Guid id, [FromBody] RejectChapterRequest request) { ... }
   ```

**Request:**
```
POST /api/chapters/c4d5.../reject HTTP/1.1
Authorization: Bearer <jwt-mangaka>
Content-Type: application/json

{ "reason": "Lớp text che mặt nhân vật ở trang 3" }
```

**Response 200:**
```
{
  "succeeded": true,
  "data": {
    "id": "c4d5...",
    "status": "MangakaRejected",
    "mangakaRejectionReason": "Lớp text che mặt nhân vật ở trang 3",
    ...
  },
  "message": "Đã từ chối, Assistant sẽ sửa lại",
  "errors": null
}
```

**Edge case cần xử lý:**
- `reason` rỗng hoặc > 1000 ký tự → 400 validation.
- Status sai → 400.
- Chapter đã ở `MangakaRejected` rồi → idempotent, return data hiện tại.

**Commit message:** `feat(prompt-5): endpoint reject chapter by mangaka with reason`

---

## Prompt 6: `GET /api/chapters?history=true&...` — list chapter lịch sử cho Mangaka

**Endpoint:** `GET /api/chapters?history=true&seriesId={id}&mangakaId={id}&page=1&pageSize=20`
**Auth:** `[Authorize]` — chỉ trả chapter của user hiện tại.
**Mục đích:** Tab "Lịch sử" trên dashboard Mangaka, hiển thị chapter đã hoàn tất (duyệt/từ chối/publish).

**Yêu cầu:**
1. **Bước 0:**
   - Tìm method `GetAllAsync` ở `ChaptersService` (đã có từ Prompt 2).
   - Tìm enum `ChapterStatus`.
2. **Thêm query param** `history` (bool, optional, default false) vào `ChaptersController.GetAll`.
3. **Khi `history=true`**, trong `ChaptersService.GetAllAsync`, áp dụng filter:
   ```
   ch => ch.Status == ChapterStatus.EditorReviewing
      || ch.Status == ChapterStatus.ReadyForPrint
      || ch.Status == ChapterStatus.Published
      || ch.Status == ChapterStatus.MangakaRejected
      || ch.Status == ChapterStatus.Rejected
   ```
4. **Sort:** mặc định `UpdatedAt DESC` (mới nhất trước).
5. **Nếu không có param nào** (không truyền `history`, `status`, `statuses`, `mangakaId`, `assistantId`) → giữ nguyên behavior cũ (trả tất cả theo role). **Không break backward compat.**

**Request:**
```
GET /api/chapters?history=true&seriesId=8a3c...&page=1&pageSize=20 HTTP/1.1
Authorization: Bearer <jwt-mangaka>
```

**Response 200:** (giống format Prompt 2)
```
{
  "succeeded": true,
  "data": {
    "items": [
      { "id": "...", "status": "Published", "updatedAt": "2026-06-20...", ... },
      { "id": "...", "status": "MangakaRejected", "mangakaRejectionReason": "...", "updatedAt": "2026-06-22...", ... }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20
  },
  ...
}
```

**Edge case cần xử lý:**
- `history=true` kết hợp `status`/`statuses` → ưu tiên filter `status`/`statuses` (bỏ qua `history`).
- Nếu user là Assistant → chỉ trả chapter có AssistantId = currentUser (giống rule Prompt 2).

**Commit message:** `feat(prompt-6): chapters history filter`

---

## Prompt 7: `POST /api/pageissues/{id}/dismiss` — Assistant "Bỏ note"

**Endpoint:** `POST /api/pageissues/{id}/dismiss`
**Auth:** `[Authorize(Roles = "Mangaka,Assistant")]` (cả 2 role đều có thể dismiss note — FE sẽ gọi từ Assistant workspace)
**Mục đích:** Assistant bấm "Bỏ note" trong side panel → note chuyển status `Closed`.

**Yêu cầi:**
1. **Bước 0:**
   - Tìm `PageIssuesController` + `PageIssuesService`.
   - Tìm enum `PageIssueStatus` (Prompt 10 sẽ thêm `Closed` — **chạy Prompt 10 TRƯỚC prompt này**, hoặc gộp migration ở đây).
2. **Tạo method** `PageIssuesService.DismissAsync(Guid id, Guid userId)`:
   ```
   Bước 1: Validate page issue tồn tại.
   Bước 2: Validate user có quyền (Mangaka sở hữu page đó, hoặc Assistant được assign).
   Bước 3: Set PageIssue.Status = Closed, ResolvedAt = NOW, ResolvedById = userId.
   Bước 4: Tạo notification type "pageissue.dismissed" cho CreatedById (Mangaka ban đầu).
         Title: "Note đã được đóng"
         Message: "{user.FullName} đã đóng note của bạn trên page {pageNumber}"
   Bước 5: Return PageIssueDto.
   ```
3. **Controller:**
   ```
   [HttpPost("api/pageissues/{id:guid}/dismiss")]
   [Authorize(Roles = "Mangaka,Assistant")]
   public async Task<IActionResult> Dismiss(Guid id) { ... }
   ```
4. **Idempotency:** Nếu status đã `Closed` rồi → 200 với data hiện tại, không tạo notification mới.

**Request:**
```
POST /api/pageissues/pi-123/dismiss HTTP/1.1
Authorization: Bearer <jwt-assistant>
```

**Response 200:**
```
{
  "succeeded": true,
  "data": { "id": "pi-123", "status": "Closed", "resolvedAt": "...", ... },
  "message": "Đã bỏ note"
}
```

**Edge case cần xử lý:**
- Note không tồn tại → 404.
- User không liên quan (Mangaka khác) → 403.
- Status đã `Resolved` → vẫn cho chuyển sang `Closed` (Closed là terminal).

**Commit message:** `feat(prompt-7): endpoint dismiss page issue`

---

## Prompt 8: Notification triggers — gom tất cả trigger vào 1 module

**Endpoint:** (không có endpoint mới — chỉ sửa các service hiện có để gọi `INotificationService` đúng chỗ)
**Auth:** N/A
**Mục đích:** Đảm bảo notification được tạo đúng lúc ở 4 mốc workflow, không sót.

**Yêu cầu:**
1. **Bước 0:**
   - Tìm `INotificationService` (interface) + `NotificationsService` (impl). Liệt kê method `CreateAsync` hiện có signature.
   - Tìm 4 chỗ BE đang xử lý workflow: `PagesService.SendToMangakaAsync` (Prompt 3), `ChaptersService.AcceptByMangakaAsync` (Prompt 4), `ChaptersService.RejectByMangakaAsync` (Prompt 5), `ChaptersService.SendToTantouAsync` (nếu có — chapter đi từ Mangaka thẳng đến Tantou mà không qua Assistant).
2. **Đảm bảo đủ 4 trigger** (sau khi Prompt 3, 4, 5 đã có):

   | # | Trigger | Service | Notification Type | Receiver | Title (gợi ý) |
   |---|---------|---------|-------------------|----------|----------------|
   | 1 | Assistant bấm "Gửi Mangaka" | `SendToMangakaAsync` | `chapter.send_to_mangaka` | Chapter.MangakaId | "Bản ghép từ Assistant đã sẵn sàng" |
   | 2 | Mangaka Accept | `AcceptByMangakaAsync` | `chapter.mangaka_accepted` | Chapter.AssistantId | "Mangaka đã duyệt chapter của bạn" |
   | 3 | Mangaka Accept | `AcceptByMangakaAsync` | `chapter.sent_to_tantou` | Chapter.EditorId | "Có chapter mới chờ bạn xử lý" |
   | 4 | Mangaka Reject | `RejectByMangakaAsync` | `chapter.mangaka_rejected` | Chapter.AssistantId | "Mangaka yêu cầu sửa lại" |
   | 5 | Mangaka gửi thẳng cho Tantou (bỏ qua Assistant) | nếu có | `chapter.sent_to_tantou` | Chapter.EditorId + Chapter.AssistantId | "Chapter đã được gửi cho Tantou" |

3. **Refactor:** tạo helper `INotificationDispatcher` với 5 method tương ứng 5 dòng trên, gọi từ các service tương ứng. Tránh copy-paste logic tạo notification.
4. **Đảm bảo tất cả notification được tạo trong cùng transaction với thay đổi status** (nếu status update fail → notification cũng rollback, không gửi "ma").

**Edge case cần xử lý:**
- User nhận notification không tồn tại (đã bị xóa) → skip, log warning, không throw.
- Cùng 1 user nhận nhiều notification cùng lúc → tạo từng dòng riêng, không gộp.
- Notification Type chưa có trong enum → thêm vào `NotificationType` enum (nếu có dùng enum), hoặc dùng string `Type` (nếu dùng string column).

**Commit message:** `feat(prompt-8): notification triggers for mangaka-assistant-tantou workflow`

---

## Prompt 9: Update `ChaptersController.GetAll` — thêm param `statuses` (List)

**Endpoint:** (Prompt 2 đã mô tả, prompt này tập trung vào edge case phân tách CSV)
**Auth:** như Prompt 2
**Mục đích:** Đảm bảo param `statuses=A,B,C` được parse đúng thành `List<ChapterStatus>`.

**Yêu cầu:**
1. **Bước 0:** Tìm method `GetAll` ở `ChaptersController`. Xem binding model hiện tại.
2. **Đảm bảo binding:** ASP.NET Core mặc định binding `?statuses=A&statuses=B` thành `string[]`. Với `?statuses=A,B` thì chỉ bind thành 1 string. Cần custom model binder:
   ```
   [ModelBinder(BinderType = typeof(CommaSeparatedModelBinder))]
   public List<ChapterStatus> Statuses { get; set; }
   ```
   Hoặc parse trong controller:
   ```
   var statuses = !string.IsNullOrEmpty(statusesParam)
       ? statusesParam.Split(',', StringSplitOptions.RemoveEmptyEntries)
                      .Select(s => Enum.Parse<ChapterStatus>(s, ignoreCase: true))
                      .ToList()
       : null;
   ```
3. **Filter logic:** trong service, nếu `statuses != null && statuses.Any()` thì `ch => statuses.Contains(ch.Status)`. Nếu `status` cũng có thì ưu tiên `statuses` (vì cụ thể hơn).
4. **Viết test:** truyền `?statuses=EditorReviewing,Published` → assert query có `WHERE Status IN (...)`.

**Edge case cần xử lý:**
- `statuses` chứa giá trị không hợp lệ → trả 400 với message `"Invalid status value in list: {value}"`.
- `statuses` rỗng (`?statuses=`) → coi như không filter.
- Cùng lúc có `status` và `statuses` → ưu tiên `statuses`, log warning "Both status and statuses provided, using statuses".

**Commit message:** `feat(prompt-9): chapters GET comma-separated statuses param`

---

## Prompt 10: Update `PageIssue` status FSM — thêm `Closed`

**Endpoint:** (không có — sửa enum + transition)
**Auth:** N/A
**Mục đích:** Hỗ trợ Prompt 7 — Assistant "Bỏ note" → status `Closed`.

**Yêu cầu:**
1. **Bước 0:** Tìm enum `PageIssueStatus` + nơi validate transition. Liệt kê giá trị hiện tại.
2. **Thêm giá trị enum** `Closed = 4` (hoặc số tiếp theo, tùy enum hiện tại).
3. **Bổ sung transition FSM:**
   ```
   Open → Closed          (Assistant hoặc Mangaka dismiss)
   InProgress → Closed    (Assistant hoặc Mangaka dismiss)
   Resolved → Closed      (đã resolve, giờ close hẳn)
   Closed → (terminal)    (không cho chuyển tiếp)
   ```
4. **Bổ sung field** (nếu chưa có) vào bảng `PageIssues`:
   - `ResolvedById UNIQUEIDENTIFIER NULL FK → Users(Id)` — người close note.
   - `ResolvedAt DATETIME NULL` — thời điểm close.
5. **Migration** `AddPageIssueStatusClosed`.
6. **Test** transition.

**Edge case cần xử lý:**
- Note ở `Closed` → không cho update status nữa (trừ admin).
- Note đã `Closed` → API `GET /api/pageissues?status=Closed` vẫn trả về bình thường (closed không có nghĩa xóa).

**Commit message:** `feat(prompt-10): page issue status FSM add Closed state`

---

## Thứ tự chạy prompt (quan trọng!)

Vì các prompt có dependency, chạy theo thứ tự:

1. **Prompt 10** trước (thêm `Closed` enum) → Prompt 7 mới chạy được.
2. **Prompt 1** trước (thêm status FSM) → Prompt 3, 4, 5, 6 mới chạy được.
3. **Prompt 3** → 4 → 5 (workflow tuần tự).
4. **Prompt 2** → **Prompt 9** (cùng 1 controller, làm Prompt 2 trước).
5. **Prompt 6** (sau Prompt 2, dùng chung service).
6. **Prompt 7** (sau Prompt 10).
7. **Prompt 8** (cuối cùng, gom tất cả notification).

**Tóm tắt thứ tự:** 10 → 1 → 3 → 4 → 5 → 2 → 9 → 6 → 7 → 8.

---

## Checklist cuối cùng cho BE

Sau khi làm xong 10 prompt, verify:

- [ ] Migration đã chạy trên DB dev, không conflict với migration cũ.
- [ ] Swagger có đủ endpoint mới: `POST /api/pages/{id}/send-to-mangaka`, `POST /api/chapters/{id}/accept`, `POST /api/chapters/{id}/reject`, `POST /api/pageissues/{id}/dismiss`.
- [ ] Filter `?status=` và `?statuses=` hoạt động đúng (test với 2-3 status).
- [ ] Notification hiển thị trong app (FE đã có `useNotifications`).
- [ ] Authorization: Assistant không thể gọi accept/reject, Mangaka không thể gọi send-to-mangaka.
- [ ] Idempotency: gọi lại accept/reject 2 lần không tạo notification trùng.

Nếu có bug, ping FE (em) để debug chung.
