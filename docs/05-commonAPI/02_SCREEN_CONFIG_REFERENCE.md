# 02 — Screen Configuration Reference

## Hai mức màn hình mẫu

- Mẫu tối thiểu để bắt đầu nhanh nằm trong [01_QUICK_START.md](01_QUICK_START.md).
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

## Thứ tự chuẩn trong `getDefinition()`

Tài liệu và file definition mẫu dùng cùng một thứ tự để dễ đọc, review và nhân bản:

| Thứ tự | Khối | Nội dung chính |
| ---: | --- | --- |
| 1 | `IDENTITY` | Version, module, bảng nguồn, khóa và version field. |
| 2 | `DATA CONTRACT` | `fields` và `lookups`. |
| 3 | `QUERY CONTRACT` | `filters`, `filterOptions`, `search`, `sortable`, `defaults`. |
| 4 | `SECURITY` | `actionPermissions` và `dataPermission`. |
| 5 | `PUBLIC UI` | `screen`, state, columns, filters, selection và action UI. |
| 6 | `BACKEND ACTIONS` | `batchActions` và `screenActions`. |
| 7 | `LEGACY VÀ RESPONSE` | Endpoint cũ (nếu còn dùng) và thông báo nghiệp vụ mặc định. |

Preset và các cấu hình UI chuyên sâu được đặt ở phụ lục hoặc tài liệu riêng; chúng
không làm thay đổi thứ tự các khối chính trên.

## 1. IDENTITY — version và định danh nguồn dữ liệu

Đây là khối đầu tiên trong `getDefinition()`. Nó định danh metadata đang chạy,
bảng Service Manager được phép truy cập và khóa dùng chung cho list/detail/action.
Không lấy giá trị từ request client cho bất kỳ thuộc tính nào trong khối này.

```javascript
// ===== 1. IDENTITY: version và định danh nguồn dữ liệu =====
schemaVersion: "1",
definitionVersion: "2026.10.16.2",
module: "HPT_ContractList",
requestIdPrefix: "HD",
table: "esdHDcontract",
keyField: "id",
versionField: "sysmodtime",
keyQueryParam: "id",
```

| Thuộc tính | Ý nghĩa | Cách chọn khi tạo màn hình mới | Lưu ý |
| --- | --- | --- | --- |
| `schemaVersion` | Phiên bản contract của framework đọc ScreenDefinition. | Giữ đúng `"1"`. | Hiện core chỉ hỗ trợ schema `1`; không dùng để đánh version nghiệp vụ. |
| `definitionVersion` | Revision của toàn bộ metadata màn hình. Được trả về UI config để truy vết bản metadata đã publish. | Tăng mỗi khi sửa definition, ví dụ `2026.10.16.1` → `2026.10.16.2`. | Chuỗi tối đa 40 ký tự, chỉ dùng chữ/số/`.`/`_`/`-`. Không tự reset state UI. |
| `module` | Tên module xuất hiện trong request context, log và audit. | Dùng tên ổn định, ví dụ `HPT_AssetList`, `HPT_PurchaseRequestList`. | Không phải `screen.id`, không phải tên bảng và không phải giá trị client gửi lên. |
| `requestIdPrefix` | Tiền tố fallback khi framework tự sinh request ID. | Dùng mã ngắn, dễ truy vết theo domain: `HD`, `TS`, `PR`, `EML`. | Chỉ phục vụ log/correlation; không phải khóa database hay cơ chế phân quyền. |
| `table` | Tên SCFile/DBDict nguồn mà CatalogEngine được phép đọc/ghi. | Dùng chính xác tên bảng SM, ví dụ `esdAsset`. | Chỉ backend definition được khai báo; client không bao giờ gửi table. Tên phải an toàn theo quy tắc DBDict. |
| `keyField` | Tên **API field** dùng làm khóa định danh một dòng. | Khai báo field trong `fields[]` trước, rồi trỏ tới `fields[].api`, ví dụ `asset_id`. | Không ghi tên DBDict tại đây. Giá trị phải ổn định, duy nhất và đủ để detail/action xác định bản ghi. |
| `versionField` | Tên **API field** mang version/token optimistic lock của bản ghi. | Thường dùng `sysmodtime`; nếu có token tổng hợp thì field này dùng `versionTransform`. | Bắt buộc với màn hình có selection. Field phải có trong `fields[]`, được trả về list và gửi lại khi update/delete/batch action. |
| `keyQueryParam` | Tên parameter public cho API detail/legacy khi nhận khóa bản ghi. | Giữ giống `keyField` nếu không cần alias; chỉ đặt alias khi contract public cần camelCase, ví dụ `keyField: "log_id"`, `keyQueryParam: "logId"`. | Engine dùng `keyField` nếu không khai báo. Đây là tên parameter API, không phải DBDict field. |

### Quan hệ giữa API field và DBDict field

`keyField` và `versionField` luôn tham chiếu **tên API** trong `fields[]`; mapping sang DBDict nằm riêng tại `db`.

```javascript
table: "esdAsset",
keyField: "asset_id",
versionField: "sysmodtime",
keyQueryParam: "assetId",

fields: [
  { api: "asset_id", db: "asset.id", type: "string" },
  { api: "sysmodtime", db: "sysmodtime", type: "datetime" }
]
```

Trong ví dụ trên:

- API/list/action dùng `asset_id` và `sysmodtime`.
- SCFile chỉ được framework truy cập qua `asset.id` và `sysmodtime`.
- Detail API nhận `assetId=...`, sau đó engine dùng mapping của `keyField` để tạo filter `asset.id="..."`.

### Cách khai báo cho một màn hình mới

1. Xác định bảng SM và business key thật sự duy nhất.
2. Tạo `fields[]` cho khóa và version trước.
3. Gán `keyField`/`versionField` bằng `api` tương ứng, không dùng tên DBDict.
4. Chọn `module` và `requestIdPrefix` ổn định để log dễ tra cứu.
5. Tăng `definitionVersion` mỗi lần thay metadata; chỉ tăng `screen.state.version` khi cần xóa state UI cũ của người dùng.

### Lỗi thường gặp

| Sai | Hậu quả | Cách đúng |
| --- | --- | --- |
| `keyField: "asset.id"` | Definition bị từ chối hoặc engine không tìm thấy API field. | `keyField: "asset_id"`; mapping DBDict ở `fields[].db`. |
| Không khai báo `versionField` cho màn hình có checkbox/selection. | Definition không hợp lệ; không thể bảo vệ update/delete khỏi ghi đè. | Khai báo API field version và đưa vào list. |
| Tăng `screen.state.version` khi chỉ sửa title/column. | Người dùng mất column/filter state không cần thiết. | Chỉ tăng `definitionVersion`. |
| Dùng `requestIdPrefix` làm mã chứng từ hoặc key business. | Log khó đọc và nhầm lẫn trách nhiệm. | Chỉ dùng prefix ngắn cho request trace. |
| Đổi `table` theo parameter UI. | Tạo lỗ hổng truy cập dữ liệu. | `table` cố định trong ScriptLibrary backend. |

## 2. DATA CONTRACT — fields và DBDict

`fields` là allowlist ánh xạ tên public của API sang field thật trong DBDict.
Client chỉ sử dụng `api`; tên `db` luôn do definition backend quyết định.

### Ví dụ đầy đủ với field ngày giờ

