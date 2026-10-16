# 06 — Selection và Batch Reference

## Backend enforcement cho điều kiện action

`enableIf` mặc định phục vụ UI/UX. Với action tiêu chuẩn cần backend thực thi lại cùng
điều kiện, khai báo:

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

Khi `enforceEnableIf=true`, Batch Engine:

- Kiểm tra lại `minSelected`/`maxSelected` trước khi mở handler.
- Đọc lại bản ghi theo `id + data scope`, kiểm tra `sysmodtime`, rồi mới đánh giá rule.
- Trả `ACTION_CONDITION_NOT_MET` cho bản ghi không còn đủ điều kiện.
- Chỉ hỗ trợ `records: "all"` và field trực tiếp trong `config.fields`; lookup/display
  field hoặc `records: "any"` phải được kiểm tra trong custom domain handler.

`visibleIf` không bao giờ là security rule. Authorization và business rule backend vẫn
là bắt buộc.

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

- `none`: ẩn cột chọn và không đưa `bulkActions` xuống trình duyệt. Có thể giữ nguyên khai báo `bulkActions` để bật lại sau.
- `single`: chỉ cho phép chọn một dòng bằng radio.
- `multiple`: cho phép chọn nhiều dòng và select-all theo trang.
- Với `none`, selection summary được ẩn; với `single`/`multiple`, trạng thái rỗng hiển thị `Chưa chọn bản ghi`.
- `select-all` chỉ chọn các dòng của trang hiện tại, không ngầm chọn toàn bộ kết quả truy vấn.
- Selection được giữ khi đổi trang, kích thước trang hoặc sort; được xóa khi search/filter đổi phạm vi dữ liệu.
- Mỗi item luôn gồm `id` và `sysmodtime` để backend kiểm tra optimistic locking.
- Khi đã chọn dữ liệu, nút `Xem danh sách` mở toàn bộ selection qua các trang và cho phép bỏ chọn từng dòng hoặc tất cả.

`mode` chỉ điều khiển UI. Muốn vô hiệu hóa batch API hoàn toàn vẫn phải đặt backend action `enabled: false` hoặc thu hồi quyền `batch:<actionId>`.

## Điều kiện action

`visibleIf` và `enableIf` dùng cùng một DSL khai báo, không hỗ trợ JavaScript expression/eval:

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

Operator hỗ trợ: `eq`, `neq`, `in`, `notIn`, `empty`, `notEmpty`. `field` bắt buộc là public field đã khai báo trong ScreenDefinition.

Điều kiện client chỉ điều khiển hiển thị/trạng thái nút. Backend action handler vẫn phải kiểm tra authorization, data scope và điều kiện nghiệp vụ trên dữ liệu mới nhất.

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
- `framework` gọi `cwc.maskWindow()` để khóa toàn bộ giao diện SM; nếu CWC không khả dụng thì tự động hạ xuống mask `screen`.
- `preventClose: true` đăng ký cảnh báo `beforeunload` trong thời gian request đang chạy.
- Runtime chụp cố định `id + sysmodtime` trước khi submit, khóa selection/nút action và luôn giải phóng mask ở cả nhánh thành công lẫn thất bại.
- Mask chỉ bảo vệ UX. Backend vẫn phải kiểm tra authorization, optimistic locking, idempotency và transaction.

## Batch request

Mọi request `batchAction` phải gửi header `Idempotency-Key` dài 16..128 ký tự an toàn.
Runtime tự sinh key cho mỗi lần submit. WebTier lưu kết quả theo session trong 10 phút:

- Cùng key, cùng payload: trả lại response cũ và header `Idempotency-Replayed: true`.
- Cùng key, khác payload: `IDEMPOTENCY_KEY_REUSED`.
- Request cũ vẫn đang chạy: `REQUEST_IN_PROGRESS`.

Cache thuộc session WebTier. Khi triển khai nhiều node phải dùng sticky/replicated
session hoặc thay bằng persistent/distributed idempotency store.

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

`input` là hợp đồng mở cho Dynamic Form ở Sprint 3. Hiện chỉ nhận tối đa 50 field có tên an toàn; value là scalar hoặc mảng scalar, không nhận object lồng nhau.

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

Backend thực thi theo `transactionMode: "perItem"`: mỗi bản ghi là một đơn vị
thành công/thất bại độc lập. `chunkSize` (1..100, mặc định 25) chia nhóm
xử lý và log; nó không biến nhiều record thành một transaction chung.

Action cập nhật/xóa đơn giản dùng `operation: "update"` hoặc `"delete"`. Nghiệp vụ
nhiều bảng, lịch sử hoặc integration dùng `operation: "custom"` với `handlerId`
được đăng ký backend; không viết function handler trực tiếp trong ScreenDefinition.
Xem [05_ACTION_DEVELOPMENT.md](05_ACTION_DEVELOPMENT.md).

## Batch chunk và transactionMode

Engine gom tối đa `chunkSize` ID thành một truy vấn `isin`, sau đó kiểm tra data
scope, `sysmodtime` và xử lý trực tiếp trên cursor của chunk. Không thực hiện lại
một `doSelect` riêng cho từng ID.

- `perItem`: mỗi dòng thành công/thất bại độc lập.
- `allValidated`: đọc và validate toàn bộ batch trước; nếu một dòng lỗi thì không
  bắt đầu phase ghi. Phase ghi vẫn kiểm tra lại `sysmodtime`.

`allValidated` là cơ chế best-effort, không phải transaction rollback. Không khai
báo là `allOrNothing` hoặc `atomic` khi backend SM chưa cung cấp transaction thật.

Kết quả lỗi từng dòng có `retryable`; xung đột có `conflict.sysmodtime` và có thể
có `conflict.updatedBy` khi backend metadata cho phép công khai trường người sửa.

## Message và toast

- Validation xảy ra hoàn toàn trên browser (ví dụ vượt `maxItems`) dùng toast không modal, tự đóng, có nút đóng và chống lặp message.
- Mọi màn hình gọi adapter dùng chung: `HPTMessage.info(...)`, `success(...)`, `warning(...)`, `error(...)`. Có thể truyền `{ root: "#hptScreenRoot", title: "Cảnh báo", duration: 4000 }`; `duration: 0` giữ thông báo cho đến khi người dùng đóng.
- Không dùng `cwc.showMessage()` cho cảnh báo ngắn: core triển khai hàm này bằng `Ext.Msg` modal và xếp các lần gọi tiếp theo vào `cwc.popupQueue`.
- `lib.ESD_Utils.printMsg(message, severity)` chạy trên App Server qua `rtecall("msg", ...)`, chỉ dùng trong RuleSet/ScriptLibrary nghiệp vụ. Không gọi API server chỉ để hiện cảnh báo selection phía client.
- Lỗi làm màn hình/danh sách không tải được hiển thị tại `screenError`; validation và kết quả/lỗi action dùng toast không chặn thao tác.
