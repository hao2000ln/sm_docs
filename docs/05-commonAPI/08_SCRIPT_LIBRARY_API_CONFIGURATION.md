# 08 — Cấu hình API gọi ScriptLibrary.function

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

`CommonApiService` không cho phép gọi tùy ý mọi ScriptLibrary. Mỗi cặp
`ScriptLibrary/function` phải được đăng ký cố định trong Java.

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
| `true` hoặc không khai báo | Chế độ an toàn mặc định: bắt buộc endpoint và HTTP method nằm trong `ENDPOINTS`. |
| `false` | **DEV ONLY**: cho phép mọi cặp tên ScriptLibrary/function hợp lệ với `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. |

Khi chế độ DEV mở, servlet vẫn giữ kiểm tra session đăng nhập SM, cú pháp path,
JSON/body size, giới hạn header chuyển tiếp và từ chối `HEAD`. Response có header
`X-HPT-CommonApi-Policy: development-open`, đồng thời Tomcat ghi cảnh báo lúc
khởi tạo servlet.

Không sử dụng `false` ở staging/production. Trước khi phát hành phải đổi về
`true`, restart Tomcat và kiểm tra endpoint ngoài `ENDPOINTS` trả
`404 ENDPOINT_NOT_ALLOWED`.

### Cơ chế bảo mật hiện có

API này không phải API public ẩn danh. Request phải đi qua các lớp kiểm tra sau:

| Lớp bảo vệ | Cơ chế hiện tại |
| --- | --- |
| Xác thực | Bắt buộc có HTTP session và WebTier controller đang đăng nhập SM. Thiếu hoặc hết session trả `401 AUTHENTICATION_REQUIRED`. |
| Allowlist endpoint | Chỉ gọi được đúng cặp `ScriptLibrary/function` đã khai báo trong `ENDPOINTS`. Endpoint khác trả `404 ENDPOINT_NOT_ALLOWED`. |
| Allowlist HTTP method | Mỗi endpoint chỉ nhận method đã đăng ký; method khác trả `405 METHOD_NOT_ALLOWED`. |
| Kiểm tra path | URL phải có đúng hai segment và tên phải là JavaScript identifier hợp lệ, tối đa 128 ký tự. |
| Kiểm soát body | `POST`, `PUT`, `PATCH` chỉ nhận JSON và giới hạn tối đa 1 MiB. |
| Giới hạn header chuyển vào SM | Chỉ một số header cần thiết được chuyển tiếp; không đưa toàn bộ header tùy ý vào ScriptLibrary. |
| Chống submit trùng | Một số mutation của `HPT_ScreenService` bắt buộc `Idempotency-Key`, lưu theo session trong 10 phút. |
| Response | JSON UTF-8, `Cache-Control: no-store` và `X-Content-Type-Options: nosniff`. |

Ví dụ URL sau **không thể gọi được** nếu chưa có entry tương ứng trong `ENDPOINTS`,
dù ScriptLibrary và function thực sự tồn tại:

```text
/sm/api/common/SomeInternalLibrary/deleteEverything
```

### Phần servlet không tự bảo vệ thay ScriptLibrary

`CommonApiService` chỉ xác nhận người gọi đã đăng nhập, nhưng không tự biết người đó có
quyền xem hoặc sửa dữ liệu nghiệp vụ nào. Mỗi endpoint custom vẫn phải tự thực hiện:

- kiểm tra action permission;
- áp dụng data scope theo đơn vị/chủ sở hữu;
- allowlist table, DBDict field và giá trị đầu vào;
- chống optimistic-lock conflict cho thao tác ghi;
- giới hạn số bản ghi, paging và khối lượng xử lý.

Các endpoint generic của `HPT_ScreenService` đã đi qua `HPT_ApiSecurity` và metadata
`actionPermissions`/`dataPermission`. Function custom mới phải gọi cơ chế bảo mật tương
đương; không được chỉ dựa vào việc request có session.

### Giới hạn cần lưu ý

- Servlet hiện không cung cấp API key, OAuth hoặc JWT cho client bên ngoài.
- Servlet hiện không tự kiểm tra CSRF token/`Origin`; mức bảo vệ cookie phụ thuộc cấu hình
  session của WebTier. Mutation nhạy cảm nên bổ sung CSRF protection nếu mở ngoài UI SM.
- Idempotency hiện chỉ áp dụng cho một số function của `HPT_ScreenService`; POST custom
  không tự động được bảo vệ trừ khi cập nhật `requiresIdempotency(...)`.
- Chưa có rate limiting riêng ở servlet. Nếu công bố ra ngoài mạng nội bộ, cần đặt sau
  reverse proxy/API gateway có TLS, rate limit và access log.

## 2. Contract của function

Function public phải:

1. Nhận đúng một tham số `request`.
2. Không tin dữ liệu từ `request.query` hoặc `request.body`; luôn validate và allowlist.
3. Tự kiểm tra permission và data scope nếu đọc/ghi dữ liệu nghiệp vụ.
4. Trả object có thể serialize thành JSON.
5. Không trả trực tiếp `SCFile`, `SCDatum` hoặc Java object.

Request chuyển vào ScriptLibrary có dạng:

```javascript
{
  method: "GET",
  serviceName: "HPT_ApiExample",
  functionName: "ping",
  contextPath: "/sm",
  servletPath: "/api/common",
  requestUri: "/sm/api/common/HPT_ApiExample/ping",
  queryString: "name=HPT",
  query: { name: "HPT" },
  headers: {
    "x-request-id": "optional-request-id",
    "accept": "application/json"
  },
  body: null
}
```

Với tham số query xuất hiện nhiều lần, `request.query[field]` là một mảng.

## 3. Ví dụ ScriptLibrary kiểm thử

Tạo ScriptLibrary tên `HPT_ApiExample`:

```javascript
/**
 * ScriptLibrary name: HPT_ApiExample
 * API smoke test; không truy cập bảng nghiệp vụ.
 */