```javascript
fields: [
  {
    // Tên public dùng trong request/response API.
    api: "start_date",

    // Tên field thật trong DBDict Service Manager.
    db: "start.date",

    // Ngày và giờ; dùng "date" nếu chỉ có ngày.
    type: "datetime",

    // Không đọc và không trả field này trong API list.
    // API detail vẫn có thể trả field để prefill form cập nhật.
    includeInList: false,

    // Chuyển kiểu date/time đặc thù của SM thành chuỗi trước khi trả JSON.
    readTransform: function (value) {
      if (value === undefined || value === null) return "";
      return funcs.str(value);
    }
  }
]
```

### Thuộc tính của một field

| Thuộc tính | Bắt buộc | Kiểu | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- | --- |
| `api` | Có | `string` | Không có | Tên public trong request/response. Phải duy nhất trong `fields[]`. |
| `db` | Có | `string` | Không có | Tên field thật trong DBDict Service Manager. |
| `type` | Không | `string` | `"string"` | Kiểu dữ liệu API: `string`, `integer`, `number`, `boolean`, `date` hoặc `datetime`. |
| `includeInList` | Không | `boolean` | `true` | Có đọc và trả field trong API danh sách hay không. |
| `readTransform` | Không | `function` | Giữ nguyên giá trị | Chuẩn hóa giá trị đọc từ SM trước khi trả JSON. Hàm nhận `(value, file)`. |
| `maxLength` | Không | `number` | Không giới hạn | Giới hạn độ dài khi field được đưa qua luồng validate đầu vào. |
| `pattern` | Không | `string` hoặc `RegExp` | Không kiểm tra | Biểu thức kiểm tra định dạng đầu vào. |
| `invalidMessage` | Không | `string` | Thông báo chung của core | Thông báo khi giá trị không khớp `pattern`. |
| `trim` | Không | `boolean` | `true` | Xóa khoảng trắng đầu/cuối khi chuẩn hóa chuỗi đầu vào. |
| `uppercase` | Không | `boolean` | `false` | Chuyển chuỗi đầu vào thành chữ hoa. |
| `allowDuplicateDb` | Không | `boolean` | `false` | Cho phép field này dùng chung `db` với một API field đã khai báo trước đó. Chỉ dùng cho alias đặc biệt. |
| `versionDependencies` | Không | `array<string>` | `[]` | Các field DBDict tham gia tạo optimistic-lock token; tối đa 32 field. |
| `versionTransform` | Không | `function` | Không chuyển đổi | Tạo token phiên bản. Chỉ có hiệu lực trên field được `versionField` tham chiếu. |

Giá trị mặc định trong bảng là **hành vi của core khi thuộc tính bị bỏ qua**;
framework không nhất thiết ghi giá trị đó trở lại object definition.

### `includeInList` và `columns[].visible`

```javascript
// Có trong query và response list, nhưng cột mặc định bị ẩn.
{ field: "updated_at", renderer: "datetime", visible: false }

// Không có trong query và response list; vẫn có thể lấy qua API detail.
{ api: "start_date", db: "start.date", type: "datetime", includeInList: false }
```

| Cấu hình | Query list | Response list | Hiển thị ban đầu |
| --- | ---: | ---: | ---: |
| `columns[].visible: false` | Có | Có | Ẩn |
| `fields[].includeInList: false` | Không | Không | Không có dữ liệu để hiển thị |

Nên dùng `includeInList: false` cho field chỉ dùng ở detail/update hoặc dữ liệu lớn như
`mail.body`. Không đặt `false` cho:

- `keyField` hoặc `versionField`;
- field được một column sử dụng;
- field nguồn của lookup trên danh sách;
- field client cần gửi lại khi thực hiện action.

### Field `date` và `datetime`

```javascript
// Chỉ ngày: giá trị API theo YYYY-MM-DD.
{ api: "signed_date", db: "signed.date", type: "date" }

// Ngày và giờ: giá trị form/API theo YYYY-MM-DDTHH:mm hoặc YYYY-MM-DDTHH:mm:ss.
{
  api: "start_date",
  db: "start.date",
  type: "datetime",
  readTransform: function (value) { return funcs.str(value); }
}
```

`type` mô tả kiểu dữ liệu trong contract API, không tự chuyển chuỗi thành kiểu
`date/time` native khi ghi SCFile. Repository hoặc custom action phải dùng adapter:

```javascript
lib.HPT_SmFieldAdapter.writeField(
  file,
  {
    field: "start.date",
    smType: "date/time",
    writeMode: "replace"
  },
  input.startDate
);
```

Không gán trực tiếp chuỗi vào `file["start.date"]`; cách đó có thể gây lỗi
`Cannot store a string into an object of type time`.

Khai báo ở các lớp liên quan:

- Grid: dùng `renderer: "datetime"` trong `screen.columns[]`.
- Dynamic Form: dùng `type: "date"` hoặc `type: "datetime"` trong `popup.fields[]`.
- Backend write: dùng `smType: "date/time"` qua `HPT_SmFieldAdapter`.

### Field mảng của Service Manager

Một field DBDict kiểu `array<character>` không nên trả thẳng đối tượng SM ra JSON.
Dùng `readTransform` và `HPT_SmFieldAdapter` để chọn cách đọc rõ ràng:

```javascript
{
  api: "reason",
  db: "reason",
  type: "string",

  // Grid chỉ cần lý do mới nhất trong mảng lịch sử.
  readTransform: function (value) {
    return lib.HPT_SmFieldAdapter.readValue(value, {
      smType: "array",
      elementType: "character",
      arrayReadMode: "last"
    });
  }
}
```

| Thuộc tính adapter | Giá trị trong ví dụ | Giá trị mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `smType` | `"array"` | Không có | Xác định field nguồn là mảng của Service Manager. |
| `elementType` | `"character"` | Không có | Kiểu dữ liệu của từng phần tử trong mảng. |
| `arrayReadMode` | `"last"` | `"all"` | Cách đọc mảng: `first`, `last`, `join` hoặc `all`. |
| `separator` | Không khai báo | `"; "` | Chuỗi phân cách, chỉ dùng khi `arrayReadMode: "join"`. |

`fields[].type` vẫn là `"string"` vì `last`, `first` và `join` trả về một chuỗi.
Nếu dùng `all`, API sẽ trả một mảng; cần xác nhận response contract của màn hình trước
khi công khai dữ liệu.

### Field optimistic lock

Field này giúp ngăn update/delete ghi đè lên bản ghi đã được người khác thay đổi kể từ
lúc client tải dữ liệu:

```javascript
versionField: "sysmodtime",

fields: [
  presets.optimisticLockField([
    "sysmoduser",
    "status",
    "is.budgeted",
    "start.date",
    "reason",
    "contract.no",
    "contract.value.total",
    "contract.status.id"
  ])
]
```

Preset trên tạo field `sysmodtime` và version token cho từng bản ghi. Client giữ token
khi tải danh sách rồi gửi lại lúc thực hiện action. Backend tạo lại token từ dữ liệu hiện
tại; nếu token khác nhau, thao tác bị từ chối vì bản ghi đã thay đổi.

Mảng truyền vào preset là các **field DBDict nghiệp vụ cần bảo vệ**. Chỉ cần một field
trong danh sách thay đổi thì token cũng thay đổi. Không thêm `sysmodtime` vào mảng vì
preset đã tự sử dụng field này làm version chính.

Khi tạo màn hình mới:

- Chỉ chọn các field mà thay đổi của chúng phải làm update/delete hiện tại bị chặn.
- Không sao chép nguyên dependency của màn hình hợp đồng sang domain khác.
- Giữ field version trong API list để client có token gửi lại cho action.
- Màn hình chỉ đọc, không có update/delete, thường không cần optimistic lock.

Nếu cần hiển thị thời gian cập nhật, khai báo một alias riêng vì `sysmodtime` đang trả
version token:

