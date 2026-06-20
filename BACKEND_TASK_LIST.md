# BACKEND TASK LIST — Đảm bảo kết nối với Frontend
**Ngày:** 2026-06-19
**FE Root:** `d:\SWP391-Manga\manga-project`
**BE Root:** `D:\SWP391_MangaPublishSystem_BE-Quoc_Test`

---

## NHỮNG LỖI NGHIÊM TRỌNG NHẤT (Breaking — FE không chạy được)

---

### [CRITICAL-1] Series POST/PUT — Đổi từ `seriesDto` JSON sang flat form fields

**Vấn đề:** Backend Controller hiện tại nhận form field `seriesDto` (JSON string) + 2 file:
```
FormData:
  seriesDto: '{"title":"...","synopsis":"...","mangakaid":4,...}'   ← JSON string
  proposalFile: File
  coverImage: File
```

Nhưng Frontend gửi flat fields:
```
FormData:
  title: "..."
  synopsis: "..."
  mangakaid: 4
  tantoueditorid: 1
  agerating: "G"
  genreIds[]: [1,2]
  tagIds[]: [1]
  proposalFile: File
  coverImage: File
```

**Yêu cầu BE fix:** Đổi SeriesController POST và PUT để nhận flat form fields THAY VÌ `seriesDto` JSON. Hoặc giữ nguyên BE, đổi FE thành gửi `seriesDto` JSON string.

**Quyết định:** Nên đổi BE sang nhận flat fields (tự nhiên hơn cho FE). Thay `[FromForm] SeriesDto.Create seriesDto` bằng các parameter riêng.

**Fix BE (tùy chọn A — khuyến nghị):**
```csharp
// POST api/Series — đổi từ seriesDto JSON sang flat form fields
[HttpPost]
[Consumes("multipart/form-data")]
public async Task<IActionResult> CreateSeries(
    [FromForm] string title,
    [FromForm] string synopsis,
    [FromForm] int mangakaid,
    [FromForm] int tantoueditorid,
    [FromForm] string agerating = "G",
    [FromForm] List<int>? genreIds,
    [FromForm] List<int>? tagIds,
    IFormFile? proposalFile,
    IFormFile? coverImage
)
// Tương tự cho PUT api/Series/{id}
```

---

### [CRITICAL-2] Pages POST/PUT — Đổi từ `pageDto` JSON sang flat form fields

**Vấn đề tương tự:** Backend nhận `pageDto` (JSON) + `pageFile`. FE gửi flat fields.

**Fix BE (tùy chọn A — khuyến nghị):**
```csharp
// POST api/Pages
[HttpPost]
[Consumes("multipart/form-data")]
public async Task<IActionResult> CreatePage(
    [FromForm] int chapterid,
    [FromForm] int pagenumber,
    IFormFile pageFile
)
// PUT api/Pages/{id}
[HttpPut("{id:int}")]
[Consumes("multipart/form-data")]
public async Task<IActionResult> UpdatePage(
    int id,
    [FromForm] int pagenumber,
    IFormFile? pageFile
)
```

---

### [CRITICAL-3] PageLayers POST/PUT — Đổi từ `dto` JSON sang flat form fields

**Vấn đề:** Backend nhận `dto` (JSON) + `layerFile`. FE gửi flat fields.

**Fix BE (tùy chọn A — khuyến nghị):**
```csharp
// POST api/PageLayers
[HttpPost]
[Consumes("multipart/form-data")]
public async Task<IActionResult> CreateLayer(
    [FromForm] int pageid,
    [FromForm] int uploaderid,
    [FromForm] string layername,
    [FromForm] int? zindex,
    [FromForm] decimal? opacity,   // decimal type như trong DB
    IFormFile layerFile
)

// PUT api/PageLayers/{id}
[HttpPut("{id:int}")]
[Consumes("multipart/form-data")]
public async Task<IActionResult> UpdateLayer(
    int id,
    [FromForm] string? layername,
    [FromForm] int? zindex,
    [FromForm] decimal? opacity,
    [FromForm] int? versionnumber,
    IFormFile? layerFile
)
```

---

## NHỮNG LỖI TRỌNG (FE đọc sai field names)

---

### [HIGH-1] Series response — PascalCase vs camelCase

**Vấn đề:** Backend trả JSON response với **PascalCase** (ASP.NET Core mặc định):
```json
{
  "Seriesid": 1,
  "Title": "...",
  "Synopsis": "...",
  "Coverimageurl": "https://...",
  "Proposalfileurl": "https://...",
  "Agerating": "G",
  "Publishformat": "Monthly",
  "Genres": [{ "GenreId": 1, "GenreName": "Action" }],
  "Tags": [{ "TagId": 1, "TagName": "..." }]
}
```

