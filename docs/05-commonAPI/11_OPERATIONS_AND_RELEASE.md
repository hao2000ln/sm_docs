# 11 — Vận hành và Phát hành V1

## Mục tiêu hiệu năng

- Paging backend ổn định với tập dữ liệu lớn.
- Không phát sinh N+1 lookup hoặc select từng item trong batch core.
- UI hiển thị skeleton ngay; filter/list được tải song song khi phù hợp.
- Đo `countMs`, `selectMs`, `lookupMs`, `lookupQueries` trước khi tối ưu.
- Export lớn và tác vụ dài chuyển sang background job.

## Thứ tự publish

```text
1. Backup/export artifact hiện tại
2. Publish ScriptLibrary theo app-manifest.json
3. Deploy WebTier static/Java nếu framework thay đổi
4. Merge cấu hình, không ghi đè web.xml toàn bộ
5. Restart WebTier khi Java/class thay đổi
6. Smoke test
```

Chỉ thay ScreenDefinition/domain ScriptLibrary thì không cần build lại Java. Thay endpoint
whitelist/servlet mới cần build và deploy WebTier.

## Smoke test tối thiểu

- First paint có skeleton, không màn hình trắng.
- List/search/filter/sort/paging đúng.
- Refresh nhận dữ liệu mới, không cần F5.
- Update prefill đúng; money/date/lookup/validation hoạt động.
- Create/update/delete reload list.
- Stale `sysmodtime` trả conflict, không ghi đè.
- Row lỗi giữ selection và xem được lý do.
- Export trang hiện tại/toàn query đúng cột và tiếng Việt.
- Permission/data scope bị kiểm tra ở backend.

## Cache frontend

Khi sửa asset dùng chung, tăng theo chuỗi:

```text
asset version trong hpt_csp_loader
 → loader version trong hpt_screen_bootstrap
 → bootstrap version trong HPT_ScreenView
```

Publish `HPT_ScreenView`, đóng tab cũ và mở lại. `Ctrl+Shift+R` chỉ là bước kiểm chứng,
không thay cho cache version đúng.

## Chẩn đoán nhanh

| Hiện tượng | Kiểm tra |
| --- | --- |
| UI không đổi | asset URL/version trong Network |
| List không reload | request `list`, count cache, adapter invalidate |
| Action bị khóa | selection, `enableIf`, permission/backend limit |
| Conflict không phát hiện | list có `sysmodtime`, request gửi đúng version |
| Export lỗi selector | dùng `:not(.hpt-selection-column):visible` |
| ScriptLibrary error | manifest, dependency, function publish |
| Job treo | status, worker scheduler, heartbeat, executor registry |

## Tiêu chí chốt V1 Pilot

- Smoke test trên SM thật pass.
- DBDict/table/permission khớp môi trường.
- Có rollback artifact App và WebTier.
- Không còn raw query/table/field do client điều khiển.
- Các giới hạn list/action/export đã cấu hình.
- Known limitations được ghi rõ trong release note.

## Release checklist

### Trước khi publish

- Chạy toàn bộ regression test: `node webapps/sm/HPT_Config/api_v1/tests/run_all.js`.
- Xác nhận definition, manifest và registry không còn dependency thiếu.
- Review permission, data scope, giới hạn list/action/import/export và cấu hình production.
- Tạo bản backup artifact App/WebTier cùng hướng dẫn rollback.

### Sau khi publish

- Mở tab mới và kiểm tra asset version trong Network; không dùng cache trình duyệt cũ để kết luận.
- Chạy smoke test list, detail, filter, action, conflict, export và import đang được bật.
- Kiểm tra log App Server/WebTier, background job và bảng nghiệp vụ sau mutation.
- Xác nhận user không có quyền bị từ chối và không nhìn thấy dữ liệu ngoài scope.

### Rollback

1. Dừng nhận mutation/import mới nếu release có lỗi dữ liệu.
2. Khôi phục artifact đã backup theo đúng tầng bị thay đổi.
3. Khôi phục `web.xml` bằng bản merge đã lưu nếu có thay đổi Java/WebTier.
4. Restart WebTier khi class hoặc servlet config thay đổi.
5. Chạy lại smoke test tối thiểu và ghi nhận nguyên nhân rollback.

