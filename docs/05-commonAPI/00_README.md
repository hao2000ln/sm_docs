# 00 — Common API V1 Documentation

## Phạm vi chức năng hiện tại

`api_v1` V1.0.0 hiện có các nhóm chức năng sau.

| Nhóm | Phạm vi đã có |
| --- | --- |
| Màn hình list | Dựng từ `ScreenDefinition`; cột, lookup theo lô, renderer, ẩn/hiện cột và lưu trạng thái UI. |
| Truy vấn | Paging server-side, search, sort, filter đơn/đa lựa chọn, khoảng ngày và tổ chức phân cấp; toàn bộ field/query đều allowlist. |
| Detail và action | Detail, Dynamic Form, create/update/delete, bulk action và screen action qua domain handler. |
| An toàn ghi dữ liệu | Permission, data scope, idempotency, optimistic lock, kết quả từng dòng và retry action lỗi. |
| Export V1 | Xuất trang hiện tại hoặc toàn bộ kết quả theo search/filter/sort hiện hành; client fetch theo chunk và giới hạn 50.000 dòng. Export rất lớn chưa chạy nền trong V1. |
| Import Excel V1 | Một file `.xlsx`/một sheet, tối đa 500 dòng; template, preview, pre-check, import chunk, background job từ ngưỡng cấu hình, file kết quả/lỗi, retry dòng lỗi và phục hồi sau F5. |
| Background job | Queue/claim/progress/cancel/recovery cho action được khai báo async. V1 đang áp dụng thực tế cho import hợp đồng lớn. |
| Báo cáo | Hỗ trợ screen/domain custom; ví dụ hiện có là dashboard theo dõi Email Log. |
| Extension | Custom action, hook import, renderer/component và API `ScriptLibrary.function` qua Common API allowlist. |
| Theme/UI chung | Loading, toast, modal portal, CSS token và branding override. |

V1 chưa bao gồm mapping Excel thủ công, nhiều sheet, rollback toàn file, resume tự động từng chunk, export nền có file lưu trên server hoặc màn hình quản trị lịch sử nhiều batch. Các phần này chỉ được bổ sung khi có scope V2 rõ ràng.

Các khả năng trên chỉ hoạt động khi được khai báo trong `ScreenDefinition` và được backend
cho phép; client không được tự truyền table, DBDict field, handler hoặc raw query.

Đây là điểm bắt đầu duy nhất của bộ tài liệu. Framework dựng màn hình danh sách từ
metadata backend, còn nghiệp vụ đặc thù được tách theo domain.

## Thứ tự đọc chuẩn

| STT | Tài liệu | Khi nào đọc |
| --- | --- | --- |
| 01 | [Quick Start](01_QUICK_START.md) | Tạo màn hình đầu tiên |
| 02 | [Screen Config](02_SCREEN_CONFIG_REFERENCE.md) | Tra cứu cấu hình list |
| 03 | [Dynamic Form](03_DYNAMIC_FORM_REFERENCE.md) | Popup, input, validation và prefill |
| 04 | [Action, Selection và Batch](04_ACTION_AND_BATCH_REFERENCE.md) | CRUD, custom action, chọn dòng, conflict và retry |
| 05 | [Export và Background Job](05_EXPORT_AND_BACKGROUND_JOBS.md) | Export/query và tác vụ lớn |
| 06 | [Security](06_SECURITY.md) | Permission và data scope |
| 07 | [Excel Import](07_EXCEL_IMPORT.md) | Khai báo, kiểm thử và vận hành import Excel |
| 08 | [ScriptLibrary API](08_SCRIPT_LIBRARY_API_CONFIGURATION.md) | Công bố và test `ScriptLibrary.function` qua Common API |
| 09 | [WebTier/Form custom](09_WEBTIER_FORM_CUSTOM_CONFIGURATION.md) | Định dạng tiền, chữ số và datetime không giây |
| 10 | [API Response](10_API_RESPONSE_REFERENCE.md) | Response/error code |
| 11 | [Operations và Release](11_OPERATIONS_AND_RELEASE.md) | Publish, cache, smoke test, release gate và rollback |

## Mô hình cần nhớ

```text
ScreenDefinition                 metadata + allowlist
      ↓
ScreenRegistry / ScreenService   resolve + API
      ↓
CatalogEngine                    list/detail/filter/lookup
      ↓
HPTScreenRuntime                 dựng UI

Action → Registry → Actions → Service → Repository
```

Quy tắc cốt lõi:

1. Client chỉ gửi `screenId`, action ID và dữ liệu đầu vào; không gửi table, field
   DBDict, handler hoặc raw query.
2. `ScreenDefinition` chỉ chứa metadata/cấu hình, không chứa `SCFile` hay business rule.
3. Validation frontend phục vụ UX; backend luôn kiểm tra lại.
4. Mọi mutation phải kiểm tra permission, data scope và `sysmodtime`.
5. Nghiệp vụ nhiều bảng, lịch sử, mail hoặc integration dùng custom action/domain layer.

## Màn hình tham chiếu

Sử dụng `ContractListDefinition.js` và domain `contracts` làm ví dụ chuẩn. Không copy
nguyên tên bảng/field/permission sang module mới; thay bằng DBDict và quyền đã xác minh.

Không có tài liệu “legacy” song song. Khi contract thay đổi, cập nhật trực tiếp file
đánh số tương ứng và các ví dụ kiểm thử liên quan.

