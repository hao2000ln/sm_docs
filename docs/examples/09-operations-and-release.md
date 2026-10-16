---
id: operations-and-release
title: Vận hành và Phát hành V1
sidebar_label: 09. Operations & Release
sidebar_position: 9
description: Mục tiêu hiệu năng, thứ tự publish, smoke test tối thiểu, cache frontend và bảng chẩn đoán nhanh.
---

# 09 — Vận hành và Phát hành V1

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

Chỉ thay ScreenDefinition/domain ScriptLibrary thì không cần build lại Java. Thay endpoint whitelist/servlet mới cần build và deploy WebTier.

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

Publish `HPT_ScreenView`, đóng tab cũ và mở lại. `Ctrl+Shift+R` chỉ là bước kiểm chứng, không thay cho cache version đúng.

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
