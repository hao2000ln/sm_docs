# 03 — Filter và Lookup Reference

Filter gồm hai phần độc lập:

- `filters`: quy định tham số UI được phép lọc và field DBDict dùng để query.
- `filterOptions`: quy định nguồn tạo danh sách lựa chọn cho UI.

Engine phải áp dụng filter trước `doCount()` và `doSelectEx()`. UI không tự lọc dữ liệu sau khi phân trang.

## 1. Khai báo field được phép lọc

Ví dụ lọc nhiều trạng thái của hợp đồng:

```js
filters: {
  statusValues: {
    db: "status",
    maxValues: 50,
    maxLength: 160
  }
}
```

| Thuộc tính | Ý nghĩa |
|---|---|
| `statusValues` | Tên query parameter UI gửi lên API. |
| `db` | Field DBDict thực sự được dùng trong SM query. |
| `maxValues` | Số lựa chọn tối đa trong một request. |
| `maxLength` | Độ dài tối đa của từng giá trị. |

UI gửi một JSON array đã được URL encode:

```text
statusValues=["New","Completed"]
```

Engine tạo điều kiện tương đương:

```text
(status="New" or status="Completed")
```

Không nhận tên bảng, field DBDict hoặc query trực tiếp từ UI.

## 2. Nguồn option của filter

Cấu trúc dùng chung:

```js
filterOptions: {
  status: {
    source: "distinct", // defined | lookup | distinct | dependent
    // cấu hình nguồn đặt tại đây
  }
}
```

### `defined`: danh sách được khai báo sẵn

Dùng khi tập trạng thái nghiệp vụ cố định và cần kiểm soát chính xác option:

```js
filterOptions: {
  status: {
    source: "defined",
    values: ["New", "Waiting", "Completed"],
    lookup: {
      table: "esdDMstatus",
      keyField: "status.en",
      labelField: "status.vi",
      extraFields: {
        color: "color",
        bgcolor: "bgcolor"
      }
    }
  }
}
```

`values` quyết định option nào được xuất hiện. `lookup` chỉ bổ sung tên và màu.

### `lookup`: lấy option từ bảng danh mục

Dùng khi bảng danh mục đã phân vùng đúng cho nghiệp vụ:

```js
filterOptions: {
  status: {
    source: "lookup",
    lookup: {
      table: "esdDMstatus",
      query: 'module="Contract"',
      keyField: "status.en",
      labelField: "status.vi",
      extraFields: {
        color: "color",
        bgcolor: "bgcolor"
      },
      orderBy: "status.vi",
      maxItems: 100
    }
  }
}
```

Không bỏ `query` nếu bảng danh mục chứa trạng thái của nhiều module.

### `distinct`: lấy giá trị thực tế từ bảng nghiệp vụ

Dùng khi filter chỉ nên hiển thị trạng thái đang tồn tại trong dữ liệu hợp đồng:

```js
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
      extraFields: {
        color: "color",
        bgcolor: "bgcolor"
      }
    }
  }
}
```

Luồng xử lý:

1. Chạy `select DISTINCT status from esdHDcontract`.
2. Bỏ giá trị rỗng và giới hạn theo `maxItems`.
3. Batch lookup một lần sang `esdDMstatus` để lấy `status.vi`, `color`, `bgcolor`.
4. Nếu không mapping được, dùng mã gốc làm `label`.

Không query bảng danh mục riêng cho từng giá trị distinct.

### `dependent`: option phụ thuộc lựa chọn cấp cha

Dùng cho bộ lọc phân cấp như sơ đồ tổ chức:

```js
orgLv2: {
  source: "dependent",
  dependsOn: "orgLv1",
  parentParameter: "parentId",
  maxParentLength: 160,
  lookup: {
    table: "esdQTorgUnit",
    keyField: "unit.id",
    labelField: "unit.name",
    query: 'level like "lv2*" and status="Dang hoat dong"',
    parentField: "parent.id",
    orderBy: "unit.name",
    maxItems: 500
  }
}
```

UI chỉ gửi `parentId`. Table, field và query nền do backend cố định. Engine tạo query:

```text
(level like "lv2*" and status="Dang hoat dong") and (parent.id="<parentId>")
```

`parentId` là bắt buộc, được giới hạn độ dài và escape trước khi ghép query.

## 3. API trả option

Service chỉ gọi engine bằng tên option đã khai báo:

```js
function getStatusFilterOptions(request) {
  return CatalogEngine.getFilterOptions(STATUS_CONFIG, "status", request);
}
```

Response chuẩn:

