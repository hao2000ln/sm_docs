---
id: dynamic-form-reference
title: Dynamic Form Reference
sidebar_label: 04. Dynamic Form
sidebar_position: 4
description: Prefill, money input, điều kiện visibleIf/requiredIf, validation liên trường, lookup remote, payload và danh sách input type được hỗ trợ.
---

# 04 — Dynamic Form Reference

Dynamic Form dùng `HPTModalPortal` để đưa popup và backdrop lên frame cao nhất cùng origin.
Phạm vi loading khi submit cấu hình riêng bằng `execution.maskScope` (`screen`, `framework` hoặc `none`).
Chiều cao popup lấy giá trị nhỏ hơn giữa `popup.maxHeight` và viewport; chỉ `.hpt-form-body`
cuộn nên tiêu đề và cụm nút hành động luôn còn nhìn thấy.

## Prefill dữ liệu khi cập nhật

```javascript
popup: {
  prefill: { source: "detail", requireSingle: true },
  fields: [
    { name: "status", type: "lookup", option: "status", valueFrom: "status" },
    { name: "startDate", type: "date", valueFrom: "start_date" }
  ]
}
```

`valueFrom` phải là `fields[].api`, không dùng tên DBDict. Field ghi nối lịch sử như `reason` nên bỏ `valueFrom` để popup luôn mở rỗng.

## Money, điều kiện và validation

```javascript
{
  name: "amount", type: "money", min: 0,
  precision: 0, currency: "VND", thousandSeparator: ","
},
{
  name: "reason", type: "textarea",
  visibleIf: { field: "status", operator: "eq", value: "REJECTED" },
  requiredIf: { field: "status", operator: "eq", value: "REJECTED" },
  clearWhenHidden: true
},
{
  name: "contractNo", type: "text",
  pattern: "^[A-Z0-9-]+$",
  patternMessage: "Số hợp đồng không đúng định dạng"
}
```

Các operator điều kiện: `eq`, `neq`, `in`, `notIn`, `empty`, `notEmpty`.
Frontend điều khiển trải nghiệm; Batch Action Engine luôn validate lại trước khi gọi domain handler.

Validation liên trường:

```javascript
validators: [{
  type: "compare",
  left: "endDate",
  operator: "gte",
  right: "startDate",
  message: "Ngày kết thúc phải từ ngày bắt đầu trở đi"
}]
```

Operator so sánh: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`.

## Lookup remote

```javascript
{
  name: "assignee", type: "lookup", option: "contacts",
  lookupMode: "remote", minSearchLength: 2,
  debounce: 300, pageSize: 20, cacheTtl: 300000
}
```

Remote lookup tìm kiếm và phân trang qua `getFilterOptions`; response cũ bị bỏ qua nếu người dùng đã nhập từ khóa mới.

## Cấu hình popup đầy đủ

```javascript
popup: {
  title: "Cập nhật hợp đồng",
  width: 560,
  height: 0, // 0 = auto
  minWidth: 360,
  maxWidth: 900,
  minHeight: 0,
  maxHeight: 760,
  submitLabel: "Xác nhận",
  cancelLabel: "Hủy",
  layout: {
    columns: 2,       // 1..4
    columnGap: 14,    // 0..40 px
    rowGap: 14        // 0..40 px
  },
  fields: [
    {
      name: "reason",
      bind: "reason",       // reason | input
      type: "textarea",
      label: "Lý do",
      required: true,
      maxLength: 1000,
      rows: 5,
      showCounter: true,
      colSpan: 2
    },
    {
      name: "priority",
      bind: "input",
      type: "select",
      label: "Độ ưu tiên",
      required: true,
      options: [
        { value: "high", label: "Cao" },
        { value: "normal", label: "Bình thường" }
      ]
    }
  ]
}
```

## Input được hỗ trợ

- `text`, `textarea`
- `number`, `integer`
- `money`
- `select`, `lookup`
- `checkbox`
- `date`, `datetime`

## Lookup an toàn

`option` phải trỏ đến một key đã đăng ký trong backend `config.filterOptions`. Client không được truyền table, database field hoặc query.

Field phụ thuộc:

```javascript
{
  name: "district",
  type: "lookup",
  option: "districtsByProvince",
  dependsOn: "province",
  parentParameter: "parentId"
}
```

## Payload

Field `bind: "reason"` được đưa vào `body.reason`. Các field còn lại được đưa vào `body.input`.
Backend chỉ chấp nhận input đã khai báo trong popup và từ chối field lạ.

## Kiểu input và kiểu lưu trữ SM

| SM DBDict type | Giá trị API | Cách ghi |
| --- | --- | --- |
| `character`, `label` | string | `replace`, `clear` |
| `number` | number hoặc chuỗi số hợp lệ | `replace`, `clear` |
| `date/time` | ISO date/datetime | chuyển thành JavaScript `Date` rồi ghi |
| `logical` | boolean | `replace`, `clear` |
| `array` | scalar hoặc array | `append`, `replace`, `clear`; bắt buộc `elementType` |

`expression` và `record` bắt buộc dùng `operation: "custom"` và handler nghiệp vụ riêng.
