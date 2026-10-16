---
id: screen-config-reference
title: Screen Configuration Reference
sidebar_label: 02. Screen Config Reference
sidebar_position: 2
description: Checklist nhân bản màn hình, version, fields, columns, lookup, search/sort/filter, selection, dynamic form và preset.
---

# 02 — Screen Configuration Reference

## Hai mức màn hình mẫu

- Mẫu tối thiểu để bắt đầu nhanh nằm trong [01 — Quick Start](./01-quick-start).
- Mẫu đầy đủ tham khảo cách ghép list, lookup, dynamic form, batch action, selector,
  optimistic lock và data scope là
  `app/scriptlibraries/screens/contracts/ContractListDefinition.js`.

Không sao chép nguyên cấu hình hợp đồng sang domain mới. File này minh họa cấu trúc và
cách liên kết metadata; các giá trị nghiệp vụ vẫn phải được thiết kế lại.

## Checklist khi nhân bản màn hình đầy đủ

1. Đổi `module`, `requestIdPrefix`, `table`, `keyField`, `screen.id` và `state.key`.
2. Khai báo lại `fields`; field chỉ dùng cho detail/search nên đặt `includeInList: false`.
3. Chỉ công khai đúng quyền cần dùng trong `actionPermissions`; mặc định bắt đầu bằng
   `allow: false`.
4. Đồng bộ từng UI action với `batchActions` hoặc `screenActions`, gồm `maxItems`,
   `transactionMode`, `handlerId` và điều kiện `enableIf`.
5. Thiết kế lại `dataPermission`; không đưa production với scope đang tắt nếu dữ liệu
   cần giới hạn theo đơn vị hoặc chủ sở hữu.
6. Nếu có update/delete, chọn lại các field tham gia optimistic lock và giữ
   `versionDependencies` đồng bộ với hàm tạo version token.
7. Chỉ dùng `endpoints` cho tích hợp legacy; màn hình generic không cần khai báo khối này.
8. Giữ `selection.debug: false`; chỉ bật tạm thời khi điều tra lỗi.
9. Tăng `definitionVersion` khi backend metadata đổi; tăng `screen.state.version` chỉ khi
   cần xóa trạng thái UI đã lưu của người dùng.
10. Chạy test definition/registry/batch và smoke test trên SM trước khi phát hành.

## Version

```javascript
schemaVersion: "1",                 // contract framework
definitionVersion: "2026.10.11.1", // revision publish
screen: {
  version: "1",                    // public UI contract
  state: { key: "AssetList", version: "1" } // tăng để reset UI state
}
```

## Fields và columns

`fields` là allowlist API ↔ DBDict. `screen.columns` chỉ tham chiếu `fields[].api` hoặc
field hiển thị do lookup tạo ra.

```javascript
fields: [
  { api: "status", db: "status", type: "string" },
  { api: "amount", db: "total.amount", type: "number", includeInList: false }
],
screen: { columns: [
  { field: "status_view", name: "status", title: "Trạng thái", renderer: "status",
    sourceField: "status", colorField: "status_color", backgroundField: "status_bgcolor" }
]}
```

Renderer: `text`, `lookup`, `status`, `datetime`, `recordLink`.

## Lookup theo lô

```javascript
lookups: [{
  sourceField: "status",
  table: "esdDMstatus",
  keyField: "status.en",
  outputs: [
    { targetField: "status_view", displayField: "status.vi", fallback: "source" },
    { targetField: "status_color", displayField: "color", fallback: "empty" }
  ]
}]
```

Engine gom key không trùng và dùng `isin`; không query tham chiếu riêng cho từng dòng.

## Search, sort và filter

```javascript
search: [{ db: "id", mode: "prefix" }, { db: "name", mode: "contains" }],
sortable: { id: "id", name: "name" },
filters: { statusValues: { db: "status", maxValues: 20, maxLength: 160 } }
```

Filter UI:

```javascript
screen: { filters: [{
  id: "status", type: "multiSelect", label: "Trạng thái",
  parameter: "statusValues", option: "status", multiple: true
}]}
```

Nguồn `filterOptions`: `defined`, `lookup`, `distinct`, `dependent`. Chỉ client parameter
được công khai; table, DBDict và query nằm ở backend.

## Selection

```javascript
selection: presets.selection("multiple", {
  maxItems: 20,
  retainAcrossPages: true,
  clearOnQueryChange: true
})
```

Mode: `none`, `single`, `multiple`. Mỗi action vẫn phải có giới hạn backend riêng.

## Dynamic form

```javascript
popup: {
  title: "Cập nhật",
  prefill: { source: "detail", requireSingle: true },
  layout: { columns: 2, columnGap: 14, rowGap: 14 },
  fields: [
    { name: "status", bind: "input", type: "lookup", option: "status",
      valueFrom: "status", label: "Trạng thái", colSpan: 1 },
    { name: "amount", bind: "input", type: "money", label: "Giá trị",
      min: 0, precision: 0, currency: "VND", colSpan: 1 },
    { name: "reason", bind: "reason", type: "textarea", label: "Lý do",
      maxLength: 1000, rows: 4, showCounter: true, colSpan: 2 }
  ]
}
```

Input: `text`, `textarea`, `number`, `integer`, `money`, `select`, `lookup`, `checkbox`,
`date`, `datetime`.

Điều kiện: `visibleIf`, `enableIf`, `requiredIf`; operator `eq`, `neq`, `in`, `notIn`,
`empty`, `notEmpty`. Validation: required, length, min/max, pattern và compare liên trường.
Backend luôn validate lại cùng metadata.

## Preset

- `presets.listDefaults(overrides)`
- `presets.selection(mode, overrides)`
- `presets.organizationCascadeFilter(overrides)`
- `presets.optimisticLockField(dependencies, overrides)`

Ví dụ khóa đồng thời không cần lặp thuật toán tạo token:

```javascript
presets.optimisticLockField([
  "sysmoduser", "status", "reason", "total.amount"
])
```

`dependencies` là tên field DBDict nghiệp vụ cần phát hiện thay đổi. Không thêm
`sysmodtime`; preset luôn đưa field version chính vào fingerprint.

Preset trả object mới; không sửa trực tiếp preset hoặc giữ definition ở biến top-level.

Chi tiết nâng cao: [04 — Dynamic Form Reference](./04-dynamic-form-reference) và
[06 — Selection và Batch Reference](./06-selection-and-batch-reference).
