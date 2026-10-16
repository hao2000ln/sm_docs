# 08 — Security và Data Scope

## Cấu hình pilot

```javascript
dataPermission: {
  enabled: true,
  subModule: "00401",
  unitFields: ["unit.lv1", "unit.lv2", "unit.lv3"],
  ownerField: "created.by",
  includeOwner: true,
  maxUnits: 500
}
```

- `subModule` phải khớp mã phân quyền dữ liệu của nghiệp vụ trên SM.
- Tên field chỉ được khai báo trong metadata backend, client không được gửi các giá trị này.
- Thiếu contact, scope, provider hoặc cấu hình hợp lệ sẽ từ chối truy cập (fail closed).
- Scope toàn quyền trả về query `true`; scope cá nhân giới hạn theo `ownerField`; scope đơn vị giới hạn theo `unitFields` và danh sách đơn vị được cấp.

## Phạm vi đã áp dụng

- `list`: select, filtered count và unfiltered count dùng cùng một scope.
- `detail`, `update`, `delete`: scope được ghép cùng khóa bản ghi trước khi đọc hoặc ghi.
- Bản ghi ngoài phạm vi được xử lý giống bản ghi không tồn tại để không làm lộ dữ liệu.

## Quyền thao tác

Mỗi screen khai báo quyền tại backend:

```javascript
actionPermissions: {
  uiConfig: { allow: true },
  list: { allow: true },
  filterOptions: { allow: true },
  detail: { allow: false },
  create: { allow: false },
  update: { allow: false },
  delete: { allow: false }
}
```

- Action không được khai báo sẽ bị từ chối.
- `allow: true` chỉ phù hợp với action đã được phép cho toàn bộ người dùng đăng nhập của screen.
- Nghiệp vụ cần quyền riêng phải dùng `checker` server-side trong metadata; client không được truyền tên checker hay permission.
- Action authorization và data scope là hai bước độc lập: có quyền update vẫn chỉ update được bản ghi nằm trong data scope.

## Việc còn lại trước production

- Xác nhận `00401`, `unit.lv1..3` và `created.by` với cấu hình phân quyền thực tế.
- Kết nối `checker` action với nguồn quyền nghiệp vụ thực tế của từng module.
- Xác định write-scope cho create; không suy diễn quyền tạo từ quyền đọc.
- Áp dụng scope phù hợp cho lookup và `filterOptions` nếu dữ liệu tùy thuộc người dùng.
- Bổ sung audit cho các lần từ chối và mutation.
