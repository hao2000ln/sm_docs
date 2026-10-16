---
id: export-and-background-jobs
title: Export và Background Jobs
sidebar_label: 07. Export & Background Jobs
sidebar_position: 7
description: Export V1 (trang hiện tại và toàn bộ query), khi nào dùng background job, metadata async, API job và cấu trúc bảng esdbackgroundJob.
---

# 07 — Export và Background Jobs

## Export V1

Nút export có hai phạm vi:

- **Trang hiện tại**: xuất ngay các cột đang hiển thị.
- **Toàn bộ kết quả hiện tại**: gọi `list` theo chunk, giữ search/filter/sort và data scope.

:::info Lưu ý
Không có filter/search thì query nền là `true`, nhưng backend vẫn áp dụng permission, `beforeList` và `dataPermission`. "Toàn bộ" không có nghĩa là bỏ qua quyền.
:::

V1 xuất CSV UTF-8 mở được bằng Excel, loại cột selection và chống CSV formula injection.
Client export query giới hạn 50.000 dòng; dữ liệu lớn hơn phải lọc hoặc chạy background.

## Khi nào dùng background job

- Import/export lớn.
- Update hàng trăm hoặc hàng nghìn record.
- Báo cáo, đồng bộ, email hàng loạt.
- Tác vụ có nguy cơ vượt timeout HTTP.

```text
UI enqueue → esdbackgroundJob → scheduler/worker → executor → progress/result
```

## Metadata async

```javascript
execution: {
  asyncEnabled: true,
  asyncThreshold: 500,
  maxAsyncItems: 20000,
  executorId: "contracts.export"
}
```

Executor ID chỉ nằm ở backend. Registry chỉ resolve executor `enabled` và `backgroundSafe`; không evaluate library/factory từ payload.

## API job

```text
POST /HPT_ScreenService/enqueueJob
GET  /HPT_ScreenService/getJobStatus?screenId=...&jobId=...
POST /HPT_ScreenService/cancelJob
```

Chỉ chủ sở hữu được xem/hủy job. Worker scheduler gọi:

```javascript
lib.HPT_JobWorker.runOnce("worker.contract.01");
lib.HPT_JobWorker.recover(300000, 100);
```

## Bảng `esdbackgroundJob`

| Field | Kiểu gợi ý | Ý nghĩa |
| --- | --- | --- |
| `id` | character | Next-number job key |
| `screen.id`, `action.id`, `executor.id` | character | Route đã allowlist |
| `requested.by`, `requested.at` | character, date/time | Chủ sở hữu và thời điểm tạo |
| `status` | character | `QUEUED`, `RUNNING`, `COMPLETED`, `PARTIAL_SUCCESS`, `FAILED`, `CANCELLED` |
| `total.items`, `processed.items` | number | Tổng số và tiến độ |
| `success.items`, `failed.items` | number | Kết quả |
| `progress.percent` | number | 0–100 |
| `result.file` | character | Download token, không phải arbitrary client path |
| `error.message` | character | Lỗi đã sanitize |
| `started.at`, `completed.at`, `heartbeat.at` | date/time | Lifecycle worker |

Index `id`, `status`, `requested.by`, `requested.at`.

:::warning Chưa production-ready
Phần còn lại trước production background export là executor tạo file, download token có kiểm tra owner, lịch sử tải và dọn file hết hạn. Không ghi arbitrary server path vào `result.file`.
:::