```javascript
{
  api: "updated_at",
  db: "sysmodtime",
  type: "datetime",
  allowDuplicateDb: true,
  readTransform: function (value) { return funcs.str(value); }
}
```

### Liên kết với column

`screen.columns` tham chiếu `fields[].api` hoặc field hiển thị do lookup tạo ra.

```javascript
fields: [
  { api: "status", db: "status", type: "string" }
],
screen: {
  columns: [
    {
      field: "status_view",
      name: "status",
      title: "Trạng thái",
      renderer: "status",
      sourceField: "status",
      colorField: "status_color",
      backgroundField: "status_bgcolor"
    }
  ]
}
```

Renderer hiện dùng: `text`, `lookup`, `status`, `datetime`, `recordLink`.

### Lookups — dữ liệu từ bảng tham chiếu

`lookups` giữ mã gốc từ bảng chính và bổ sung field hiển thị từ bảng tham chiếu.
Engine xử lý theo lô, không query riêng cho từng dòng.

#### Lookup một giá trị

```javascript
lookups: [
  {
    sourceField: "executor_id",
    targetField: "executor_id_view",
    table: "contacts",
    keyField: "contact.name",
    displayField: "full.name",
    fallback: "source",
    required: false
  }
]
```

Ví dụ kết quả: `executor_id: "falcon"` được giữ nguyên và API bổ sung
`executor_id_view: "Jennifer Falcon"`.

#### Thuộc tính lookup

| Thuộc tính | Bắt buộc | Kiểu | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- | --- |
| `sourceField` | Có | `string` | Không có | Tên `fields[].api` chứa khóa cần tra cứu. |
| `table` | Có | `string` | Không có | Bảng DBDict tham chiếu. |
| `keyField` | Có | `string` | Không có | Field DBDict so khớp với giá trị của `sourceField`. |
| `targetField` | Có với lookup đơn | `string` | Không có | Field mới được bổ sung vào response. |
| `displayField` | Có với lookup đơn | `string` | Không có | Field DBDict cần lấy từ bảng tham chiếu. |
| `outputs` | Không | `array` | Không có | Khai báo nhiều output, thay cho cặp `targetField`/`displayField` cấp ngoài. |
| `fallback` | Không | `string` | `"empty"` | `"source"` trả mã gốc; `"empty"` hoặc bỏ trống trả chuỗi rỗng. |
| `required` | Không | `boolean` | `false` | Quyết định API có thất bại khi cấu hình/query lookup lỗi hay không. |
| `readTransform` | Không | `function` | Giữ nguyên | Chuẩn hóa giá trị tham chiếu; hàm nhận `(value, file)`. |
| `extraQuery` | Không | `string` | Không có | Điều kiện backend cố định bổ sung cho bảng tham chiếu. |

#### Một lookup trả nhiều giá trị

```javascript
{
  sourceField: "status",
  table: "esdDMstatus",
  keyField: "status.en",
  outputs: [
    {
      targetField: "status_view",
      displayField: "status.vi",
      fallback: "source"
    },
    {
      targetField: "status_color",
      displayField: "color",
      fallback: "empty"
    },
    {
      targetField: "status_bgcolor",
      displayField: "bgcolor",
      fallback: "empty"
    }
  ],
  required: false
}
```

Một query lấy đồng thời tên trạng thái, màu chữ và màu nền.

| Thuộc tính `outputs[]` | Bắt buộc | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- |
| `targetField` | Có | Không có | Field mới trong response. |
| `displayField` | Có | Không có | Field DBDict cần đọc. |
| `fallback` | Không | `"empty"` | Giá trị dùng khi không tìm thấy mapping. |
| `readTransform` | Không | Transform cấp lookup hoặc giữ nguyên | Chuẩn hóa riêng output này và được ưu tiên hơn `lookup.readTransform`. |

Khi dùng `outputs`, không khai báo thêm `targetField`/`displayField` cấp ngoài với kỳ
vọng core sẽ gộp cả hai cách.

#### Fallback và lỗi lookup

| Cấu hình | Hành vi |
| --- | --- |
| `fallback: "source"` | Không tìm thấy mapping thì trả giá trị của `sourceField`. Phù hợp với tên hiển thị. |
| `fallback: "empty"` | Không tìm thấy thì trả `""`. Phù hợp với màu sắc hoặc metadata phụ. |
| `required: false` | Query lỗi thì ghi warning, API list tiếp tục và giữ fallback. |
| `required: true` | Cấu hình/query lookup lỗi thì quá trình resolve thất bại. |

`required: true` không bắt buộc mọi source key phải có mapping; key không tìm thấy vẫn
dùng fallback.

#### Lookup có điều kiện và transform

```javascript
{
  sourceField: "contact_id",
  targetField: "contact_email",
  table: "contacts",
  keyField: "contact.name",
  displayField: "email",
  extraQuery: "active=true",
  fallback: "empty",
  required: false,
  readTransform: function (value) {
    return lib.HPT_SmFieldAdapter.readValue(value, {
      smType: "array",
      elementType: "character",
      arrayReadMode: "first"
    });
  }
}
```

`extraQuery` phải là điều kiện cố định trong ScriptLibrary backend; không ghép trực tiếp
dữ liệu client vào chuỗi query. `readTransform` chỉ chuyển giá trị của `displayField`.

#### Hiệu năng và điều kiện sử dụng

- Core gom các key không trùng, chia chunk 50 và query bằng `isin`.
- Lookup có cùng `table`, `keyField` và `extraQuery` được gom chung một nhóm query.
- Dùng `includeTiming=true` khi chẩn đoán để xem `lookupQueries`, `lookupKeys` và
  `lookupMs`; không bật thường xuyên cho client nếu không cần số liệu đo.
- `sourceField` phải tồn tại trong `fields[]` và phải được trả về list; không đặt
  `includeInList: false`.
- Target do lookup sinh ra không cần khai báo lại trong `fields[]`.
- `keyField` nên duy nhất; nhiều dòng cùng khóa có thể làm kết quả sau ghi đè kết quả trước.
- Chỉ đặt `required: true` khi dữ liệu tham chiếu bắt buộc cho nghiệp vụ.

#### Liên kết với column

```javascript
{
  field: "executor_id_view",
  name: "executor_id",
  title: "Người thực hiện",
  renderer: "lookup",
  sourceField: "executor_id"
}
```

`field` là giá trị hiển thị do lookup tạo; `sourceField` là mã gốc.

#### Lỗi thường gặp

| Sai | Hậu quả | Cách đúng |
| --- | --- | --- |
| `sourceField` dùng tên DBDict | Definition không hợp lệ hoặc lookup rỗng. | Dùng tên `fields[].api`. |
| Source field có `includeInList: false` | Không có khóa để lookup. | Giữ source field trong list. |
| Mỗi output là một lookup riêng | Cấu hình dài và có thể tăng query. | Dùng một lookup với `outputs[]`. |
| Color dùng `fallback: "source"` | Mã trạng thái có thể trở thành CSS không hợp lệ. | Dùng `fallback: "empty"`. |
| `keyField` không duy nhất | Kết quả phụ thuộc dòng được đọc sau. | Dùng khóa duy nhất hoặc giới hạn bằng `extraQuery`. |

## 3. QUERY CONTRACT — search, sort và filter

Ba khối này là allowlist backend. Client chỉ gửi từ khóa, tên sort và parameter filter;
field DBDict cùng cách tạo query luôn do definition quyết định.

### Search

```javascript
search: [
  { db: "id", mode: "prefix" },
  { db: "name", mode: "contains" },
  { db: "status", mode: "exact" }
]
```

