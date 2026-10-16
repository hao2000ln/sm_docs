---
id: common-api-readme
title: Common API V1 — Tổng quan
sidebar_label: 00. Tổng quan & Thứ tự đọc
sidebar_position: 0
description: Phạm vi chức năng, thứ tự đọc chuẩn và mô hình kiến trúc của Common API V1 Framework.
---

# 00 — Common API V1 Documentation

## Phạm vi chức năng hiện tại

`api_v1` hiện cung cấp các khả năng chính sau:

- Dựng màn hình danh sách từ metadata và tái sử dụng cho nhiều module.
- Danh sách phân trang phía server; tìm kiếm cơ bản và sắp xếp theo field được allowlist.
- Bộ lọc đơn, đa lựa chọn, khoảng ngày và bộ lọc đơn vị phân cấp.
- Lookup dữ liệu tham chiếu theo lô; renderer cho text, trạng thái, ngày giờ và record link.
- Ẩn/hiện cột, lưu trạng thái giao diện và lựa chọn một hoặc nhiều bản ghi qua các trang.
- Xem chi tiết; tạo popup nhập liệu, validation và prefill bằng Dynamic Form.
- CRUD, bulk action và screen action; hỗ trợ custom handler theo domain.
- Optimistic lock để phát hiện bản ghi đã bị người khác cập nhật.
- Cảnh báo theo dòng, thống kê số lỗi, toast/message và loading dùng chung.
- Xuất Excel trang hiện tại; xuất toàn bộ theo search/filter bằng background job.
- Nhập Excel `.xlsx` theo metadata: tải mẫu, pre-check theo batch, xem trước, file kết quả và background job cho file lớn.
- Theo dõi tiến độ, kết quả và tải file của background job.
- Dashboard KPI, thống kê và biểu đồ cơ bản.
- Permission theo endpoint/action, data scope, chuẩn hóa response/error/request ID.
- Idempotency và chống gửi action trùng.
- Escape hatch qua custom hook, component, renderer và action.
- Gọi `ScriptLibrary.function` qua Common API với session và chính sách allowlist cấu hình được.
- Branding/theme dùng chung qua CSS token.

Các khả năng trên chỉ hoạt động khi được khai báo trong `ScreenDefinition` và được backend
cho phép; client không được tự truyền table, DBDict field, handler hoặc raw query.

Đây là điểm bắt đầu duy nhất của bộ tài liệu. Framework dựng màn hình danh sách từ
metadata backend, còn nghiệp vụ đặc thù được tách theo domain.

## Thứ tự đọc chuẩn

| STT | Tài liệu | Khi nào đọc |
| --- | --- | --- |
| 01 | [Quick Start](./quick-start) | Tạo màn hình đầu tiên |
| 02 | [Screen Config](./screen-config-reference) | Tra cứu cấu hình list |
| 03 | [Filter và Lookup](./filter-and-lookup-reference) | Danh mục, mapping, filter phân cấp |
| 04 | [Dynamic Form](./dynamic-form-reference) | Popup, input, validation, prefill |
| 05 | [Action Development](./action-development) | CRUD và nghiệp vụ đặc thù |
| 06 | [Selection và Batch](./selection-and-batch-reference) | Chọn dòng, batch, conflict, retry |
| 07 | [Export và Background Job](./export-and-background-jobs) | Export/query/tác vụ lớn |
| 08 | [Security](./security) | Permission và data scope |
| 09 | [Operations và Release](./operations-and-release) | Publish, cache, smoke test |
| 10 | [API Response](./api-response-reference) | Response/error code |
| 11 | [ScriptLibrary API](./script-library-api-configuration) | Công bố và test `ScriptLibrary.function` qua Common API |
| 12 | [WebTier/Form custom](./webtier-form-custom-configuration) | Button ID định dạng tiền, chữ số và datetime không giây |
| 13 | [Excel Import](./excel-import) | Khai báo và kiểm thử import Excel cơ bản theo metadata |

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

Không có tài liệu "legacy" song song. Khi contract thay đổi, cập nhật trực tiếp file
đánh số tương ứng và các ví dụ kiểm thử liên quan.