```json
{
  "success": true,
  "data": [
    {
      "value": "Completed",
      "label": "Hoàn thành",
      "color": "#14883B",
      "bgcolor": "#DCF5E4"
    }
  ]
}
```

UI tải API option một lần khi mở màn hình. Phân trang, tìm kiếm và sắp xếp không tải lại option.

### Cache cho filter phân cấp dùng chung

Với dữ liệu SDTC cấp 1/2/3, bật cache ngay tại helper UI:

```js
createCascadingFilters({
  serviceName: "HPT_CommonFilterService",
  uiConfig: serviceConfig,
  cache: {
    enabled: true,
    version: "1",
    scope: "active-org-units",
    ttl: 10 * 60 * 1000
  },
  levels: [
    {
      key: "orgLv1",
      ele: "#orgLv1Filter",
      functionName: "getOrgLevel1",
      parameterName: "unitLv1Values",
      multiple: true,
      placeholder: "Tất cả đơn vị cấp 1",
      cacheTtl: 15 * 60 * 1000
    },
    {
      key: "orgLv2",
      ele: "#orgLv2Filter",
      functionName: "getOrgLevel2",
      parameterName: "unitLv2Values",
      parentParameter: "parentId",
      placeholder: "Tất cả đơn vị cấp 2"
    },
    {
      key: "orgLv3",
      ele: "#orgLv3Filter",
      functionName: "getOrgLevel3",
      parameterName: "unitLv3Values",
      parentParameter: "parentId",
      placeholder: "Tất cả đơn vị cấp 3"
    }
  ]
});
```

Thuộc tính chung:

| Thuộc tính | Ý nghĩa |
|---|---|
| `serviceName` | Tên ScriptLibrary service được Common API gọi. Kết hợp với `functionName` để tạo URL `/api/common/{serviceName}/{functionName}`. |
| `cache` | Cấu hình cache dùng chung cho các cấp. |
| `levels` | Danh sách cấp lọc theo đúng thứ tự cha đến con. |

Thuộc tính của `cache`:

| Thuộc tính | Ý nghĩa |
|---|---|
| `enabled` | `true` để dùng `sessionStorage`; `false` thì mỗi lần cần option sẽ gọi API. Lazy-load vẫn hoạt động khi cache bị tắt. |
| `version` | Phiên bản cache. Tăng giá trị này, ví dụ từ `"1"` lên `"2"`, để bỏ qua toàn bộ cache cũ sau khi thay đổi dữ liệu hoặc quy tắc SDTC. |
| `scope` | Tên miền nghiệp vụ của cache, ví dụ `active-org-units`. Hai tập option khác điều kiện hoặc khác quyền không được dùng chung `scope`. |
| `ttl` | Thời gian sống mặc định tính bằng mili giây. `10 * 60 * 1000` tương ứng 10 phút. |
| `maxEntries` | Số key cascading tối đa trong cùng `scope + context + service`; mặc định 50. Khi vượt giới hạn, cache con ít được dùng gần đây nhất bị xóa trước. |

Thuộc tính của từng phần tử `levels`:

| Thuộc tính | Ý nghĩa |
|---|---|
| `key` | Tên nội bộ duy nhất của cấp, dùng để giữ trạng thái lựa chọn và chống response cũ ghi đè response mới. |
| `ele` | Selector hoặc DOM element được Virtual Select khởi tạo. |
| `functionName` | Function backend trả option của cấp này. |
| `parameterName` | Tên query parameter gửi lựa chọn hiện tại sang API danh sách chính. |
| `parentParameter` | Tên tham số gửi mã cấp cha sang API cấp con; mặc định là `parentId`. |
| `placeholder` | Nội dung hiển thị khi chưa chọn option. |
| `multiple` | Đặt `true` nếu cấp này cho phép chọn nhiều giá trị; mặc định là chọn một. |
| `maxValues` | Giới hạn UX tùy chọn. Helper luôn lấy giá trị nhỏ hơn giữa thuộc tính này và `filters.<parameterName>.maxValues` của service. |
| `search` | Đặt `false` để tắt tìm kiếm trong Virtual Select; mặc định được bật. |
| `cacheTtl` | TTL riêng của cấp, ghi đè `cache.ttl`. Ví dụ cấp 1 dùng 15 phút, cấp 2/3 dùng TTL chung 10 phút. |

Cache dùng `sessionStorage` và được tách theo context path, service, function, `parentId`,
`scope` và `version`. Cấp con vẫn chỉ tải sau khi chọn cấp cha. Tăng `version` khi cần
loại bỏ toàn bộ dữ liệu cache cũ sau khi thay đổi cấu trúc hoặc quy tắc SDTC.
Khi khởi tạo hoặc ghi cache, helper tự xóa entry hết hạn, entry hỏng và version cũ
trong cùng cache family. Mỗi lần đọc cập nhật `lastAccess` để áp dụng giới hạn LRU;
cache cấp 1 được ưu tiên giữ lại khi cần giải phóng dung lượng.

