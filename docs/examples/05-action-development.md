---
id: action-development
title: Phát triển Action
sidebar_label: 05. Action Development
sidebar_position: 5
description: Kiến trúc custom action, lifecycle, quy tắc bắt buộc và checklist thêm action mới cho Common API V1.
---

# 05 — Phát triển Action

## Chọn loại action

| Nhu cầu | Cách làm |
| --- | --- |
| Refresh/export | `screen.actions` chuẩn |
| Update field đơn giản | batch `operation: "update"` + `writes` |
| Nhiều bảng, lịch sử, mail, rule đặc thù | `operation: "custom"` |
| Tạo từ danh sách liên quan | screen action + `selector` |

Dynamic Form, selector, hộp xác nhận và Excel Import dùng chung `HPTModalPortal`; backdrop phủ toàn bộ WebTier thay vì chỉ frame danh sách. Loading khi thực thi vẫn cấu hình độc lập bằng `execution.maskScope: "framework"`.

## Phạm vi popup và loading

| Cơ chế | Cấu hình hiện tại | Ý nghĩa |
| --- | --- | --- |
| Popup/backdrop | `HPTModalPortal` | Hiện mặc định portal lên frame cao nhất cùng origin |
| Loading API | `execution.maskScope: "screen"` | Chỉ khóa frame chứa màn hình hiện tại |
| Loading API | `execution.maskScope: "framework"` | Khóa frame WebTier lớn nhất |
| Loading API | `execution.maskScope: "none"` | Không hiển thị loading mask |

Ví dụ mask toàn bộ WebTier:

```javascript
execution: {
  maskScope: "framework",
  maskMessage: "Đang tạo dữ liệu...",
  preventClose: true,
  preventDuplicate: true
}
```

## Kiến trúc custom action

```text
ScreenDefinition
 → BatchActionEngine
 → ActionOrchestrator
 → ActionRegistry
 → DomainActionRegistry
 → DomainActions
 → DomainService
 → DomainRepository
```

- **Definition**: UI, permission, giới hạn, `handlerId`.
- **Registry**: allowlist handler cố định.
- **Actions**: lifecycle adapter.
- **Service**: business rule.
- **Repository**: `SCFile`/persistence.

## Ví dụ khai báo

```javascript
screen: { bulkActions: [{
  id: "approve", label: "Duyệt", style: "primary",
  confirm: true, enableIf: { minSelected: 1, maxSelected: 20 }
}]},
actionPermissions: { "batch:approve": { allow: true } },
batchActions: {
  approve: {
    enabled: true, enforceEnableIf: true,
    maxItems: 20, chunkSize: 20,
    transactionMode: "perItem",
    operation: "custom",
    handlerId: "assets.approve"
  }
}
```

Domain registry:

```javascript
function getDefinitions() {
  return {
    "assets.approve": {
      enabled: true,
      library: "HPT_AssetActions",
      factory: "getApproveHandler"
    }
  };
}
```

## Lifecycle

```text
prepare → validateItem → executeItem → afterItem → finalize → cleanup
```

- `prepare`: validate/query dữ liệu dùng chung một lần.
- `validateItem`: **không được** ghi dữ liệu.
- `executeItem`: xử lý một record đã qua scope và optimistic locking.
- `afterItem`: hậu xử lý nhẹ; lỗi trả warning, không giả vờ rollback.
- `finalize`: tổng hợp hoặc tạo outbox/job; không gửi mail/webhook đồng bộ.
- `cleanup`: giải phóng resource kể cả khi có lỗi.

## Quy tắc bắt buộc

1. Client không truyền handler/library/table/DB field.
2. Registry domain phải allowlist handler.
3. Repository không chứa UI; Definition không chứa persistence.
4. Gửi `{ id, sysmodtime }`; engine phát hiện bản ghi bị sửa đồng thời.
5. `transactionMode: "perItem"` cho phép partial success, không phải transaction nhiều bảng.
6. Mail/integration dùng outbox hoặc background job có retry.
7. Sau mutation thành công runtime reload danh sách và xóa selection phù hợp.

## Checklist thêm action

1. Khai báo nút, permission và backend action.
2. Viết Repository → Service → Actions.
3. Đăng ký DomainActionRegistry; domain mới phải đăng ký namespace trung tâm.
4. Thêm ScriptLibrary vào manifest đúng thứ tự.
5. Test permission, scope, stale `sysmodtime`, partial success và retry.