function apiExampleText(value, maxLength) {
  var text = value === undefined || value === null ? "" : String(value);
  text = text.replace(/^\s+|\s+$/g, "");
  return text.substring(0, maxLength);
}

// GET /sm/api/common/HPT_ApiExample/ping?name=HPT
function ping(request) {
  request = request || {};
  var query = request.query || {};
  var name = apiExampleText(query.name, 100) || "guest";
  return {
    success: true,
    code: "API_SMOKE_TEST_OK",
    message: "Common API gọi ScriptLibrary thành công",
    data: {
      greeting: "Xin chào " + name,
      method: request.method || "",
      serviceName: request.serviceName || "",
      functionName: request.functionName || ""
    }
  };
}

// POST /sm/api/common/HPT_ApiExample/echo
function echo(request) {
  request = request || {};
  var body = request.body;
  if (!body || typeof body !== "object") {
    return {
      success: false,
      code: "INVALID_BODY",
      message: "Body JSON là bắt buộc"
    };
  }
  return {
    success: true,
    code: "API_ECHO_OK",
    data: {
      value: apiExampleText(body.value, 200)
    }
  };
}
```

## 4. Đăng ký endpoint trong Java

Mở:

```text
webapps/sm/WEB-INF/classes/com/hpt/api/CommonApiService.java
```

Thêm endpoint vào `ENDPOINTS`:

```java
private static final Map<String, Endpoint> ENDPOINTS = Map.ofEntries(
        endpoint("HPT_ApiExample", "ping", "GET"),
        endpoint("HPT_ApiExample", "echo", "POST"),
        // Các endpoint hiện có...
);
```

Có thể khai báo nhiều method nếu function thực sự hỗ trợ chúng:

```java
endpoint("HPT_MyService", "save", "PUT", "PATCH")
```

Không đăng ký wildcard và không lấy tên ScriptLibrary/function từ cấu hình do client gửi.

## 5. Servlet mapping

Mapping chung chỉ khai báo một lần trong `web.xml`; không thêm mapping cho từng API:

```xml
<servlet>
  <servlet-name>CommonApiService</servlet-name>
  <servlet-class>com.hpt.api.CommonApiService</servlet-class>
</servlet>

