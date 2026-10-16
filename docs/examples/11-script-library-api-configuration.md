---
id: script-library-api-configuration
title: Cấu hình API gọi ScriptLibrary.function
sidebar_label: 11. ScriptLibrary API
sidebar_position: 11
description: Công bố ScriptLibrary qua Common API, cơ chế bảo mật, contract function, ví dụ ping/echo, đăng ký endpoint Java và checklist kiểm thử.
---

# 11 — Cấu hình API gọi ScriptLibrary.function

Tài liệu này hướng dẫn công bố một function của Service Manager ScriptLibrary qua URL:

```text
/sm/api/common/{ScriptLibrary}/{function}
```

Ví dụ:

```text
/sm/api/common/HPT_ApiExample/ping
```

## 1. Luồng xử lý

```text
Trình duyệt đã đăng nhập SM
  → CommonApiService
  → kiểm tra endpoint + HTTP method trong allowlist
  → RemoteJavascriptCall
  → lib.HPT_ApiExample.ping(request)
  → JSON response
```

`CommonApiService` không cho phép gọi tùy ý mọi ScriptLibrary. Mỗi cặp `ScriptLibrary/function` phải được đăng ký cố định trong Java.

### Chế độ mở tạm thời dành cho DEV

`web.xml` hỗ trợ context parameter:

```xml
<context-param>
  <param-name>hpt.commonApi.endpointAllowlist.enabled</param-name>
  <param-value>true</param-value>
</context-param>
```

| Giá trị | Hành vi |
| --- | --- |
| `true` hoặc không khai báo | Chế độ an toàn mặc định: bắt buộc endpoint nằm trong `ENDPOINTS`. |
| `false` | **DEV ONLY**: cho phép mọi cặp tên ScriptLibrary/function hợp lệ. |

:::danger Không dùng `false` ở staging/production
Trước khi phát hành phải đổi về `true`, restart Tomcat và kiểm tra endpoint ngoài `ENDPOINTS` trả `404 ENDPOINT_NOT_ALLOWED`.
:::

### Cơ chế bảo mật hiện có

| Lớp bảo vệ | Cơ chế hiện tại |
| --- | --- |
| Xác thực | Bắt buộc có HTTP session SM. Thiếu/hết session trả `401`. |
| Allowlist endpoint | Chỉ gọi được cặp `ScriptLibrary/function` đã khai báo trong `ENDPOINTS`. |
| Allowlist HTTP method | Mỗi endpoint chỉ nhận method đã đăng ký; method khác trả `405`. |
| Kiểm tra path | URL phải có đúng hai segment và tên là JavaScript identifier hợp lệ, tối đa 128 ký tự. |
| Kiểm soát body | `POST`, `PUT`, `PATCH` chỉ nhận JSON và giới hạn tối đa 1 MiB. |
| Response | JSON UTF-8, `Cache-Control: no-store` và `X-Content-Type-Options: nosniff`. |

## 2. Contract của function

Function public phải:

1. Nhận đúng một tham số `request`.
2. Không tin dữ liệu từ `request.query` hoặc `request.body`; luôn validate và allowlist.
3. Tự kiểm tra permission và data scope nếu đọc/ghi dữ liệu nghiệp vụ.
4. Trả object có thể serialize thành JSON.
5. Không trả trực tiếp `SCFile`, `SCDatum` hoặc Java object.

Cấu trúc object `request`:

```javascript
{
  method: "GET",
  serviceName: "HPT_ApiExample",
  functionName: "ping",
  contextPath: "/sm",
  queryString: "name=HPT",
  query: { name: "HPT" },
  headers: { "x-request-id": "optional" },
  body: null
}
```

## 3. Ví dụ ScriptLibrary kiểm thử

Tạo ScriptLibrary tên `HPT_ApiExample`:

```javascript
// GET /sm/api/common/HPT_ApiExample/ping?name=HPT
function ping(request) {
  request = request || {};
  var query = request.query || {};
  var name = String(query.name || "").substring(0, 100) || "guest";
  return {
    success: true,
    code: "API_SMOKE_TEST_OK",
    message: "Common API gọi ScriptLibrary thành công",
    data: {
      greeting: "Xin chào " + name,
      method: request.method || "",
      serviceName: request.serviceName || ""
    }
  };
}

// POST /sm/api/common/HPT_ApiExample/echo
function echo(request) {
  request = request || {};
  var body = request.body;
  if (!body || typeof body !== "object") {
    return { success: false, code: "INVALID_BODY", message: "Body JSON là bắt buộc" };
  }
  return {
    success: true,
    code: "API_ECHO_OK",
    data: { value: String(body.value || "").substring(0, 200) }
  };
}
```

## 4. Đăng ký endpoint trong Java

Mở `CommonApiService.java` và thêm vào `ENDPOINTS`:

```java
private static final Map<String, Endpoint> ENDPOINTS = Map.ofEntries(
    endpoint("HPT_ApiExample", "ping", "GET"),
    endpoint("HPT_ApiExample", "echo", "POST")
);
```

Có thể khai báo nhiều method:

```java
endpoint("HPT_MyService", "save", "PUT", "PATCH")
```

## 5. Compile và deploy Java

```powershell
javac -encoding UTF-8 `
  -cp "lib/*;webapps/sm/WEB-INF/lib/*;webapps/sm/WEB-INF/classes" `
  -d "webapps/sm/WEB-INF/classes" `
  "webapps/sm/WEB-INF/classes/com/hpt/api/CommonApiService.java"
```

Phải deploy cả `CommonApiService.class` và các nested class `CommonApiService$*.class`. Sau đó restart Tomcat.

## 6. Kiểm thử

```javascript
// GET
fetch("/sm/api/common/HPT_ApiExample/ping?name=HPT", {
  method: "GET",
  headers: { "Accept": "application/json" },
  credentials: "same-origin"
})
  .then(r => r.json()).then(console.log);

// POST
fetch("/sm/api/common/HPT_ApiExample/echo", {
  method: "POST",
  headers: { "Accept": "application/json", "Content-Type": "application/json" },
  credentials: "same-origin",
  body: JSON.stringify({ value: "Dữ liệu kiểm thử" })
})
  .then(r => r.json()).then(console.log);
```

## 7. HTTP status và lỗi thường gặp

| HTTP | Code | Nguyên nhân |
| --- | --- | --- |
| `200` | — | Function chạy thành công |
| `401` | `AUTHENTICATION_REQUIRED` | Chưa đăng nhập hoặc session hết hạn |
| `404` | `ENDPOINT_NOT_ALLOWED` | Chưa đăng ký trong `ENDPOINTS` |
| `404` | `FUNCTION_NOT_FOUND` | Sai tên hoặc chưa publish ScriptLibrary |
| `405` | `METHOD_NOT_ALLOWED` | HTTP method không nằm trong allowlist |
| `413` | `PAYLOAD_TOO_LARGE` | Body vượt 1 MiB |
| `502` | `SCRIPT_LIBRARY_ERROR` | Function phát sinh exception trên SM |

## 8. Checklist tạo endpoint mới

- [ ] ScriptLibrary và function đã publish, đúng chữ hoa/thường.
- [ ] Query/body đã validate; không nhận raw table, DBDict field hoặc raw query.
- [ ] Permission và data scope được kiểm tra trong backend nghiệp vụ.
- [ ] Cặp ScriptLibrary/function/method đã thêm vào `ENDPOINTS`.
- [ ] Java compile thành công và tất cả nested class đã được deploy.
- [ ] Tomcat đã restart.
- [ ] Test bằng session SM đang đăng nhập.
