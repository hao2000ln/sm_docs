# 05 — Export và Background Jobs

## Export V1

Nút export có hai phạm vi:

- **Trang hiện tại**: xuất ngay các cột đang hiển thị.
- **Toàn bộ kết quả hiện tại**: gọi `list` theo chunk, giữ search/filter/sort và data scope.

Không có filter/search thì query nền là `true`, nhưng backend vẫn áp dụng permission,
`beforeList` và `dataPermission`. “Toàn bộ” không có nghĩa là bỏ qua quyền.

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

Executor ID chỉ nằm ở backend. Registry chỉ resolve executor `enabled` và
`backgroundSafe`; không evaluate library/factory từ payload.

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
| `payload` | large character | Payload do server tạo |
| `result.file` | character | Download token, không phải arbitrary client path |
| `result.summary` | large character | JSON kết quả đã giới hạn; dùng phục hồi/tải kết quả import |
| `error.code` | character | Mã lỗi ổn định để vận hành và thống kê |
| `error.message` | character | Lỗi đã sanitize |
| `started.at`, `completed.at`, `heartbeat.at` | date/time | Lifecycle worker |

Index `id`, `status`, `requested.by`, `requested.at`.

## Vận hành job import

- Runtime giữ Job ID theo `screenId` trong `localStorage` và gọi lại `getJobStatus` sau reload.
- Chỉ chủ sở hữu job được xem/hủy/kéo lại kết quả.
- Trước khi thực thi, worker resolve lại screen và từ chối nếu action bị tắt, permission không còn `allow`, async bị tắt hoặc executor ID thay đổi.
- Quyền/data scope phụ thuộc người dùng phải được domain executor kiểm tra lại theo `requested.by`; worker scheduler không có browser session của người tạo.
- Kết quả từng dòng được lưu gọn trong `result.summary`; thành công không lưu message dài để giữ kích thước có giới hạn.

Khuyến nghị scheduler:

```javascript
// Chạy thường xuyên, mỗi lần claim tối đa một job.
lib.HPT_JobWorker.runOnce("worker.contract.01");

// Job mất heartbeat 5 phút được recovery, quét tối đa 100 job/lần.
lib.HPT_JobWorker.recover(300000, 100);
```

## Trạng thái V1

Hạ tầng queue, claim, heartbeat, cancel, retry/recovery và popup tiến độ đã có. Phần còn
lại trước production background export là executor tạo file, download token có kiểm tra
owner, lịch sử tải và dọn file hết hạn. Không ghi arbitrary server path vào `result.file`.