| Thuộc tính | Bắt buộc | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- |
| `db` | Có | Không có | Field DBDict cần tìm; phải được khai báo trong `fields[]`. |
| `mode` | Không | `"contains"` | Cách so khớp: `exact`, `prefix` hoặc `contains`. |

| Mode | Query tương đương | Dùng cho |
| --- | --- | --- |
| `exact` | `value` | Mã/trạng thái cần khớp toàn bộ. |
| `prefix` | `value*` | Số hồ sơ hoặc mã có tiền tố. |
| `contains` | `*value*` | Tên và nội dung ngắn. |

Các field search được nối bằng `OR`. Keyword được escape trước khi ghép query. Keyword
rỗng có nghĩa là không áp dụng search; danh sách vẫn chịu filter và data permission.

Giới hạn keyword nằm trong `defaults`:

```javascript
defaults: presets.listDefaults({
  minKeywordLength: 2,
  maxKeywordLength: 100
})
```

Không dùng `contains` trên quá nhiều field hoặc field nội dung dài vì query `*value*`
có thể tốn chi phí trên tập dữ liệu lớn.

### Sort

```javascript
sortable: {
  id: "id",
  name: "name",
  sysmodtime: "sysmodtime"
},
defaults: presets.listDefaults({
  sortBy: "id",
  sortDir: "asc"
})
```

| Thành phần | Ý nghĩa |
| --- | --- |
| Key của `sortable` | Tên public client được phép gửi qua `sortBy`. |
| Value của `sortable` | Field DBDict thật dùng để sort; phải có trong `fields[]`. |
| `defaults.sortBy` | Sort mặc định; nên là một key trong `sortable`. |
| `defaults.sortDir` | `asc` hoặc `desc`; mặc định `asc`. |

`sortBy` ngoài allowlist hoặc `sortDir` khác `asc`/`desc` bị từ chối. Không cho client
gửi trực tiếp tên DBDict.

### Filter backend

```javascript
filters: {
  statusValues: {
    db: "status",
    operator: "eq",
    maxValues: 5,
    maxLength: 160
  },
  fromDate: { db: "start.date", operator: "gte" },
  toDate: { db: "start.date", operator: "lte" }
}
```

| Thuộc tính | Bắt buộc | Kiểu | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- | --- |
| `db` | Có | `string` | Không có | Field DBDict được phép lọc; phải tồn tại trong `fields[]`. |
| `operator` | Không | `string` | `"eq"` | Phép lọc: `eq`, `gte` hoặc `lte`. |
| `maxValues` | Không | `number` | `50` | Số giá trị tối đa của filter `eq`. |
| `maxLength` | Không | `number` | Không kiểm tra nếu bỏ qua | Độ dài tối đa của từng giá trị `eq`; nên luôn khai báo rõ. |

`eq` nhận một JSON array. Các giá trị trong cùng filter được nối bằng `OR`; những filter
khác nhau và search được nối bằng `AND`.

```text
statusValues=["open","pending"]
```

`gte` và `lte` nhận ngày `YYYY-MM-DD`. Với ngày kết thúc, core dùng điều kiện nhỏ hơn
00:00 của ngày kế tiếp, nên bao phủ toàn bộ ngày đã chọn kể cả giá trị có phần giây.

```text
fromDate=2026-10-01&toDate=2026-10-16
```

### Filter hiển thị trên UI

Mỗi `parameter` UI phải tồn tại trong `filters` backend.

#### Multi-select

```javascript
screen: {
  filters: [
    {
      id: "status",
      type: "multiSelect",
      label: "Trạng thái",
      parameter: "statusValues",
      option: "status",
      placeholder: "Tất cả trạng thái",
      multiple: true,
      cacheTtl: 300000
    }
  ]
}
```

| Thuộc tính | Bắt buộc | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- |
| `id` | Có | Không có | Định danh duy nhất của filter UI. |
| `type` | Có | Không có | `multiSelect`, `date` hoặc `orgUnitCascade`. |
| `parameter` | Có | Không có | Tên parameter trong `filters` backend. |
| `option` | Có với multi-select | Không có | Key trong `filterOptions`. |
| `label` | Không | `id` | Nhãn hiển thị. |
| `placeholder` | Không | `"Tất cả"` | Nội dung khi chưa chọn. |
| `multiple` | Không | `true` | Cho phép chọn nhiều option. |
| `cacheTtl` | Không | `300000` ms | Thời gian cache option; tối đa 3.600.000 ms. |

#### Khoảng ngày

```javascript
screen: {
  filters: [
    { id: "fromDate", type: "date", label: "Từ ngày", parameter: "fromDate" },
    { id: "toDate", type: "date", label: "Đến ngày", parameter: "toDate" }
  ]
}
```

#### Đơn vị phân cấp

```javascript
screen: {
  filters: [presets.organizationCascadeFilter()]
}
```

Preset tạo ba cấp đơn vị và gửi lần lượt `unitLv1Values`, `unitLv2Values`,
`unitLv3Values`; cả ba parameter vẫn phải được khai báo trong `filters` backend.

### Nguồn option cho filter

`filterOptions` hỗ trợ bốn nguồn:

| `source` | Mục đích |
| --- | --- |
| `defined` | Danh sách giá trị cố định trong definition. |
| `lookup` | Đọc trực tiếp value/label từ bảng danh mục. |
| `distinct` | Lấy giá trị đang có trong bảng nghiệp vụ; có thể map nhãn qua lookup. |
| `dependent` | Tải option theo một hoặc nhiều giá trị cha, dùng cho filter phân cấp. |

#### Defined

```javascript
filterOptions: {
  priority: {
    source: "defined",
    values: ["1", "2", "3"],
    maxItems: 3
  }
}
```

#### Lookup

```javascript
filterOptions: {
  status: {
    source: "lookup",
    lookup: {
      table: "esdDMstatus",
      keyField: "status.en",
      labelField: "status.vi",
      query: "true",
      orderBy: "status.vi",
      maxItems: 500,
      extraFields: { color: "color", bgcolor: "bgcolor" }
    }
  }
}
```

#### Distinct kết hợp lookup

```javascript
filterOptions: {
  status: {
    source: "distinct",
    distinct: {
      table: "esdHDcontract",
      field: "status",
      maxItems: 100
    },
    lookup: {
      table: "esdDMstatus",
      keyField: "status.en",
      labelField: "status.vi",
      extraFields: { color: "color", bgcolor: "bgcolor" }
    }
  }
}
```

#### Dependent

```javascript
orgLv2: {
  source: "dependent",
  dependsOn: "orgLv1",
  parentParameter: "parentId",
  maxParents: 20,
  maxParentLength: 160,
  lookup: {
    table: "esdQTorgUnit",
    keyField: "unit.id",
    labelField: "unit.name",
    parentField: "parent.id",
    query: 'level like "lv2*" and status="Dang hoat dong"',
    orderBy: "unit.name",
    maxItems: 500
  }
}
```

Option API hỗ trợ remote search và paging: `search` tối đa 100 ký tự, `limit` tối đa
100 và `page` tối đa 10.000. Phải cấp quyền `filterOptions` trong `actionPermissions`.

### Cache và trạng thái filter

- `screen.filters[].cacheTtl` điều khiển thời gian cache option trên UI; mặc định 5 phút.
- Filter phân cấp cache riêng theo context, service, function và giá trị cha; thay version
  cache khi cấu trúc hoặc quy tắc danh mục thay đổi.
