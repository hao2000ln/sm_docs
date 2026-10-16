---
id: so-do
title: Sơ đồ Luồng dữ liệu và Tương tác
sidebar_label: 2.1 Sơ đồ tương tác
sidebar_position: 1
description: Chi tiết luồng xác thực và xử lý sự kiện bất đồng bộ
---

# Sơ đồ Kiến trúc & Luồng Tương tác

Trang này mô tả chi tiết quy trình xử lý của API Gateway và hệ thống Backend thông qua sơ đồ Mermaid.

## 1. Sơ đồ tuần tự xác thực (Authentication Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client App
    participant Gateway as API Gateway
    participant Auth as Auth Service (JWT)
    participant Core as Core Business Service

    User->>Gateway: POST /api/v1/auth/login {credentials}
    Gateway->>Auth: Validate Credentials
    alt Sai thông tin
        Auth-->>Gateway: 401 Unauthorized
        Gateway-->>User: Hiển thị lỗi xác thực
    else Hợp lệ
        Auth-->>Gateway: 200 OK + JWT Token (Signed)
        Gateway-->>User: Trả về Token + Refresh Token
    end

    User->>Gateway: GET /api/v1/orders (Bearer Token)
    Gateway->>Gateway: Verify Token Signature
    Gateway->>Core: Forward Request (User ID, Roles)
    Core-->>Gateway: 200 OK (Orders Data)
    Gateway-->>User: Trả về dữ liệu đơn hàng
```

## 2. Kiến trúc xử lý luồng dữ liệu (Dataflow Architecture)

```mermaid
flowchart TD
    subgraph Frontend Tier
        A[Web Portal]
        B[Mobile Client]
    end

    subgraph Ingress Tier
        C[Cloudflare CDN / WAF]
        D[Reverse Proxy & API Gateway]
    end

    subgraph Microservices Tier
        E[Auth Service]
        F[Order Service]
        G[Payment Service]
    end

    subgraph Data & Message Broker
        H[(PostgreSQL Main)]
        I[(Redis Cache)]
        J{{Apache Kafka}}
    end

    A & B --> C
    C --> D
    D --> E
    D --> F
    D --> G

    F --> H
    F --> I
    F -.->|Publish Event| J
    J -.->|Consume Event| G
```

## 3. Cấu hình biến môi trường mẫu

Dưới đây là tệp khai báo chuẩn kết nối cho dịch vụ API Gateway:

```yaml
server:
  port: 8080
  contextPath: /api/v1

security:
  jwt:
    issuer: auth.company.internal
    expirationTime: 3600 # 1 giờ
    publicKeyPath: /etc/secrets/jwt_public.pem

database:
  host: pg-cluster.internal
  port: 5432
  name: order_db
  pool:
    maxSize: 20
    minIdle: 5
```
