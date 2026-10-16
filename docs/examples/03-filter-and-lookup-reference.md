---
id: filter-and-lookup-reference
title: Filter và Lookup Reference
sidebar_label: 03. Filter & Lookup
sidebar_position: 3
description: Bốn nguồn filterOptions (defined, lookup, distinct, dependent), cascade filter phân cấp, cache sessionStorage và mapping dữ liệu theo lô.
---

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

UI chỉ gửi `parentId`. Table, field và query nền do backend cố định.

## 3. API trả option

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

### Cache cho filter phân cấp dùng chung

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

| Thuộc tính `cache` | Ý nghĩa |
|---|---|
| `enabled` | `true` để dùng `sessionStorage`. |
| `version` | Tăng giá trị để bỏ qua toàn bộ cache cũ. |
| `scope` | Tên miền nghiệp vụ của cache, ví dụ `active-org-units`. |
| `ttl` | Thời gian sống mặc định tính bằng mili giây. |
| `maxEntries` | Số key cascading tối đa trong cùng `scope`; mặc định 50. |

## 4. Chọn nguồn nào

| Trường hợp | Nguồn nên dùng |
|---|---|
| Tập giá trị cố định theo nghiệp vụ | `defined` |
| Danh mục có điều kiện phân loại rõ ràng | `lookup` |
| Chỉ hiển thị giá trị đang tồn tại trong bảng chính | `distinct` |
| Danh sách con phụ thuộc lựa chọn cấp cha | `dependent` |

Với trạng thái hợp đồng hiện tại, ưu tiên `distinct` kết hợp `lookup`.

## 5. Mapping dữ liệu danh sách theo lô

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

Engine lấy key không trùng, chia nhóm và query bằng `isin`; không query riêng cho từng dòng. `fallback: "source"` giữ mã gốc khi thiếu mapping; `required: false` cho phép list tiếp tục khi lookup phụ lỗi.
