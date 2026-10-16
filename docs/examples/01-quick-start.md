---
id: quick-start
title: Quick Start — Tạo màn hình danh sách
sidebar_label: 01. Quick Start
sidebar_position: 1
description: Hướng dẫn tạo màn hình danh sách tối thiểu với paging, search, filter và export mà không viết HTML.
---

# 01 — Quick Start: Tạo màn hình danh sách

Mục tiêu: tạo một list screen có paging, search, filter và export mà không viết HTML.

Đây là mẫu tối thiểu. Khi cần một ví dụ đầy đủ hơn, xem
`app/scriptlibraries/screens/contracts/ContractListDefinition.js` và checklist tại
[02 — Screen Config Reference](./02-screen-config-reference).

## 1. Tạo ScreenDefinition

Tạo `app/scriptlibraries/screens/<domain>/<Name>ListDefinition.js`:

```javascript
function getDefinition() {
  var presets = lib.HPT_ScreenPresets;
  return {
    schemaVersion: "1",
    definitionVersion: "2026.10.11.1",
    module: "HPT_AssetList",
    requestIdPrefix: "AST",
    table: "esdAsset",
    keyField: "id",
    versionField: "sysmodtime",
    screen: {
      id: "assets",
      version: "1",
      kind: "list",
      title: "Danh sách tài sản",
      state: { key: "AssetList", version: "1" },
      columns: [
        { field: "id", name: "id", title: "Mã", renderer: "text", hideable: false },
        { field: "name", name: "name", title: "Tên", renderer: "text" },
        { field: "sysmodtime", name: "sysmodtime", title: "Cập nhật", renderer: "datetime", visible: false }
      ],
      filters: [],
      selection: presets.selection("none"),
      bulkActions: [],
      actions: [
        { id: "refresh", type: "refresh", label: "Làm mới", enabled: true },
        { id: "export", type: "export", label: "Xuất dữ liệu", filename: "danh-sach-tai-san", enabled: true }
      ]
    },
    actionPermissions: {
      uiConfig: { allow: true }, list: { allow: true },
      filterOptions: { allow: false }, detail: { allow: false },
      create: { allow: false }, update: { allow: false }, delete: { allow: false }
    },
    batchActions: {},
    dataPermission: { enabled: false },
    fields: [
      { api: "id", db: "id", type: "string" },
      { api: "name", db: "name", type: "string" },
      { api: "sysmodtime", db: "sysmodtime", type: "datetime",
        readTransform: function (value) { return funcs.str(value); } }
    ],
    lookups: [], filters: {}, filterOptions: {},
    search: [{ db: "id", mode: "prefix" }, { db: "name", mode: "contains" }],
    sortable: { id: "id", name: "name", sysmodtime: "sysmodtime" },
    defaults: presets.listDefaults({ sortBy: "id", sortDir: "asc", pageSize: 10 }),
    messages: { listSuccess: "Lấy danh sách thành công", listError: "Không thể tải danh sách" }
  };
}
```

## 2. Đăng ký screen

Thêm ánh xạ cố định trong `HPT_ScreenRegistry`. Registry chỉ nhận ID allowlist; không
resolve tên ScriptLibrary do client truyền lên.

## 3. Thêm manifest

Thêm ScriptLibrary mới vào `app/app-manifest.json` sau các dependency framework và trước
registry nếu thứ tự publish yêu cầu.

## 4. Gắn vào HTMLViewer

```javascript
lib.HPT_ScreenView.render("assets");
```

Không tạo HTML/CSS/bootstrap riêng cho từng màn hình.

## 5. Smoke test

1. UI xuất hiện ngay với skeleton.
2. List tải đúng trang đầu, tổng số và sort mặc định.
3. Search dưới `minKeywordLength` không gửi request sai.
4. Làm mới không cần F5.
5. Xuất trang hiện tại và toàn bộ query hoạt động.
6. Request sửa `screenId`, sort/filter lạ bị backend từ chối.

## 6. Khi cần thêm chức năng

- Filter/lookup/form: [02 — Screen Config Reference](./02-screen-config-reference)
- Mutation/custom action: [05 — Action Development](./05-action-development)
- Export/job: [07 — Export và Background Job](./07-export-and-background-jobs)
