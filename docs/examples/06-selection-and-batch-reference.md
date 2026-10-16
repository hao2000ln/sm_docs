---
id: selection-and-batch-reference
title: Selection và Batch Reference
sidebar_label: 06. Selection & Batch
sidebar_position: 6
description: Selection metadata, điều kiện action (enableIf/enforceEnableIf), mask khi thực thi, idempotency, batch request/response và transactionMode.
---

# 06 — Selection và Batch Reference

## Backend enforcement cho điều kiện action

`enableIf` mặc định phục vụ UI/UX. Với action tiêu chuẩn cần backend thực thi lại cùng điều kiện, khai báo:

```javascript
screen: {
  bulkActions: [{
    id: "confirm",
    enableIf: {
      minSelected: 1,
      maxSelected: 20,
      records: "all",
      rules: [{ field: "status", operator: "in", values: ["DRAFT", "RETURNED"] }]
    }
  }]
},
batchActions: {
  confirm: {
    operation: "custom",
    handlerId: "contracts.confirm",
    enforceEnableIf: true,
    maxItems: 20
  }
}
```

Khi `enforceEnableIf=true`, Batch Engine kiểm tra lại `minSelected`/`maxSelected`, đọc lại bản ghi theo `id + data scope`, kiểm tra `sysmodtime` rồi đánh giá rule. `visibleIf` không bao giờ là security rule.

## Selection metadata

```javascript
selection: {
  mode: "multiple",          // none | single | multiple
  maxItems: 100,
  retainAcrossPages: true,
  clearOnQueryChange: true,
  debug: false
}
```

- `none`: ẩn cột chọn và không đưa `bulkActions` xuống trình duyệt.
- `single`: chỉ cho phép chọn một dòng bằng radio.
- `multiple`: cho phép chọn nhiều dòng và select-all theo trang.
- `select-all` chỉ chọn các dòng của trang hiện tại, không ngầm chọn toàn bộ kết quả truy vấn.
- Mỗi item luôn gồm `id` và `sysmodtime` để backend kiểm tra optimistic locking.

## Điều kiện action

```javascript
enableIf: {
  minSelected: 1,
  maxSelected: 20,
  records: "all", // all | any
  rules: [
    { field: "status", operator: "in", values: ["DRAFT", "RETURNED"] }
  ]
}
```

Operator hỗ trợ: `eq`, `neq`, `in`, `notIn`, `empty`, `notEmpty`.

## Mask khi thực thi action

```javascript
execution: {
  maskScope: "framework", // none | dialog | screen | framework
  maskMessage: "Đang cập nhật dữ liệu...",
  preventClose: true,
  preventDuplicate: true
}
```

- `screen` là mặc định cho batch action và chỉ khóa iframe hiện tại.
- `framework` gọi `cwc.maskWindow()` để khóa toàn bộ giao diện SM.
- `preventClose: true` đăng ký cảnh báo `beforeunload` trong thời gian request đang chạy.

## Batch request

Mọi request `batchAction` phải gửi header `Idempotency-Key` dài 16..128 ký tự an toàn.

```json
{
  "screenId": "contracts",
  "actionId": "updateReason",
  "items": [
    { "id": "HD001", "sysmodtime": "2026-10-07T08:00:00Z" }
  ],
  "input": {},
  "reason": "Nội dung lý do"
}
```

## Batch response

```json
{
  "success": true,
  "apiVersion": "1",
  "screenId": "contracts",
  "actionId": "updateReason",
  "requestId": "BATCH-...",
  "summary": { "total": 2, "succeeded": 1, "failed": 1 },
  "results": [
    { "id": "HD001", "success": true, "message": "Thành công" },
    {
      "id": "HD002",
      "success": false,
      "code": "RECORD_MODIFIED_CONCURRENTLY",
      "message": "Bản ghi đã được người khác thay đổi"
    }
  ]
}
```

Client bỏ chọn dòng thành công và giữ selection của dòng thất bại để xử lý tiếp.

## Batch chunk và transactionMode

- `perItem`: mỗi dòng thành công/thất bại độc lập.
- `allValidated`: đọc và validate toàn bộ batch trước; nếu một dòng lỗi thì không bắt đầu phase ghi.

`allValidated` là cơ chế best-effort, không phải transaction rollback.

## Message và toast

- Validation phía browser dùng toast không modal, tự đóng, có nút đóng và chống lặp message.
- Dùng adapter dùng chung: `HPTMessage.info(...)`, `success(...)`, `warning(...)`, `error(...)`.
- Không dùng `cwc.showMessage()` cho cảnh báo ngắn (core dùng `Ext.Msg` modal).

Xem thêm: [05 — Action Development](./05-action-development).
