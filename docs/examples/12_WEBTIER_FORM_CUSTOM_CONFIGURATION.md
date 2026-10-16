# 12 — Cấu hình custom WebTier và Form Designer

Tài liệu này là nơi tra cứu tập trung các cấu hình HPT áp dụng cho control của
Service Manager Form Designer. Các cấu hình đều theo cơ chế **opt-in**: chỉ field
có `Button ID` tương ứng mới bị thay đổi; control Core còn lại giữ nguyên.

## 1. Vị trí triển khai

| Thành phần | Vị trí |
| --- | --- |
| Runtime định dạng | `webapps/sm/js/hpt/hpt-input-format.js` |
| CSS định dạng input | `webapps/sm/css/hpt/components/input-format.css` |
| Điểm nạp runtime | `webapps/sm/cwc/index.jsp` |
| Validator datetime debug/source | `webapps/sm/js/9.81.0017/debug/datetime.js` |
| Bundle production | `webapps/sm/js/9.81.0017/sm.base.js` |
| Công cụ build bundle | `HPT_Release/tools/build-jsb-bundle.js` |

Không sửa trực tiếp `sm.base.js`. Khi thay đổi `debug/datetime.js`, build lại:

```powershell
node HPT_Release/tools/build-jsb-bundle.js sm.base webtier_js
node --check webapps/sm/js/9.81.0017/sm.base.js
```

## 2. Danh sách Button ID hỗ trợ

| Button ID | Công dụng | Giá trị hiển thị ví dụ | Giá trị gửi server ví dụ |
| --- | --- | --- | --- |
| `moneydecimal` | Tiền/thập phân, mặc định 2 chữ số, kiểu Việt Nam | `1.234,56` | `1234.56` |
| `moneydecimal0` | Số nguyên có dấu | `1.234` | `1234` |
| `moneydecimal0_pos` | Số nguyên không âm | `1.234` | `1234` |
| `moneydecimal2_pos` | Thập phân không âm, tối đa 2 số lẻ | `1.234,56` | `1234.56` |
| `moneydecimal2_neg` | Giá trị khác 0 được chuẩn hóa thành số âm | `-1.234,56` | `-1234.56` |
| `digitsonly` | Chỉ cho nhập chữ số, giữ số 0 đầu | `001234` | `001234` |
| `datetimeminute` | Datetime chỉ hiển thị đến phút | `28/09/2026 15:11` | `28/09/2026 15:11:00` |

### Hậu tố của moneydecimal

- Precision: số ngay sau `moneydecimal`, ví dụ `moneydecimal0`, `moneydecimal2`.
- Dấu: `_pos`, `_neg`; mặc định cho phép cả âm và dương.
- Locale: `_vn` hoặc `_us`; mặc định `_vn`.
- Căn lề: `_left`, `_center`, `_right`; mặc định `_right`.
- Có thể đổi thứ tự hậu tố, ví dụ `moneydecimal2_right_us_pos`.

## 3. Datetime không hiển thị giây

Trong Format Designer, cấu hình Date control:

| Property | Giá trị |
| --- | --- |
| Type | `Datetime` |
| Button ID | `datetimeminute` |
| Input Conversion | để trống |
| Mask | để trống |
| Output Conversion | để trống |

Cơ chế xử lý:

1. Runtime nhận dạng đúng field qua `buttonid=datetimeminute`.
2. Giá trị `DD/MM/YYYY HH:mm:ss` được hiển thị thành `DD/MM/YYYY HH:mm`.
3. Validator Core được mở rộng có phạm vi để chấp nhận `HH:mm` riêng cho field này,
   nên không xuất hiện cảnh báo “invalid datetime”.
4. Trước khi serialize/submit, runtime bổ sung `:00`; server vẫn nhận datetime đầy đủ.
5. Field datetime không có Button ID trên vẫn bắt buộc định dạng Core `HH:mm:ss`.

Không dùng đồng thời `input.date`, `output.date` hoặc Mask để cắt giây cho trường
này. Việc đó chỉ thay chuỗi hiển thị nhưng validator WebTier Core vẫn có thể coi
giá trị là không hợp lệ.

## 4. Kiểm thử bắt buộc

### Money và digits-only

- Nhập, dán, xóa tại đầu/giữa/cuối field.
- Kiểm tra số âm/dương, precision, `_vn`, `_us` và căn lề.
- Save/OK và xác nhận server nhận giá trị canonical, không có dấu nhóm hàng nghìn.

### Datetime-minute

- Mở bản ghi có datetime chứa giây: UI chỉ được hiện đến phút.
- Nhập `28/09/2026 15:11`, blur: không xuất hiện biểu tượng cảnh báo vàng.
- Chọn ngày bằng calendar: sau khi chọn vẫn chỉ hiển thị đến phút.
- Save rồi mở lại: server lưu datetime hợp lệ và UI tiếp tục không hiện giây.
- Giá trị sai như `28/09/2026 25:61` vẫn phải bị validator cảnh báo.
- Một datetime không có `datetimeminute` vẫn tuân thủ validation Core.

Kiểm tra cả `jsDebug=true` và `jsDebug=false`, sau đó hard refresh trình duyệt.
Nếu thay JSP hoặc bundle đang được container cache, restart Tomcat trước smoke test.

## 5. Quy tắc mở rộng

Khi thêm formatter mới:

1. Đặt prefix Button ID rõ nghĩa và không trùng action ID của Form Designer.
2. Chỉ thay đổi field opt-in; không patch hành vi toàn cục.
3. Phân biệt giá trị hiển thị và giá trị canonical gửi server.
4. Nếu phải mở rộng Core validator, sửa source trong `debug/` và build lại bundle.
5. Bổ sung vào bảng Button ID, testcase ở tài liệu này và release note tương ứng.

## 6. Tương thích project SM 9.80 / Tomcat 9

Project legacy `sm_tomcat_9` chưa dùng runtime HPT tách riêng, nên phần hiển thị và
serialize `datetimeminute` được tích hợp cùng formatter tiền trong
`WEB-INF/templates/topaz/view.xsl`.

Validator opt-in được đồng bộ tại cả ba vị trí để hỗ trợ hai chế độ chạy:
- `js/9.80.0016/sm.base.js`

Cấu hình Form Designer vẫn giống SM 9.81: `Type=Datetime`,
`Button ID=datetimeminute`, để trống Input Conversion, Mask và Output Conversion.