- Chỉ response thành công được cache; lỗi API hoặc lỗi `sessionStorage` phải quay về gọi API.
- Lựa chọn filter và search có thể lưu theo `screen.state`; tăng `state.version` khi cấu
  trúc state không còn tương thích, không tăng chỉ vì sửa nhãn hiển thị.
- Backend luôn validate lại filter; cache và state phía client không phải cơ chế bảo mật.

### Lỗi thường gặp

| Sai | Hậu quả | Cách đúng |
| --- | --- | --- |
| Dùng API name trong `search[].db` | Definition không hợp lệ nếu không trùng DBDict. | Dùng `fields[].db`. |
| Cho client gửi field sort hoặc filter tùy ý | Có thể truy cập field ngoài phạm vi. | Chỉ dùng key/parameter đã allowlist. |
| Gửi chuỗi đơn cho filter `eq` | Backend báo filter phải là danh sách. | Gửi JSON array, kể cả khi có một giá trị. |
| Gửi `DD/MM/YYYY` cho date filter | Backend từ chối ngày không hợp lệ. | Gửi `YYYY-MM-DD`. |
| UI khai báo parameter nhưng backend không có | Definition bị từ chối. | Khai báo đồng bộ `screen.filters` và `filters`. |
| Dùng `distinct` không giới hạn | Đọc quá nhiều option. | Đặt `maxItems` phù hợp hoặc dùng remote `lookup`. |
| Bật `filterOptions` UI nhưng thiếu quyền | Không tải được option. | Cho phép `actionPermissions.filterOptions`. |

### Query hooks tùy chọn

```javascript
hooks: {
  beforeList: function (query, request, context) {
    return { query: query };
  },
  afterList: function (rows, request, context) {
    return { data: rows };
  }
}
```

Core hiện chỉ cho phép `beforeList` và `afterList`. Hook có thể trả `{ error }` để dừng;
`beforeList` có thể trả query thay thế và `afterList` có thể trả data thay thế. Đây là
escape hatch backend: không nhận raw query hoặc tên hook từ client, không dùng hook để bỏ
qua permission/data scope, và ưu tiên metadata chuẩn khi đã đáp ứng được nhu cầu.

## 4. SECURITY — quyền thao tác và phạm vi dữ liệu

Security gồm hai lớp độc lập:

- `actionPermissions`: người dùng có được gọi thao tác hay không.
- `dataPermission`: người dùng được thao tác trên những bản ghi nào.

Có quyền action không đồng nghĩa có quyền trên mọi dữ liệu. Backend luôn kiểm tra cả hai
lớp tại thời điểm thực thi.

### Cấu hình đầy đủ

```javascript
actionPermissions: {
  uiConfig: { allow: true },
  list: { allow: true },
  filterOptions: { allow: true },
  detail: { allow: true },
  create: { allow: false },
  update: { allow: false },
  delete: { allow: false },
  "batch:updateContract": { allow: true },
  "batch:deleteContracts": { allow: true },
  "screen:addContract": { allow: true }
},

dataPermission: {
  enabled: true,
  subModule: "00401",
  unitFields: ["unit.lv1", "unit.lv2", "unit.lv3"],
  ownerField: "created.by",
  includeOwner: true,
  maxUnits: 500
}
```

### `actionPermissions`

Action không được khai báo bị từ chối mặc định. `uiConfig` và `list` phải luôn có mặt
trong definition, kể cả khi đặt `allow: false`.

| Permission key | Bảo vệ |
| --- | --- |
| `uiConfig` | Đọc metadata public của màn hình. |
| `list` | Danh sách và các phép count liên quan. |
| `filterOptions` | API tải option cho filter/lookup. |
| `detail` | Đọc chi tiết một bản ghi. |
| `create` | API create chuẩn và action UI có `type: "create"`. |
| `update` | API update chuẩn. |
| `delete` | API delete chuẩn. |
| `batch:<actionId>` | Batch action tương ứng trong `batchActions`. |
| `screen:<actionId>` | Server-side screen action tương ứng trong `screenActions`. |

Mỗi `batchActions.<id>` phải có `batch:<id>`; mỗi server action phải có
`screen:<id>`. Definition bị từ chối nếu hai phía không đồng bộ.

### Các dạng permission rule

```javascript
actionPermissions: {
  // Cho phép mọi người dùng đã đăng nhập gọi action này.
  list: true,

  // Tương đương true nhưng rõ nghĩa hơn trong definition mẫu.
  detail: { allow: true },

  // Từ chối tường minh.
  create: { allow: false },

  // Kiểm tra quyền động hoàn toàn ở backend.
  "batch:approve": {
    checker: function (args) {
      // Ví dụ cơ chế; production phải kiểm tra nguồn quyền server-side thực tế.
      return args.contact === "APPROVER_TEST";
    }
  }
}
```

| Dạng rule | Giá trị mặc định | Hành vi |
| --- | --- | --- |
| Không khai báo | Deny | Trả `FORBIDDEN`. |
| `true` hoặc `{ allow: true }` | — | Cho phép người dùng đã đăng nhập. |
| `false` hoặc `{ allow: false }` | — | Từ chối. |
| `function` hoặc `{ checker: function }` | — | Cho phép chỉ khi checker trả `true` hoặc `{ allowed: true }`. |

Checker nhận `{ action, contact, request, context }`. Checker phải là function cố định
trong backend definition; client không được gửi tên checker. Checker lỗi hoặc trả kết quả
khác trạng thái cho phép đều bị từ chối.

`allow: true` chỉ nên dùng khi mọi người dùng đăng nhập của màn hình thực sự có quyền.
Không dùng việc ẩn nút trên UI thay cho permission backend.

### `dataPermission`

| Thuộc tính | Bắt buộc | Kiểu | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- | --- |
| `enabled` | Không | `boolean` | `false` | Bật row-level data scope. `false` nghĩa là không thêm điều kiện phạm vi dữ liệu. |
| `subModule` | Có khi bật | `string` | Không có | Mã phân quyền dùng với `ESD_PERMS_RIGHTS`. |
| `unitFields` | Có với scope đơn vị | `array<string>` | Không có | Các field DBDict chứa mã đơn vị trên bản ghi. |
| `ownerField` | Không | `string` | `"created.by"` | Field DBDict xác định chủ sở hữu bản ghi. |
| `includeOwner` | Không | `boolean` | `true` | Với scope đơn vị, cho phép thêm các bản ghi do chính người dùng sở hữu. |
| `maxUnits` | Không | `number` | `500` | Số đơn vị tối đa nhận từ provider; hợp lệ từ 1 đến 5.000. |

Luồng xử lý:

1. Lấy contact của người dùng đăng nhập.
2. Gọi `ESD_PERMS_RIGHTS.getUnitByDataPermissions(contact, subModule)`.
3. Chuẩn hóa scope và danh sách đơn vị.
4. Tạo query owner/unit từ field backend đã khai báo.
5. Ghép data-scope query với search/filter/key bằng `AND`.

| Scope provider hiện tại | Query áp dụng |
| --- | --- |
| `QT_PQDL_06` | Toàn bộ dữ liệu (`true`). |
| `QT_PQDL_01` | Chỉ bản ghi khớp `ownerField`. |
| Scope đơn vị khác | Khớp một trong `unitFields`; thêm owner nếu `includeOwner !== false`. |

### Phạm vi áp dụng

