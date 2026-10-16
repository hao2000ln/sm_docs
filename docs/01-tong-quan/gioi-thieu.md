---
id: gioi-thieu
title: Giới thiệu Hệ thống Quản lý Tài liệu
sidebar_label: 1.1 Giới thiệu chung
sidebar_position: 1
slug: /
description: Bối cảnh chuyển đổi tài liệu sang chuẩn Documentation-as-Code
---

# Giới thiệu Hệ thống Quản lý Tài liệu

Tài liệu này đặc tả kiến trúc và giải pháp số hóa toàn bộ hồ sơ kỹ thuật, thay thế quy trình luân chuyển Word/Excel bằng mô hình **Documentation-as-Code (DaC)**.

:::info Bối cảnh chuyển đổi
Trước đây, các tài liệu thiết kế lưu dạng `.docx` dẫn đến tình trạng:
* Không quản lý được lịch sử thay đổi (diff tracking) từng dòng code.
* Khó review song song thông qua Pull Request / Merge Request.
* Khó tìm kiếm tập trung khi dự án quy mô lớn.
:::

## Mục tiêu kỹ thuật

1. **Version Control**: Quản lý tài liệu bằng Git, gắn liền với chu kỳ release của sản phẩm.
2. **Review tập trung**: Mọi sửa đổi thiết kế bắt buộc phải qua quy trình Peer Review (Code Review).
3. **Tra cứu nhanh**: Hệ thống tìm kiếm full-text search offline ngay trên trình duyệt mà không cần phụ thuộc dịch vụ ngoài.

:::tip Kinh nghiệm triển khai
Nên tích hợp kiểm tra chính tả (`markdownlint`) và format code tự động (`prettier`) vào Git Pre-commit Hook để đảm bảo tính đồng bộ trên toàn team.
:::

:::warning Lưu ý bảo mật
Không ghi trực tiếp thông tin nhạy cảm (mật khẩu database, Private API Keys, Production Tokens) vào các tài liệu thiết kế. Hãy dùng tham chiếu biến môi trường.
:::