<servlet-mapping>
  <servlet-name>CommonApiService</servlet-name>
  <url-pattern>/api/common/*</url-pattern>
</servlet-mapping>
```

Nếu mapping trên đã tồn tại thì giữ nguyên.

## 6. Compile và deploy Java

Chạy PowerShell tại thư mục gốc Tomcat 10:

```powershell
javac -encoding UTF-8 `
  -cp "lib/*;webapps/sm/WEB-INF/lib/*;webapps/sm/WEB-INF/classes" `
  -d "webapps/sm/WEB-INF/classes" `
  "webapps/sm/WEB-INF/classes/com/hpt/api/CommonApiService.java"
```

Kiểm tra các file đã sinh:

```powershell
Get-ChildItem "webapps/sm/WEB-INF/classes/com/hpt/api/CommonApiService*.class"
```

Phải deploy cả `CommonApiService.class` và các nested class
`CommonApiService$*.class`. Sau đó restart Tomcat để nạp class mới.

> Tomcat 10 dùng `jakarta.servlet.*`. Bản Tomcat 9 phải dùng source tương thích
> `javax.servlet.*`; không copy trực tiếp class đã compile giữa hai phiên bản.

## 7. Kiểm thử GET

Đăng nhập SM trước, sau đó mở DevTools Console ngay trong tab SM:

```javascript
fetch("/sm/api/common/HPT_ApiExample/ping?name=HPT", {
  method: "GET",
  headers: { "Accept": "application/json" },
  credentials: "same-origin"
})
  .then(function (response) {
    return response.json().then(function (body) {
      return { status: response.status, body: body };
    });
  })
  .then(console.log)
  .catch(console.error);
```

Kết quả mong đợi:

```json
{
  "success": true,
  "code": "API_SMOKE_TEST_OK",
  "message": "Common API gọi ScriptLibrary thành công",
  "data": {
    "greeting": "Xin chào HPT",
    "method": "GET",
    "serviceName": "HPT_ApiExample",
    "functionName": "ping"
  }
}
```

## 8. Kiểm thử POST

```javascript
fetch("/sm/api/common/HPT_ApiExample/echo", {
  method: "POST",
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json"
  },
  credentials: "same-origin",
  body: JSON.stringify({ value: "Dữ liệu kiểm thử" })
})
  .then(function (response) {
    return response.json().then(function (body) {
      return { status: response.status, body: body };
    });
  })
  .then(console.log)
  .catch(console.error);
```

Kết quả mong đợi:

```json
{
  "success": true,
  "code": "API_ECHO_OK",
  "data": {
    "value": "Dữ liệu kiểm thử"
  }
}
```

## 9. HTTP status và lỗi thường gặp

| HTTP | Code thường gặp | Nguyên nhân |
| --- | --- | --- |
| `200` | — | Function chạy và trả `success: true` |
| `400` | `INVALID_PATH`, `INVALID_JSON` | URL hoặc JSON không hợp lệ |
| `401` | `AUTHENTICATION_REQUIRED` | Chưa đăng nhập hoặc session SM hết hạn |
| `404` | `ENDPOINT_NOT_ALLOWED` | Chưa đăng ký cặp service/function trong `ENDPOINTS` |
| `404` | `FUNCTION_NOT_FOUND` | Sai tên ScriptLibrary/function hoặc chưa publish ScriptLibrary |
| `405` | `METHOD_NOT_ALLOWED` | HTTP method không nằm trong allowlist |
| `413` | `PAYLOAD_TOO_LARGE` | Body vượt 1 MiB |
| `415` | `CONTENT_TYPE_REQUIRED` | Request có body nhưng thiếu `application/json` |
| `502` | `SCRIPT_LIBRARY_ERROR` | Function phát sinh exception trên SM |
| `502` | `SM_BACKEND_UNAVAILABLE` | WebTier không gọi được SM backend |

Nếu response object có `success: false`, servlet ánh xạ status theo error contract;
tham khảo [10_API_RESPONSE_REFERENCE.md](10_API_RESPONSE_REFERENCE.md).

## 10. Checklist tạo endpoint mới

- [ ] ScriptLibrary và function đã publish, đúng chữ hoa/thường.
- [ ] Function chỉ nhận một object `request`.
- [ ] Query/body đã validate và không nhận raw table, DBDict field hoặc raw query.
- [ ] Permission và data scope được kiểm tra trong backend nghiệp vụ.
- [ ] Cặp ScriptLibrary/function/method đã thêm vào `ENDPOINTS`.
- [ ] Java compile thành công và toàn bộ nested class đã được deploy.
- [ ] Tomcat đã restart.
- [ ] Test bằng session SM đang đăng nhập.
- [ ] Kiểm tra cả happy path, sai method, thiếu session và input không hợp lệ.