| Luồng | Cách áp dụng data scope |
| --- | --- |
| List và filtered count | Search + filter + data scope. |
| Unfiltered count | Base query + data scope; không làm lộ tổng ngoài quyền. |
| Detail | Business key + data scope. |
| Update/delete chuẩn | Business key + data scope trước khi ghi. |
| Batch action | Đọc lại item theo selection + data scope trước handler. |
| Related selector | Kiểm tra quyền list và scope của screen liên quan. |
| Create | Không có bản ghi cũ để lọc; phải kiểm tra quyền tạo và write-scope trong nghiệp vụ. |
| Filter options/lookup table | Không tự động kế thừa row scope của bảng chính; cần query/service an toàn nếu option phụ thuộc quyền. |

Bản ghi ngoài scope được xử lý như không tồn tại để hạn chế làm lộ thông tin.

### Fail-closed

Khi `dataPermission.enabled: true`, các trường hợp sau đều từ chối thay vì trả toàn bộ dữ liệu:

- Không xác định được contact hiện tại.
- `subModule`, field hoặc `maxUnits` không hợp lệ.
- Không có `ESD_PERMS_RIGHTS` hoặc provider phát sinh lỗi.
- Người dùng chưa có scope.
- Scope đơn vị rỗng và không có owner hợp lệ.
- Số đơn vị vượt `maxUnits`.

Ngược lại, `enabled: false` chủ động bỏ qua data scope. Chỉ dùng khi dữ liệu thực sự dùng
chung hoặc trong pilot đã được phê duyệt; không coi đây là trạng thái production an toàn.

### Các case cấu hình

#### Màn hình chỉ đọc

```javascript
actionPermissions: {
  uiConfig: { allow: true },
  list: { allow: true },
  filterOptions: { allow: true },
  detail: { allow: true },
  create: { allow: false },
  update: { allow: false },
  delete: { allow: false }
}
```

#### Quyền động theo nghiệp vụ

```javascript
actionPermissions: {
  uiConfig: { allow: true },
  list: { allow: true },
  "batch:approve": {
    checker: function (args) {
      // Thay bằng provider quyền nghiệp vụ thực tế của domain.
      return args.contact === "APPROVER_TEST";
    }
  }
}
```

Checker chỉ quyết định quyền gọi action. Trạng thái bản ghi, data scope và business rule
vẫn phải được kiểm tra lại trên dữ liệu mới nhất trong engine/domain handler. So sánh
contact cố định ở ví dụ chỉ dùng để minh họa/test, không dùng làm quyền production.

### Lỗi thường gặp

| Sai | Rủi ro/hậu quả | Cách đúng |
| --- | --- | --- |
| Không khai báo permission cho action | Action bị từ chối hoặc definition không hợp lệ. | Khai báo đúng key backend tương ứng. |
| Chỉ ẩn nút bằng `visibleIf` | Request tự tạo vẫn có thể gọi backend nếu quyền mở. | Kiểm tra bằng `actionPermissions`. |
| Có permission nhưng tắt data scope | Người dùng có thể đọc/ghi ngoài phạm vi. | Bật và kiểm thử `dataPermission` trước production. |
| Dùng API field trong `unitFields`/`ownerField` | Query scope sai. | Dùng tên DBDict. |
| Suy diễn quyền create từ quyền list | Ghi dữ liệu vào đơn vị không được phép. | Kiểm tra write-scope riêng trong create handler/service. |
| Cho filter option trả danh mục nhạy cảm không scope | Làm lộ option ngoài quyền. | Dùng query hoặc service option có kiểm tra quyền. |
| Checker tin role/permission do client gửi | Có thể giả mạo quyền. | Chỉ dùng contact/session và nguồn quyền server-side. |

Chính sách triển khai và checklist production xem tại [06_SECURITY.md](06_SECURITY.md).

## 5. PUBLIC UI — metadata dựng màn hình

Chỉ `screenPublic` đã được validate mới được gửi xuống trình duyệt. Callback, DBDict,
handler và cấu hình ghi dữ liệu không thuộc public metadata.

### Thông tin màn hình và state

```javascript
screen: {
  id: "contracts",
  version: "1",
  kind: "list",
  title: "Danh sách hợp đồng",
  state: { key: "DanhSachHopDong", version: "3" }
}
```

| Thuộc tính | Bắt buộc | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- |
| `id` | Có | Không có | Phải khớp `screenId` trong registry. |
| `version` | Có | Không có | Hiện chỉ hỗ trợ `"1"`. |
| `kind` | Có | Không có | Hiện chỉ hỗ trợ `"list"`. |
| `title` | Không | `screen.id` | Tiêu đề màn hình, tối đa 200 ký tự. |
| `state.key` | Không | `screen.id` | Namespace lưu trạng thái UI. Phải duy nhất theo màn hình/ngữ cảnh. |
| `state.version` | Không | `"1"` | Tăng khi cấu trúc state cũ không còn tương thích. |

Không tăng `state.version` khi chỉ đổi nhãn hoặc màu; việc đó xóa cấu hình cột/filter đã
lưu của người dùng mà không cần thiết.

### Columns

```javascript
columns: [
  {
    field: "status_view",
    name: "status",
    title: "Trạng thái",
    renderer: "status",
    sourceField: "status",
    colorField: "status_color",
    backgroundField: "status_bgcolor",
    visible: true,
    hideable: false
  }
]
```

| Thuộc tính | Bắt buộc | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- |
| `field` | Có | Không có | Public field từ `fields[]` hoặc target do lookup tạo. |
| `name` | Không | `field` | Tên logic dùng cho column/state/sort mapping. |
| `title` | Không | `field` | Tiêu đề cột, tối đa 160 ký tự. |
| `renderer` | Không | `"text"` | `text`, `lookup`, `status`, `datetime`, `recordLink`, `detailLink`. |
| `visible` | Không | `true` | Hiển thị cột mặc định. Field vẫn có trong response khi `false`. |
| `hideable` | Không | `true` | Cho phép người dùng ẩn/hiện cột. |
| `sourceField` | Theo renderer | Không có | Field mã gốc cho `lookup`/`status`. |
| `colorField` | Không | Không có | Field màu chữ cho renderer `status`. |
| `backgroundField` | Không | Không có | Field màu nền cho renderer `status`. |
| `resource` | Với link nghiệp vụ | Không có | Resource dùng khi mở record link. |

Tối đa 100 column và không được trùng `field`. `detailLink` dùng `screen.detail`;
`recordLink` dùng resource WebTier đã đăng ký.

### Dashboard và popup detail tùy chọn

```javascript
dashboard: {
  serviceName: "HPT_EmailLogReportService",
  functionName: "getDashboard",
  topItems: 10,
  cards: [{ field: "totalEmails", label: "Tổng email" }],
  charts: [{ field: "trend", label: "Xu hướng" }]
},
detail: {
  title: "Chi tiết Email",
  keyField: "log_id",
  bodyField: "mail_body",
  bodyFormatField: "mail_body_format"
}
```

| Cấu hình | Giới hạn/điều kiện |
| --- | --- |
| `dashboard.serviceName`, `functionName` | Bắt buộc và phải là ID an toàn. |
| `dashboard.topItems` | Mặc định 10, tối đa 20. |
| `dashboard.cards` | Tối đa 8 item. |
| `dashboard.charts` | Tối đa 6 item. |
| `detail.keyField`, `bodyField` | Phải là public field hợp lệ. |
| `detail.bodyFormatField` | Tùy chọn; phải là public field nếu khai báo. |

Dashboard chỉ công khai tên service/function cố định từ backend; endpoint vẫn phải áp
dụng session và permission riêng. Dữ liệu lớn như body nên đặt `includeInList: false` và
chỉ tải qua detail.

### Filters UI

