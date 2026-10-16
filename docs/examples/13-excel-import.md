---
id: excel-import
title: Excel Import
sidebar_label: 13. Excel Import
sidebar_position: 13
description: Luồng import .xlsx theo metadata (giai đoạn 1 và 2), UI/UX chuẩn, khai báo ScreenDefinition, permission backend, smoke test và hướng nâng cấp.
---

# 13 — Excel Import

## Phạm vi

Giai đoạn 1 cung cấp luồng import `.xlsx` cơ bản và tái sử dụng được:

1. Tải file mẫu sinh từ metadata.
2. Chọn một file `.xlsx` có đúng một sheet.
3. Kiểm tra tên cột, kiểu dữ liệu, trường bắt buộc, độ dài và giới hạn số dòng.
4. Xem trước tối đa 100 dòng và lỗi tương ứng.
5. Chỉ gửi các dòng hợp lệ lên backend theo từng chunk.
6. Backend kiểm tra lại dữ liệu và trả kết quả thành công/thất bại theo từng dòng.

Chưa hỗ trợ `.xls`, nhiều sheet, công thức, mapping cột thủ công và rollback toàn file.

## Giai đoạn 2 (Roadmap)

- Phát hiện giá trị trùng trong toàn file qua thuộc tính `unique`.
- Pre-check lookup và business key trong database theo batch trước khi ghi.
- Backend hỗ trợ `importMode: "validate"` và không tạo bản ghi ở chế độ này.
- Tự động chuyển sang background job khi đạt ngưỡng cấu hình.
- Theo dõi tiến độ, số dòng thành công/thất bại và hủy job.

## UI/UX chuẩn

Popup import sử dụng ba trạng thái: **Chọn file → Kiểm tra → Kết quả**.

- Bước chọn file có card tải file mẫu, vùng bấm/kéo-thả và các giới hạn lấy trực tiếp từ metadata.
- Popup dùng `HPTModalPortal` chung với Dynamic Form; backdrop phủ frame cao nhất cùng origin.
- Thống kê riêng tổng số, hợp lệ và có lỗi.
- Preview tối đa 100 dòng; ô sai được đánh dấu trực tiếp.
- Không cho đóng popup trong lúc request ghi dữ liệu đang chạy.
- Sau import trực tiếp, nút chính đổi thành **Đóng và làm mới** và xuất hiện nút tải kết quả.
- **Tải file lỗi** chỉ xuất các dòng `FAILED`/`NOT_IMPORTED`.
- **Tải file kết quả** xuất toàn bộ dòng cùng dòng nguồn, trạng thái, mã lỗi và Record ID.
- Mask dùng scope `framework` để khóa frame WebTier lớn nhất trong lúc ghi trực tiếp.

## Khai báo trên ScreenDefinition

```javascript
{
  id: "importContracts",
  type: "import",
  label: "Nhập Excel",
  enabled: true,
  confirm: true,
  confirmMessage: "Bạn có chắc chắn muốn nhập các hợp đồng hợp lệ trong file Excel vào hệ thống?",
  execution: {
    maskScope: "framework",
    maskMessage: "Đang nhập dữ liệu hợp đồng...",
    preventClose: true,
    preventDuplicate: true
  },
  import: {
    title: "Nhập dữ liệu Hợp đồng (Import Excel)",
    maxHeight: 760,
    templateName: "mau-import-hop-dong.xlsx",
    sheetName: "Contracts",
    maxRows: 500,
    maxFileSize: 10485760,
    chunkSize: 50,
    invalidRowPolicy: "skip",
    precheck: true,
    resultFile: true,
    columns: [
      {
        field: "contract_no",
        header: "Số hợp đồng",
        type: "string",
        required: true,
        unique: true,
        maxLength: 500,
        example: "HD-2026-001"
      },
      {
        field: "status",
        header: "Trạng thái",
        type: "string",
        required: true,
        maxLength: 255,
        example: "inprogress"
      },
      {
        field: "start_date",
        header: "Ngày bắt đầu",
        type: "date",
        required: false,
        example: "15/10/2026"
      },
      {
        field: "contract_value_total",
        header: "Tổng giá trị hợp đồng",
        type: "number",
        required: false,
        min: 0,
        example: "150000000"
      }
    ]
  },
  order: 45
}
```

Mỗi `field` phải tồn tại trong `definition.fields`. Trình duyệt không được gửi tên bảng, DBDict field hoặc handler.

Giá trị `invalidRowPolicy`:
- `skip`: cho phép nhập các dòng hợp lệ và bỏ qua dòng lỗi.
- `rejectAll`: khóa nút nhập nếu file còn bất kỳ dòng lỗi nào.

## Permission và backend action

```javascript
actionPermissions: {
  "screen:importContracts": { allow: true }
},
screenActions: {
  importContracts: {
    enabled: true,
    operation: "custom",
    handlerId: "contracts.importContracts",
    execution: {
      asyncEnabled: true,
      asyncThreshold: 200,
      maxAsyncItems: 500,
      executorId: "contracts.importContractsJob"
    }
  }
}
```

Frontend gửi dữ liệu mỗi chunk dưới dạng mảng song song:

```json
{
  "screenId": "contracts",
  "actionId": "importContracts",
  "input": {
    "rowNumbers": [2, 3],
    "contract_no": ["HD-2026-001", "HD-2026-002"],
    "status": ["inprogress", "inprogress"],
    "start_date": ["15/10/2026", "16/10/2026"],
    "contract_value_total": [150000000, 200000000]
  }
}
```

## Quy tắc backend bắt buộc

- Không tin validation từ trình duyệt.
- Kiểm tra lại số lượng và độ dài tất cả mảng.
- Kiểm tra quyền `screen:<actionId>`.
- Kiểm tra danh mục/lookup như trạng thái; kiểm tra ngày hợp lệ và số không âm.
- Kiểm tra trùng dữ liệu theo business key trước khi tạo.
- Chỉ Repository được biết tên bảng và DBDict field.
- Trả `relatedResults` có `rowNumber`, `success`, `code`, `message` và `recordId`.

## Smoke test

1. Publish các ScriptLibrary đã thay đổi và hard refresh trình duyệt.
2. Mở màn hình danh sách hợp đồng, chọn **Nhập Excel**.
3. Tải file mẫu, giữ nguyên dòng ví dụ và chọn lại file.
4. Xác nhận preview hiển thị một dòng hợp lệ.
5. Nhập dữ liệu và kiểm tra bản ghi mới xuất hiện sau khi đóng popup.
6. Thử lại cùng `Số hợp đồng`; dòng phải thất bại do trùng nhưng các dòng khác vẫn được xử lý.
7. Thử ngày `31/02/2026`, trạng thái không tồn tại, giá trị âm và file trên 500 dòng.
8. Dùng file có từ 200 dòng hợp lệ; hệ thống phải tạo job và hiển thị tiến độ.

:::info Lưu ý
Import nền chỉ chạy khi scheduler đang gọi `HPT_JobWorker.runOnce(workerId)`. Nếu scheduler chưa cấu hình, job vẫn ở trạng thái `QUEUED` và không có dữ liệu nào được ghi.
:::

## Hướng nâng cấp tiếp theo

- Mapping cột và nhiều sheet.
- Chế độ dry-run, tải file kết quả và retry dòng lỗi.
- Lưu file kết quả của background job bằng download token có thời hạn.
- Transaction/rollback theo chính sách của từng domain.
