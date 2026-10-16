# 03 — Dynamic Form Reference

Dynamic Form dùng `HPTModalPortal` để đưa popup và backdrop lên frame cao nhất cùng origin.
Component mới không tự append modal vào `document.body`; hãy gọi
`HPTModalPortal.open()`, append vào `surface.root` và gọi `surface.destroy(overlay)` khi đóng.
Phạm vi loading khi submit không do portal quyết định; cấu hình riêng bằng
`execution.maskScope` (`screen`, `framework` hoặc `none`) theo tài liệu phát triển Action.
Chiều cao popup lấy giá trị nhỏ hơn giữa `popup.maxHeight` và viewport; chỉ `.hpt-form-body`
cuộn nên tiêu đề và cụm nút hành động luôn còn nhìn thấy.

## Prefill dữ liệu khi cập nhật

Popup cập nhật có thể tải bản ghi mới nhất bằng `detail` và chỉ map các API
field được khai báo tường minh:

```javascript
popup: {
  prefill: { source: "detail", requireSingle: true },
  fields: [
    { name: "status", type: "lookup", option: "status", valueFrom: "status" },
    { name: "startDate", type: "date", valueFrom: "start_date" }
  ]
}
```

`valueFrom` phải là `fields[].api`, không dùng tên DBDict. Field chỉ phục vụ
detail có thể đặt `includeInList: false` để không tăng payload API list. Field
ghi nối lịch sử như `reason` nên bỏ `valueFrom` để popup luôn mở rỗng.

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

`money` định dạng dấu phân cách hàng nghìn ngay trong lúc nhập và vẫn gửi về
backend dưới dạng `number`; khi rời field, phần thập phân được chuẩn hóa theo `precision`.

Các operator điều kiện: `eq`, `neq`, `in`, `notIn`, `empty`, `notEmpty`.
Frontend điều khiển trải nghiệm; Batch Action Engine luôn validate lại điều
kiện, required, pattern và kiểu dữ liệu trước khi gọi domain handler.

Validation liên trường khai báo tại popup:

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

Remote lookup tìm kiếm và phân trang qua `getFilterOptions`; response cũ bị bỏ
qua nếu người dùng đã nhập từ khóa mới. Cache được phân tách theo screen,
option, parent value, từ khóa và trang.

`dirtyGuard` mặc định bật. Popup cảnh báo khi người dùng đóng form có thay đổi,
giữ focus trong dialog, trả focus về nút mở sau khi đóng và focus field lỗi đầu
tiên khi submit không hợp lệ.

Action có thể khai báo popup mà không cần viết HTML/JavaScript riêng:

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
      minLength: 1,
      maxLength: 1000,
      rows: 5,
      minHeight: 96,
      maxHeight: 180,
      resize: "vertical", // vertical | none
      showCounter: true,
      colSpan: 2      // chiếm toàn bộ hai cột
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
    },
    {
      name: "assignee",
      bind: "input",
      type: "lookup",
      label: "Người xử lý",
      option: "assignees"
    }
  ]
}
```

`colSpan` mặc định là `1` và không được lớn hơn `layout.columns`. Ví dụ với
`columns: 2`, hai field `colSpan: 1` đứng cùng một hàng; field `colSpan: 2` chiếm
toàn bộ hàng. Trên màn hình nhỏ hơn 640px, runtime tự chuyển popup về một cột.

## Input được hỗ trợ

- `text`, `textarea`
- `number`, `integer`
- `select`, `lookup`
- `checkbox`
- `date`, `datetime`

Validation hỗ trợ: `required`, `minLength`, `maxLength`, `min`, `max`, `multiple`.

Với `textarea`, có thể giới hạn giao diện bằng `rows` (1..20), `minHeight`
(60..600px), `maxHeight` (60..800px), `resize: "vertical" | "none"` và bật
`showCounter` để hiển thị số ký tự đã nhập trên `maxLength`. Runtime gán cả
thuộc tính HTML `maxlength`; backend vẫn phải kiểm tra lại giới hạn này.

## Lookup an toàn

`option` phải trỏ đến một key đã đăng ký trong backend `config.filterOptions`. Client không được truyền table, database field hoặc query. Runtime gọi `HPT_ScreenService/getFilterOptions` bằng `screenId + option`.

Field phụ thuộc khai báo như sau:

```javascript
{
  name: "district",
  type: "lookup",
  option: "districtsByProvince",
  dependsOn: "province",
  parentParameter: "parentId"
}
```

Field cha phải được khai báo trước field con. Khi field cha thay đổi, option của field con được tải lại. Kết quả lookup được cache ngắn hạn theo `option + parentValue`.

## Payload

Field `bind: "reason"` được đưa vào `body.reason`. Các field còn lại được đưa vào `body.input`.

Backend chỉ chấp nhận input đã khai báo trong popup, kiểm tra lại required/type/range/static option và từ chối field lạ. Remote lookup vẫn phải được handler nghiệp vụ kiểm tra lại theo quyền và trạng thái dữ liệu mới nhất.

## Kiểu input và kiểu lưu trữ SM

`popup.fields[].type` chỉ mô tả control giao diện. Nó không phải kiểu DBDict. Ví dụ
`textarea` tạo một chuỗi trong payload, nhưng có thể được append vào một field DBDict
`array` có phần tử `character`/SQL `TEXT`:

```javascript
batchActions: {
  updateReason: {
    operation: "update",
    requireReason: true,
    reasonMaxLength: 1000,
    writes: [{
      source: "reason",
      field: "reason",
      smType: "array",
      elementType: "character",
      writeMode: "append",
      maxItemLength: 1000,
      maxItems: 10000
    }]
  }
}
```

Các `smType` được generic adapter hỗ trợ:

| SM DBDict type | Giá trị API | Cách ghi |
| --- | --- | --- |
| `character`, `label` | string | `replace`, `clear` |
| `number` | number hoặc chuỗi số hợp lệ | `replace`, `clear` |
| `date/time` | ISO date/datetime | chuyển thành JavaScript `Date` rồi ghi |
| `logical` | boolean | `replace`, `clear` |
| `array` | scalar hoặc array | `append`, `replace`, `clear`; bắt buộc `elementType` |

`expression` và `record` không được generic-write vì thường ánh xạ cấu trúc/`bytea`.
Các kiểu này bắt buộc dùng `operation: "custom"` và handler nghiệp vụ riêng.

`writes`, tên field DBDict và loại lưu trữ chỉ tồn tại ở backend definition. Không đưa
chúng vào `screenPublic`, không nhận table/field/writeMode từ client. Field array/long text
không nên thêm vào `config.fields` của list nếu grid không sử dụng, để tránh tải dữ liệu
lớn ở mọi truy vấn danh sách.

Khi nghiệp vụ cần hiển thị array trên grid, chiếu nó thành một giá trị ngắn bằng
`HPT_SmFieldAdapter.readValue()`. Các chế độ gồm `last`, `first`, `join`, `all`;
grid lịch sử thường dùng `last`, còn `all` phù hợp hơn với endpoint chi tiết.