Nhưng Frontend `mapApiSeriesToLocal()` đọc `raw.seriesid`, `raw.title`, `raw.coverimageurl`, `raw.proposalfileurl` — **lowercase**.

**2 cách fix (chọn 1):**

**Cách A (Fix FE — khuyến nghị):** Thêm fallback PascalCase trong `seriesModel.js`:
```javascript
const id = raw.seriesid ?? raw.Seriesid ?? raw.SeriesId ?? raw.id ?? index + 1
const title = raw.title ?? raw.Title ?? ''
const coverImage = raw.coverimageurl ?? raw.Coverimageurl ?? raw.coverImageUrl ?? null
const proposalFileUrl = raw.proposalfileurl ?? raw.Proposalfileurl ?? null
const genres = Array.isArray(raw.genres)
  ? raw.genres.map(g => ({
      genreId: g.genreId ?? g.GenreId,
      genreName: g.genreName ?? g.GenreName,
    }))
  : []
```

**Cách B (Fix BE):** Thêm vào `Program.cs`:
```csharp
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase; // hoặc snake_case
    })
```
→ Đổi hết PascalCase → camelCase. Cần test lại tất cả endpoints.

**Khuyến nghị: Fix FE** (Cách A) vì ít rủi ro hơn, không ảnh hưởng internal BE.

---

### [HIGH-2] Chapter response — thiếu `seriesTitle`

**Vấn đề:** `GET /api/Chapters` trả ChapterDto:
```json
{
  "Chapterid": 1,
  "Seriesid": 1,
  "Chapternumber": 5,
  "Title": "Chapter 5",
  "Deadline": "...",
  "Status": "Drafting"
}
```

Không có `seriesTitle`. Frontend `useAssistantAssignments.js` đọc `chapter.seriesTitle ?? chapter.series?.title` → sẽ luôn là `'Unknown Series'`.

**Fix BE:** Thêm navigation property vào ChapterDto:
```csharp
// ChapterDto.cs — thêm
public string? SeriesTitle { get; set; }

// ChapterService.cs — GetAllAsync và GetByIdAsync
dto.SeriesTitle = (await _context.Series.FindAsync(dto.Seriesid))?.Title;
```

Hoặc **Fix FE:** `useAssistantAssignments` cần gọi `seriesService.getById(chapter.seriesid)` để lấy series title, hoặc BE tạo endpoint riêng.

---

### [HIGH-3] Page response — `Pageimageurl` (chữ I hoa)

**Vấn đề:** Backend trả `"Pageimageurl"`. Frontend `useAssistantAssignments` đọc `p.pageimageurl` (chữ i thường).

**Fix FE:**
```javascript
pages: pageList.map(p => ({
  id: p.pageid ?? p.Pageid ?? p.pageId ?? p.PageId,
  url: p.pageimageurl ?? p.Pageimageurl ?? p.pageImageUrl ?? null,
  pageNum: p.pagenumber ?? p.Pagenumber ?? p.pageNumber ?? 0,
}))
```

---

### [HIGH-4] PageLayer response — `Fileurl` (chữ F hoa)

**Vấn đề:** Backend trả `"Fileurl"`. Frontend `apiLayerToUi()` đọc `raw.url ?? raw.layerUrl ?? raw.Pageimageurl`.

**Fix FE:**
```javascript
imageUrl: raw.imageUrl ?? raw.url ?? raw.layerUrl ?? raw.Fileurl ?? raw.fileurl ?? '',
```

---

### [HIGH-5] PageIssue response — PascalCase hoàn toàn

**Vấn đề:** Backend trả PascalCase:
```json
{
  "Issueid": 1,
  "Pageid": 2,
  "CreatedById": 4,
  "IssueType": "Revision",
  "WorkCategory": "Inking",
  "BoxX": 10,
  "BoxY": 20,
  "BoxWidth": 100,
  "BoxHeight": 80,
  "Description": "Fix line thickness"
}
```

Frontend đọc lowercase `n.boxx`, `n.boxy`, `n.issuetype`, `n.workcategory`.

**Fix FE (trong Assistant.jsx LayerStack):**
```javascript
// Đã fix trước đó — thêm fallback:
// left: `${n.boxx ?? n.boxX ?? n.BoxX ?? 0}%`
// top: `${n.boxy ?? n.boxY ?? n.BoxY ?? 0}%`
// width: `${n.boxwidth ?? n.boxWidth ?? n.BoxWidth ?? 10}%`
// height: `${n.boxheight ?? n.boxHeight ?? n.BoxHeight ?? 10}%`
```

**Fix FE (trong pageNotes display):**
```javascript
// Đã fix trước đó:
Badge: {NOTE_TASK_LABELS[n.issuetype ?? n.IssueType ?? n.issueType] ?? n.issuetype ?? n.IssueType ?? 'Khac'}
Description: {n.description ?? n.Description ?? 'Khong co mo ta'}
```