`screen.filters` hỗ trợ `multiSelect`, `date` và `orgUnitCascade`. Cấu hình, giá trị mặc
định và liên kết với backend đã mô tả tại [Query Contract](#3-query-contract--search-sort-và-filter).
Tối đa 20 filter.

### Selection

```javascript
selection: presets.selection("multiple", {
  maxItems: 10,
  retainAcrossPages: true,
  clearOnQueryChange: true,
  debug: false
})
```

| Thuộc tính | Giá trị mặc định | Ý nghĩa |
| --- | --- | --- |
| `mode` | `"none"` | `none`, `single` hoặc `multiple`. |
| `maxItems` | `1` với single; `100` với multiple | Số dòng UI cho phép giữ trong selection, tối đa 1.000. |
| `retainAcrossPages` | `true` khi có selection | Giữ lựa chọn khi đổi trang/sort. |
| `clearOnQueryChange` | `true` khi có selection | Xóa lựa chọn khi search/filter đổi phạm vi dữ liệu. |
| `debug` | `false` | Chỉ bật tạm trên môi trường phát triển. |

`mode: "none"` không public bulk action. Màn hình selectable bắt buộc có `versionField`
public. Giới hạn UI không thay thế `batchActions[].maxItems` ở backend.

### Bulk action UI

```javascript
bulkActions: [
  {
    id: "deleteContracts",
    label: "Xóa",
    style: "danger",
    enabled: true,
    confirm: true,
    confirmMessage: "Bạn có chắc chắn muốn xóa?",
    enableIf: { minSelected: 1, maxSelected: 10 },
    execution: {
      maskScope: "framework",
      maskMessage: "Đang xóa dữ liệu...",
      preventClose: true,
      preventDuplicate: true
    },
    order: 30
  }
]
```

| Thuộc tính | Bắt buộc | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- |
| `id` | Có | Không có | Phải trùng key trong `batchActions`. |
| `label` | Không | `id` | Nhãn nút. |
| `enabled` | Không | `true` | Backend action `enabled: false` vẫn vô hiệu hóa nút. |
| `order` | Không | Theo vị trí × 10 | Thứ tự trên toolbar. |
| `style` | Không | `"secondary"` | `primary`, `secondary` hoặc `danger`. |
| `confirm` | Không | `false` | Hiện bước xác nhận trước khi submit. |
| `confirmMessage` | Không | `""` | Nội dung xác nhận. |
| `visibleIf`, `enableIf` | Không | Không có | Điều kiện UI theo selection/record. Không phải security rule. |
| `popup` | Không | Không có | Dynamic Form nhập dữ liệu. |
| `selector` | Không | Không có | Mở một list screen khác để chọn dữ liệu liên quan. |
| `execution` | Không | Xem bảng dưới | Loading và khóa thao tác khi request chạy. |

Tối đa 20 bulk action. Mỗi action phải có backend definition và permission
`batch:<id>` tương ứng.

### Execution UI

| Thuộc tính | Bulk mặc định | Screen action mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `maskScope` | `"screen"` | `"none"` | `none`, `dialog`, `screen`, `framework`. |
| `maskMessage` | `"Đang xử lý..."` | `"Đang xử lý..."` | Nội dung loading, tối đa 200 ký tự. |
| `preventClose` | `false` | `false` | Cảnh báo khi người dùng đóng/reload trong lúc chạy. |
| `preventDuplicate` | `true` | `true` | Chặn submit trùng trên UI. Backend vẫn cần idempotency. |

### Popup, selector và import

- Dynamic Form hỗ trợ `text`, `textarea`, `number`, `integer`, `money`, `select`,
  `lookup`, `checkbox`, `date`, `datetime`; xem [03_DYNAMIC_FORM_REFERENCE.md](03_DYNAMIC_FORM_REFERENCE.md).
- Selector dùng `screenId`, mode `single|multiple`, `maxItems`, title và kích thước;
  backend phải khai báo `relatedSelection` cùng screen.
- Import dùng action `type: "import"`, bắt buộc có `screenActions[id]`; xem
  [07_EXCEL_IMPORT.md](07_EXCEL_IMPORT.md).

Điều kiện UI hỗ trợ `visibleIf`, `enableIf`, `requiredIf` với operator `eq`, `neq`, `in`,
`notIn`, `empty`, `notEmpty`. Backend phải kiểm tra lại permission, scope và business rule.

### Screen actions

```javascript
actions: [
  { id: "refresh", type: "refresh", label: "Làm mới", order: 10 },
  { id: "export", type: "export", label: "Xuất dữ liệu", filename: "contracts", order: 20 },
  { id: "addContract", type: "custom", label: "Thêm HĐ", order: 30 }
]
```

| `type` | Backend action | Công dụng |
| --- | --- | --- |
| `refresh` | Không | Tải lại danh sách. |
| `export` | Không | Xuất dữ liệu theo query hiện tại. |
| `create` | API create chuẩn | Bắt buộc có popup và permission `create`. |
| `custom` | Có nếu là server action | Nghiệp vụ domain qua `screenActions`. |
| `import` | Có | Import Excel qua `screenActions`. |

Thuộc tính chung: `id`, `type`, `label`, `enabled` (mặc định `true`), `order`,
`confirm`, `confirmMessage`, `execution`, `popup`, `selector`, `visibleIf`, `enableIf`.
Riêng export có `filename` mặc định `"export"` và không hỗ trợ confirm, popup, selector
hoặc điều kiện. Tối đa 50 screen action.

## 6. BACKEND ACTIONS — thực thi nghiệp vụ

UI action chỉ mô tả trải nghiệm. Mọi mutation phải có backend definition, permission và
giới hạn riêng.

### Batch actions

```javascript
batchActions: {
  updateContract: {
    enabled: true,
    enforceEnableIf: true,
    maxItems: 1,
    chunkSize: 1,
    transactionMode: "perItem",
    conflictMetadata: {
      exposeUpdatedBy: true,
      updatedByField: "sysmoduser",
      updatedAtField: "updated_at"
    },
    requireReason: false,
    reasonMaxLength: 1000,
    operation: "custom",
    handlerId: "contracts.updateContract"
  }
}
```

| Thuộc tính | Bắt buộc | Giá trị mặc định | Ý nghĩa |
| --- | ---: | --- | --- |
| `enabled` | Không | `true` | Cho phép thực thi action. |
| `operation` | Có | Không có | `update`, `delete` hoặc `custom`. |
| `maxItems` | Không | `100` | Giới hạn request; tối đa 1.000. |
| `chunkSize` | Không | `25` | Số item mỗi chunk; tối đa 100 và không vượt `maxItems`. |
| `transactionMode` | Không | `"perItem"` | `perItem` hoặc `allValidated`; không phải DB transaction toàn batch. |
| `enforceEnableIf` | Không | `false` | Backend áp dụng lại `enableIf`; hiện chỉ hỗ trợ `records: "all"` và direct API field. |
| `requireReason` | Không | `false` | Bắt buộc lý do. |
| `reasonMaxLength` | Không | `1000` | Tối đa 4.000 ký tự. |
| `handlerId` | Với custom | Không có | ID `domain.action` đã đăng ký trong ActionRegistry. |
| `writes` | Với update chuẩn | Không có | Allowlist field và cách ghi SM; tối đa 50 field. |
| `conflictMetadata` | Không | Không có | Cấu hình metadata trả về khi optimistic lock conflict. |
| `successMessage` | Không | Thông báo mặc định | Message khi item thành công. |
| `execution` | Không | Đồng bộ | Cấu hình async phía backend khi action hỗ trợ job. |

`operation: "custom"` không được chứa function handler trực tiếp; chỉ dùng `handlerId`.
`perItem` cho phép partial success. `allValidated` chỉ đảm bảo validate toàn batch trước
phase ghi, không rollback các ghi đã thực hiện nếu phase ghi gặp lỗi.

### Update chuẩn với `writes`

```javascript
writes: [
  {
    field: "reason",
    source: "reason",
    smType: "array",
    elementType: "character",
    writeMode: "append",
    maxItemLength: 1000,
    maxItems: 100
  }
]
```

`source` chỉ nhận `reason` hoặc `input.<popupField>`. Scalar hỗ trợ `replace|clear`;
array hỗ trợ `append|replace|clear`. `smType` scalar gồm `character`, `label`, `number`,
`date/time`, `logical`; array phải khai báo `elementType`. Chi tiết validation và mapping
xem [03_DYNAMIC_FORM_REFERENCE.md](03_DYNAMIC_FORM_REFERENCE.md).

### Conflict metadata

| Thuộc tính | Giá trị mặc định | Ý nghĩa |
| --- | --- | --- |
| `exposeUpdatedBy` | `false` | Cho phép trả người cập nhật gần nhất khi conflict. |
| `updatedByField` | Không có | DBDict field người cập nhật; bắt buộc nếu expose. |
| `updatedAtField` | Không có | API field thời gian cập nhật đã allowlist. |

Không cho client chọn field conflict. Chỉ public dữ liệu người sửa khi chính sách cho phép.

### Screen actions backend

```javascript
screenActions: {
  addContract: {
    enabled: true,
    operation: "custom",
    handlerId: "contracts.createFromStatuses",
    relatedSelection: {
      screenId: "status_catalog",
      maxItems: 20,
      verificationChunkSize: 20,
      valueFields: ["status_en"]
    }
  }
}
```

Screen action backend hiện dùng `operation: "custom"` với `handlerId` đã đăng ký.
`relatedSelection.screenId` phải khớp selector UI; backend đọc lại selection, kiểm tra
permission/scope/version và chỉ public các `valueFields` đã khai báo.

| Thuộc tính `relatedSelection` | Giá trị mặc định | Ý nghĩa |
| --- | --- | --- |
| `screenId` | Không có | Screen nguồn của selector. |
| `maxItems` | Theo action/UI | Số item tối đa, không vượt 1.000. |
| `verificationChunkSize` | Theo engine | Chunk đọc lại dữ liệu, tối đa 100. |
| `valueFields` | `[]` | API field được phép chuyển sang handler. |

### Async/background execution

```javascript
execution: {
  asyncEnabled: true,
  asyncThreshold: 200,
  maxAsyncItems: 500,
  maxRetry: 1,
  executorId: "contracts.importContractsJob"
}
```

| Thuộc tính | Giá trị mặc định | Giới hạn/ý nghĩa |
| --- | --- | --- |
| `asyncEnabled` | `false` | Cho phép chuyển action sang background job. |
| `asyncThreshold` | `100` | Ngưỡng item chạy nền; tối đa 1.000. |
| `maxAsyncItems` | `10000` | Giới hạn job; tối đa 50.000 và không nhỏ hơn threshold. |
| `maxRetry` | `3` | Số lần retry job; core giới hạn tối đa 10. |
| `executorId` | Không có | Bắt buộc khi async bật; ID executor đã đăng ký. |

Worker kiểm tra lại permission bằng owner đã lưu khi enqueue; thay đổi permission sau đó
có thể làm job bị từ chối. Chi tiết xem [05_EXPORT_AND_BACKGROUND_JOBS.md](05_EXPORT_AND_BACKGROUND_JOBS.md)
và [04_ACTION_AND_BATCH_REFERENCE.md](04_ACTION_AND_BATCH_REFERENCE.md).

### Đồng bộ UI và backend

| UI | Backend bắt buộc |
| --- | --- |
| `screen.bulkActions[id]` | `batchActions[id]` + permission `batch:<id>`. |
| `screen.actions` custom server action | `screenActions[id]` + permission `screen:<id>`. |
| `screen.actions` import | `screenActions[id]` + handler/executor phù hợp. |
| `screen.actions` create | Permission `create`; popup phải khai báo. |

### Lỗi thường gặp

| Sai | Hậu quả | Cách đúng |
| --- | --- | --- |
| Chỉ khai báo nút UI | Definition lỗi hoặc request không có handler. | Khai báo backend action và permission tương ứng. |
| UI `maxItems` lớn hơn backend | UI cho chọn nhưng backend từ chối. | Giữ backend là giới hạn cuối và đồng bộ UI. |
| Dùng custom cho update đơn giản | Tăng code và khó tái sử dụng. | Dùng operation `update` + `writes` khi đủ. |
| Coi `allValidated` là atomic | Có thể hiểu sai khả năng rollback. | Ghi rõ đây là best-effort validation. |
| Gửi mail/webhook dài trong item | Request chậm và khó retry. | Dùng outbox/background job. |
| Dùng handler function trong definition | Không qua registry allowlist. | Dùng `handlerId`. |

## 7. LEGACY VÀ RESPONSE

### Legacy endpoints

```javascript
endpoints: {
  list: "getContractList"
}
```

`endpoints` là alias cho tích hợp cũ. Generic screen dùng `HPT_ScreenService` không cần
khối này; bỏ toàn bộ nếu không còn consumer legacy. Không dùng endpoint alias để cho client
chọn ScriptLibrary/function tùy ý.

### Response messages

```javascript
messages: {
  listSuccess: "Lấy danh sách hợp đồng thành công",
  listError: "Không thể tải danh sách hợp đồng",
  detailSuccess: "Lấy chi tiết hợp đồng thành công",
  detailError: "Không thể tải chi tiết hợp đồng",
  notFound: "Không tìm thấy hợp đồng",
  duplicate: "Mã hợp đồng đã tồn tại",
  createSuccess: "Tạo hợp đồng thành công",
  createError: "Không thể tạo hợp đồng",
  updateSuccess: "Cập nhật hợp đồng thành công",
  updateError: "Không thể cập nhật hợp đồng",
  deleteSuccess: "Xóa hợp đồng thành công",
  deleteError: "Không thể xóa hợp đồng",
  lookupError: "Không thể ánh xạ dữ liệu tham chiếu"
}
```

Tất cả message đều không bắt buộc; core dùng thông báo mặc định nếu bỏ qua. Message phục
vụ người dùng, còn client phải dựa vào `success`, `code`, HTTP status và kết quả từng item,
không parse nội dung tiếng Việt để điều khiển logic. Contract response xem
[10_API_RESPONSE_REFERENCE.md](10_API_RESPONSE_REFERENCE.md).

### Checklist hoàn tất definition mới

1. Identity, field, lookup và query chỉ dùng table/DBDict cố định ở backend.
2. UI field/action đều có nguồn public hợp lệ và không lộ handler/query.
3. Permission, data scope, optimistic lock và giới hạn backend đã bật đúng môi trường.
4. UI action, backend action, permission và registry dùng cùng ID.
5. Action dài có idempotency/background strategy; không giả định chunk là transaction.
6. Legacy endpoint đã bỏ nếu không còn consumer.
7. Tăng `definitionVersion`; chỉ tăng `state.version` khi state UI không tương thích.
8. Chạy regression và smoke test theo [11_OPERATIONS_AND_RELEASE.md](11_OPERATIONS_AND_RELEASE.md).

## Phụ lục — Preset

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

Chi tiết nâng cao: [03_DYNAMIC_FORM_REFERENCE.md](03_DYNAMIC_FORM_REFERENCE.md) và
[04_ACTION_AND_BATCH_REFERENCE.md](04_ACTION_AND_BATCH_REFERENCE.md).