Filter một cấp của màn hình metadata được `HPTScreenRuntime` tạo từ `screen.filters`
và gọi `HPT_ScreenService/getFilterOptions`; không khai báo service riêng theo màn hình.

Các lần khởi tạo giống nhau đang chạy đồng thời dùng chung một Promise. Response thành công mới được ghi cache; lỗi API không được cache.

Luồng gọi API:

1. Mở màn hình: tải cấp 1 nếu chưa có cache hợp lệ.
2. Chọn một hoặc nhiều cấp 1: gửi một danh sách `parentIds`, tải cấp 2 bằng một request rồi loại trùng option.
3. Chọn một hoặc nhiều cấp 2: tải cấp 3 theo cùng cơ chế batch.
4. Chọn lại một cấp cha trong TTL: đọc option cấp con từ cache, không gọi lại API.
5. Cache hết hạn, sai cấu trúc hoặc không truy cập được `sessionStorage`: helper tự gọi API; lỗi cache không làm hỏng bộ lọc.

Hai helper đều mặc định chọn một. Muốn chọn nhiều phải khai báo tường minh
`multiple: true`. `getUiConfig()` công bố `filterRules` an toàn gồm `maxValues` và
`maxLength`, không công bố field DBDict. Khi UI truyền `uiConfig` và `parameterName`, helper
tự áp dụng giới hạn của service. Nếu UI khai báo thêm `maxValues`, helper chỉ chấp nhận
giá trị nhỏ hơn giới hạn service. Backend vẫn kiểm tra lại vì request client có thể bị sửa.

### Lưu lựa chọn search và filter

`stateSaveMode: "workspace"` bật DataTables `stateSave` bằng `localStorage`, chỉ lưu cột hiển thị và global search. Sort, page size và số trang luôn dùng cấu hình mặc định. `stateVersion` dùng để loại bỏ state không còn tương thích:

```js
stateSaveMode: "workspace",
stateVersion: "1"
```

Filter ngoài DataTables được lưu bằng helper:

```js
var store = HPTDataTables.createLocalStateStore({
  key: "DanhSachHopDong",
  version: "1"
});
```

Khi mở lại màn hình, phải khôi phục status và chuỗi SDTC trước khi tạo DataTable để request danh sách đầu tiên đã chứa đầy đủ filter. `localStorage` giữ lựa chọn sau khi đóng tab. Khi tăng `version`, helper tự xóa state phiên bản cũ có cùng context và tên màn hình; gọi `store.clear()` để chủ động xóa version hiện tại.

## 4. Chọn nguồn nào

| Trường hợp | Nguồn nên dùng |
|---|---|
| Tập giá trị cố định theo nghiệp vụ | `defined` |
| Danh mục có điều kiện phân loại rõ ràng | `lookup` |
| Chỉ hiển thị giá trị đang tồn tại trong bảng chính | `distinct` |
| Danh sách con phụ thuộc lựa chọn cấp cha | `dependent` |

Với trạng thái hợp đồng hiện tại, ưu tiên `distinct` kết hợp `lookup`.

## 5. Trạng thái triển khai hiện tại

Engine đã hỗ trợ `filters` và bốn nguồn option `defined`, `lookup`, `distinct`, `dependent` qua `filterOptions`. Hàm `options()` được giữ lại để tương thích với service cũ còn dùng `optionSources`; service mới dùng `getFilterOptions()`.

## 6. Mapping dữ liệu danh sách theo lô

`fields` đọc mã từ bảng chính; `lookups` lấy tên hoặc thuộc tính hiển thị từ bảng
tham chiếu trước khi trả dữ liệu cho DataTables:

```javascript
lookups: [{
  sourceField: "unit_lv1",
  targetField: "unit_lv1_view",
  table: "esdQTorgUnit",
  keyField: "unit.id",
  displayField: "unit.name",
  fallback: "source",
  required: false
}]
```

Engine lấy key không trùng, chia nhóm và query bằng `isin`; không query riêng cho từng
dòng. Lookup có cùng `table`, `keyField` và `extraQuery` được gom chung để tránh N+1.
`fallback: "source"` giữ mã gốc khi thiếu mapping; `required: false` cho phép list tiếp
tục khi lookup phụ lỗi. Dùng `includeTiming=true` để xem `lookupQueries`, `lookupKeys`
và `lookupMs`.