---

### [HIGH-6] Login response — thiếu `name`/`fullname`

**Vấn đề:** `POST /api/auth/login` và `POST /api/auth/register` trả:
```json
{
  "userid": 4,
  "username": "manga1",
  "roleid": 4,
  "token": "...",
  "refreshToken": "..."
}
```

Không có `fullname`, `penName`, `email`. FE `buildSessionFromAuthResponse()` dùng `data.fullname ?? data.Fullname` → sẽ là `undefined`.

**Fix BE (khuyến nghị):** Thêm profile data vào login/register response:
```csharp
// AuthController.cs — Login()
return Ok(new {
    userid = user.Userid,
    username = user.Username,
    fullname = user.Fullname,
    email = user.Email,
    roleid = user.Roleid,
    token,
    refreshToken
});

// Register()
return Ok(new {
    userid = newUser.Userid,
    username = newUser.Username,
    fullname = newUser.Fullname,
    email = newUser.Email,
    roleid = newUser.Roleid,
    token,
    refreshToken
});
```

---

## NHỮNG THIẾU API (Backend chưa có)

---

### [CRITICAL-4] Endpoint lấy chapters cho Assistant

**Vấn đề:** Backend không có endpoint `GET /api/chapters/assistant/{assistantId}`.
FE dùng `GET /api/Chapters` (tất cả chapters) rồi filter ở client → **Assistant thấy TẤT CẢ chapters trong hệ thống**.

**Fix BE:** Thêm controller `AssistantAssignmentsController`:
```csharp
[ApiController]
[Route("api/assistant-assignments")]
public class AssistantAssignmentsController : ControllerBase
{
    // GET api/assistant-assignments/{assistantId}
    // Trả chapters mà assistant được assign (qua mangaka_assistants table)
    [HttpGet("{assistantId:int}")]
    public async Task<ActionResult<List<ChapterDto>>> GetAssignments(int assistantId)
    {
        // Query mangaka_assistants table, join chapters + series
        // Chỉ trả chapters mà assistant đó có quyền
    }
}
```

**Fix FE (tạm thời — nếu BE chưa kịp):**
`assistantService.getMyAssignments()` giữ nguyên `GET /Chapters` nhưng thêm note "Cần BE bổ sung endpoint riêng".

---

### [HIGH-7] Endpoint composite/finalize layers

**Vấn đề:** Backend không có `POST /api/pages/{id}/finalize` hoặc `POST /api/pageLayers/composite`.

**Fix BE:** Thêm endpoint:
```csharp
// POST api/pages/{id}/composite
[HttpPost("{id:int}/composite")]
public async Task<ActionResult<PageDto>> CompositePage(
    int id,
    [FromBody] List<int> layerIds   // IDs của layers để ghép lại
)
{
    // 1. Tải tất cả layer images từ Supabase
    // 2. Ghép trên server (ImageSharp / SkiaSharp)
    // 3. Upload ảnh đã ghép lên Supabase
    // 4. Trả URL ảnh composite
}
```

---

### [HIGH-8] Notification Controller

**Vấn đề:** Backend có table `notifications` nhưng không có controller.

**Fix BE:** Tạo `NotificationsController`:
```csharp
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetMyNotifications(
        [FromQuery] int limit = 20, [FromQuery] int offset = 0)
    
    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
}
```

---

### [MEDIUM-9] MangakaAssistant Controller

**Vấn đề:** Entity `MangakaAssistant` tồn tại trong DB nhưng không có controller.

**Fix BE:** Tạo `MangakaAssistantsController`:
```csharp
[ApiController]
[Route("api/mangaka-assistants")]
[Authorize(Roles = "Mangaka,Assistant")]
public class MangakaAssistantsController : ControllerBase
{
    // GET api/mangaka-assistants?mangakaId=  — danh sách assistant của 1 mangaka
    // POST api/mangaka-assistants       — tạo hợp đồng
    // DELETE api/mangaka-assistants/{id} — xóa hợp đồng
}
```

---

### [MEDIUM-10] Rollback layer endpoint

**Vấn đề:** Frontend muốn rollback layer về version cũ, nhưng BE không có.

**Fix BE:** Thêm:
```csharp
// POST api/pageLayers/{id}/rollback/{versionId}
[HttpPost("{id:int}/rollback/{versionId:int}")]
public async Task<IActionResult> RollbackLayer(int id, int versionId)
```

---

### [MEDIUM-11] Series workflow status API

**Vấn đề:** Frontend cần update series qua các bước: Draft → PendingEB → Approved → Published.

