# 10 — API Response và Error Contract

Mọi endpoint `HPT_ScreenService` trả JSON có `success` và `requestId`.

Riêng mutation `batchAction` bắt buộc có `Idempotency-Key`. Các lỗi
`INVALID_IDEMPOTENCY_KEY`, `IDEMPOTENCY_KEY_REUSED`, `REQUEST_IN_PROGRESS` và
`IDEMPOTENCY_CAPACITY_EXCEEDED`
được WebTier trả trước khi gọi ScriptLibrary.

## Thành công

```json
{
  "success": true,
  "requestId": "SCREEN-...",
  "data": []
}
```

Các thuộc tính theo nghiệp vụ như `screen`, `defaults`, `page`, `limit`, `total`,
`count`, `summary` hoặc `results` được đặt cùng cấp để giữ tương thích với runtime v1.

## Thất bại

```json
{
  "success": false,
  "code": "INVALID_FIELD",
  "message": "Dữ liệu không hợp lệ",
  "field": "page",
  "requestId": "SCREEN-..."
}
```

Không trả stack trace, câu query, table, DBDict field hoặc exception nội bộ cho client.
Dùng `requestId` để đối chiếu structured log phía server.

## Nhóm mã lỗi và HTTP status

| Nhóm | Ví dụ | HTTP |
| --- | --- | --- |
| Request không hợp lệ | `MISSING_SCREEN_ID`, `INVALID_FIELD` | 400 |
| Không có quyền | `FORBIDDEN` | 403 |
| Không tồn tại | `SCREEN_NOT_FOUND`, `NOT_FOUND` | 404 |
| Xung đột dữ liệu | `DUPLICATE_KEY`, `RECORD_MODIFIED_CONCURRENTLY` | 409 |
| Thành phần chưa sẵn sàng | `SCREEN_CONFIG_UNAVAILABLE`, `OPERATION_UNAVAILABLE` | 503 |
| Lỗi backend/cấu hình | `QUERY_ERROR`, `INVALID_SCREEN_DEFINITION`, `INTERNAL_SERVICE_ERROR` | 500 |

WebTier chỉ ánh xạ mã lỗi ổn định sang HTTP status. Nội dung quyền, data scope và
nghiệp vụ vẫn được quyết định ở App Server.
