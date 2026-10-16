---
id: danh-sach-api
title: Danh sách API Endpoints
sidebar_label: 3.1 REST Endpoints
sidebar_position: 1
---

# Danh sách API Endpoints

Tài liệu đặc tả các giao thức giao tiếp giữa Client và Backend Server.

## 1. Authentication

| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Đăng nhập tài khoản |
| `POST` | `/api/v1/auth/refresh` | Public | Làm mới Access Token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Đăng xuất |