**Fix BE:** Thêm:
```csharp
// PATCH api/series/{id}/workflow
[HttpPatch("{id:int}/workflow")]
public async Task<IActionResult> UpdateWorkflowStatus(
    int id,
    [FromBody] SeriesDto.WorkflowStatus dto)
// dto: { "workflow": "submit_to_eb" | "approve_debut" | "publish" | "reject_debut" }
```

---

## LỖI BẢO MẬT

---

### [SECURITY-1] Thiếu `[Authorize]` trên content controllers

**Vấn đề:** Tất cả endpoints (Series, Chapters, Pages, PageLayers, PageIssues) **KHÔNG có `[Authorize]`**. Ai cũng đọc/ghi được mọi dữ liệu.

**Fix BE:** Thêm `[Authorize]` vào từng controller:
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,EditorBoard,Tantou,Mangaka,Assistant")]
public class SeriesController : ControllerBase { ... }

[Authorize(Roles = "Mangaka")]
public class ChaptersController : ControllerBase { ... }

[Authorize(Roles = "Mangaka,Assistant")]
public class PagesController : ControllerBase { ... }

[Authorize(Roles = "Mangaka,Assistant")]
public class PageLayersController : ControllerBase { ... }

[Authorize(Roles = "Mangaka,Assistant,Tantou")]
public class PageIssuesController : ControllerBase { ... }
```

**Lưu ý:** `[Authorize]` trên class sẽ áp dụng cho TẤT CẢ methods. Có thể override bằng `[AllowAnonymous]` trên GET methods public.

---

### [SECURITY-2] Xóa WeatherForecastController

**Vấn đề:** Endpoint `/weatherforecast` vẫn tồn tại (default scaffold).

**Fix BE:**
```bash
rm Controllers/WeatherForecastController.cs
```

---

## CORS & CONFIGURATION

---

### [CONFIG-1] CORS Origins

**Hiện tại:** `http://localhost:5173`, `http://localhost:5174`

**Kiểm tra:** FE chạy ở port nào? Nếu khác → thêm vào:
```csharp
// Program.cs
builder.Services.AddCors(options => {
    options.AddPolicy("AllowViteFrontend", policy => {
        policy.WithOrigins(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",  // thêm nếu cần
            "http://localhost:5176"   // thêm nếu cần
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});
```

---

### [CONFIG-2] Supabase Storage

**Kiểm tra:**
- Bucket `proposals` đã được tạo trên Supabase chưa?
- Bucket có public read权限 chưa?
- Anon key có quyền upload chưa?
- Nếu upload lỗi → kiểm tra Supabase Storage policy

---

## BẢNG TÓM TẮT PRIORITY

| Priority | Task | Effort |
|---|---|---|
| **CRITICAL** | Fix Series POST/PUT form format (flat fields) | Thấp |
| **CRITICAL** | Fix Pages POST/PUT form format (flat fields) | Thấp |
| **CRITICAL** | Fix PageLayers POST/PUT form format (flat fields) | Thấp |
| **CRITICAL** | Endpoint assignments cho Assistant | Cao |
| **HIGH** | Series response camelCase (fix FE) | Thấp |
| **HIGH** | Chapter thiếu seriesTitle (fix BE) | Trung bình |
| **HIGH** | Login/Register response thiếu fullname (fix BE) | Trung bình |
| **HIGH** | Endpoint composite layers | Cao |
| **SECURITY** | Thêm [Authorize] vào content controllers | Thấp |
| **SECURITY** | Xóa WeatherForecastController | Rất thấp |
| **MEDIUM** | Notification Controller | Trung bình |
| **MEDIUM** | MangakaAssistant Controller | Trung bình |
| **MEDIUM** | Rollback endpoint | Trung bình |
| **MEDIUM** | Workflow status API | Trung bình |
| **LOW** | CORS origins check | Thấp |

---

## THỨ TỰ LÀM VIỆC ĐỀ XUẤT

### Phase 1 — Critical (1-2 giờ)
1. Sửa SeriesController POST/PUT → flat form fields
2. Sửa PagesController POST/PUT → flat form fields
3. Sửa PageLayersController POST/PUT → flat form fields
4. Sửa AuthController login/register → thêm fullname, email vào response
5. Thêm seriesTitle vào ChapterDto

### Phase 2 — High (2-3 giờ)
6. Fix case sensitivity (Series response → thêm fallback FE)
7. Fix Chapter/Pages/PageLayer field name mappings
8. Thêm `[Authorize]` vào content controllers
9. Xóa WeatherForecastController

### Phase 3 — Medium (3-4 giờ)
10. Tạo AssistantAssignmentsController
11. Tạo NotificationsController
12. Tạo MangakaAssistantsController
13. Thêm composite/finalize endpoint

### Phase 4 — Low (1-2 giờ)
14. Thêm rollback endpoint
15. Thêm workflow status API
16. Kiểm tra CORS, Supabase config
