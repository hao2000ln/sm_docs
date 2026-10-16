# 07 — Excel Import

## 1. Mục tiêu và phạm vi V1

Import Excel là chức năng dùng chung của màn hình metadata-driven. Mỗi domain chỉ khai báo cấu trúc file và viết handler nghiệp vụ; framework phụ trách đọc file, preview, chia chunk, gọi API, chạy nền và trả kết quả từng dòng.

V1 hỗ trợ:

- file `.xlsx`, đúng một sheet;
- tải file mẫu sinh từ metadata;
- kéo-thả hoặc chọn file;
- kiểm tra header, kiểu dữ liệu, bắt buộc, độ dài, min và trùng trong file;
- pre-check lookup/business key tại backend;
- preview có phân trang và đánh dấu ô lỗi;
- chính sách bỏ qua dòng lỗi hoặc từ chối toàn file;
- import trực tiếp theo chunk hoặc background job theo ngưỡng;
- kết quả thành công/thất bại theo từng dòng;
- tải file kết quả, tải riêng file lỗi và retry dòng lỗi;
- khôi phục trạng thái background job sau khi F5/mở lại tab;
- hook nghiệp vụ để mapping hoặc ghi nhiều bảng.

Ngoài phạm vi V1:

- file `.xls`, nhiều sheet hoặc macro/công thức;
- mapping cột thủ công;
- rollback toàn file;
- resume tự động từng chunk;
- lưu file vật lý dài hạn phía server;
- dashboard quản trị lịch sử nhiều batch.

## 2. Luồng xử lý

```text
Chọn file
  → kiểm tra XLSX trên trình duyệt
  → preview và lỗi client
  → pre-check backend (importMode = validate)
  → người dùng xác nhận
  ├─ dưới asyncThreshold: import trực tiếp theo chunk
  └─ từ asyncThreshold: tạo esdbackgroundJob → scheduler/worker
  → kết quả từng dòng
  → tải kết quả / tải lỗi / retry dòng lỗi
```

Frontend chỉ kiểm tra để cải thiện UX. Backend luôn kiểm tra lại cấu trúc, quyền và nghiệp vụ trước khi ghi.

## 3. Khai báo action trên giao diện

Khai báo trong `screen.actions` của ScreenDefinition:

```javascript
{
  id: "importContracts",
  type: "import",
  label: "Nhập Excel",
  enabled: true,
  confirm: true,
  confirmMessage: "Bạn có chắc chắn muốn nhập các hợp đồng hợp lệ trong file Excel vào hệ thống?",
  execution: {
    maskScope: "framework",
    maskMessage: "Đang nhập dữ liệu hợp đồng...",
    preventClose: true,
    preventDuplicate: true
  },
  import: {
    title: "Nhập dữ liệu Hợp đồng (Import Excel)",
    maxHeight: 760,
    templateName: "mau-import-hop-dong.xlsx",
    sheetName: "Contracts",
    maxRows: 500,
    maxFileSize: 10485760,
    maxExpandedFileSize: 26214400,
    maxZipEntries: 100,
    chunkSize: 50,
    invalidRowPolicy: "skip",
    precheck: true,
    resultFile: true,
    columns: [
      {
        field: "contract_no",
        header: "Số hợp đồng",
        type: "string",
        required: true,
        unique: true,
        maxLength: 500,
        example: "HD-2026-001"
      },
      {
        field: "status",
        header: "Trạng thái",
        type: "string",
        required: true,
        maxLength: 255,
        example: "inprogress"
      },
      {
        field: "start_date",
        header: "Ngày bắt đầu",
        type: "date",
        required: false,
        example: "15/10/2026"
      },
      {
        field: "contract_value_total",
        header: "Tổng giá trị hợp đồng",
        type: "number",
        required: false,
        min: 0,
        example: "150000000"
      }
    ]
  },
  order: 45
}
```

### Thuộc tính `import`

| Thuộc tính | Ý nghĩa |
| --- | --- |
| `title` | Tiêu đề popup |
| `maxHeight` | Chiều cao tối đa; runtime vẫn co theo viewport |
| `templateName` | Tên file mẫu và tiền tố file kết quả |
| `sheetName` | Tên sheet khi framework sinh file |
| `maxRows` | Số dòng dữ liệu tối đa; framework không cho vượt 1.000 |
| `maxFileSize` | Kích thước file nén; framework không cho vượt 10 MB |
| `maxExpandedFileSize` | Tổng kích thước XML sau giải nén; tối đa 100 MB |
| `maxZipEntries` | Số thành phần tối đa trong ZIP/XLSX; tối đa 500 |
| `chunkSize` | Số dòng mỗi request; tối đa 100 |
| `invalidRowPolicy` | `skip` hoặc `rejectAll` |
| `precheck` | `true`: gọi backend validate trước khi cho nhập |
| `resultFile` | Hiện nút tải file kết quả/file lỗi |
| `columns` | Allowlist cột được phép import |

Mỗi `columns[].field` phải tồn tại trong `definition.fields`. Client không được gửi table, DBDict field, raw query hoặc handler.

Kiểu cột hỗ trợ: `string`, `number`, `date`, `boolean`.

## 4. Khai báo permission và backend action

```javascript
actionPermissions: {
  "screen:importContracts": { allow: true }
},

screenActions: {
  importContracts: {
    enabled: true,
    operation: "custom",
    handlerId: "contracts.importContracts",
    execution: {
      asyncEnabled: true,
      asyncThreshold: 200,
      maxAsyncItems: 500,
      maxRetry: 1,
      executorId: "contracts.importContractsJob"
    }
  }
}
```

Ý nghĩa:

- `handlerId`: action handler chạy cho request trực tiếp/pre-check;
- `asyncEnabled`: cho phép chuyển sang background job;
- `asyncThreshold`: số dòng hợp lệ tối thiểu để chạy nền;
- `maxAsyncItems`: giới hạn backend, không chỉ là giới hạn UI;
- `maxRetry`: số lần recovery khi worker mất heartbeat;
- `executorId`: executor đã allowlist cho worker.

Không khai báo permission hoặc handler/executor không nằm trong registry thì request phải fail closed.

## 5. Dữ liệu request

Framework gửi các mảng scalar song song:

```json
{
  "screenId": "contracts",
  "actionId": "importContracts",
  "input": {
    "importMode": "commit",
    "importBatchId": "IMP-mgu7ak-91bf23",
    "rowNumbers": [2, 3],
    "contract_no": ["HD-2026-001", "HD-2026-002"],
    "status": ["inprogress", "inprogress"],
    "start_date": ["15/10/2026", "16/10/2026"],
    "contract_value_total": [150000000, 200000000]
  }
}
```

Quy tắc:

- mọi mảng cột phải có cùng độ dài với `rowNumbers`;
- `importMode` chỉ nhận `validate` hoặc `commit`;
- `validate` tuyệt đối không ghi dữ liệu;
- `importBatchId` do framework sinh, dùng để truy vết, không phải field nghiệp vụ;
- input ngoài allowlist trả `UNKNOWN_ACTION_INPUT`.

## 6. Kiến trúc backend tái sử dụng

```text
HPT_ScreenService.screenAction / background executor
  → HPT_BatchActionEngine
  → HPT_ActionRegistry → HPT_ContractActions
  → HPT_ContractService.executeImport
  → HPT_ImportEngine
  → HPT_ImportHandlerRegistry
  → HPT_ContractImportHandlerRegistry
  → HPT_ContractImportHandler
  → HPT_ContractRepository
```

Registry domain ánh xạ ID nội bộ của engine:

```javascript
function getDefinitions() {
  return {
    "contracts.import": {
      enabled: true,
      library: "HPT_ContractImportHandler",
      factory: "getHandler"
    }
  };
}
```

Request không được truyền tên ScriptLibrary hoặc factory. `HPT_ImportHandlerRegistry` chỉ resolve handler đã đăng ký.

## 7. Viết import handler cho domain mới

Lifecycle cố định:

```text
getColumns
  → normalizeRow
  → prepareBatch
  → validateRow
  → enrichRow
  → executeRow hoặc executeBatch
  → afterBatch
```

Mẫu tối thiểu:

```javascript
function getHandler() {
  return {
    maxChunkSize: 100,
    transactionMode: "perItem",

    getColumns: function () {
      return [
        { input: "external_code", property: "externalCode" },
        { input: "amount", property: "amount", optional: true }
      ];
    },

    normalizeRow: function (context) {
      return {
        rowNumber: Number(context.row.rowNumber),
        externalCode: String(context.row.externalCode || "").trim(),
        amount: Number(context.row.amount || 0)
      };
    },

    prepareBatch: function (context) {
      // Batch-load lookup/business key một lần cho cả chunk.
      return { success: true, state: { /* lookup maps */ } };
    },

    validateRow: function (context) {
      if (!context.row.externalCode) {
        return { success: false, code: "EXTERNAL_CODE_REQUIRED", message: "Thiếu mã" };
      }
      return { success: true };
    },

    enrichRow: function (context) {
      // Mapping ID, tính toán hoặc dựng model cho nhiều bảng.
      return { success: true, row: context.row };
    },

    executeRow: function (context) {
      return lib.MyRepository.createImportedRecord(context.row);
    },

    afterBatch: function () {
      return { success: true };
    }
  };
}
```

### Trách nhiệm từng hook

- `normalizeRow`: chuyển transport model sang domain model.
- `prepareBatch`: batch-load lookup, business key và dữ liệu liên quan; tránh N+1 query.
- `validateRow`: rule nghiệp vụ và data scope phía server.
- `enrichRow`: mapping ID, tính toán, tạo dữ liệu cho bảng liên quan.
- `executeRow`: ghi đầy đủ nghiệp vụ của một dòng; có thể gọi nhiều Repository.
- `executeBatch`: escape hatch khi domain cần tự điều phối cả chunk.
- `afterBatch`: audit/outbox/tính tổng sau khi đã có kết quả; không đặt nghiệp vụ bắt buộc atomic tại đây.

## 8. Transaction mode

| Mode | Cách dùng |
| --- | --- |
| `perItem` | Mỗi dòng độc lập; mặc định và đang dùng cho hợp đồng |
| `perChunk` | Cả chunk cùng transaction/compensation; bắt buộc đủ `beginTransaction`, `commitTransaction`, `rollbackTransaction` |
| `custom` | Handler tự xử lý bằng `executeBatch` và phải trả `rowResults` |

Nếu `perItem` ghi nhiều bảng và cần atomic, handler cũng phải cung cấp đủ ba transaction hook. Thiếu hook, engine fail closed; framework không được tuyên bố rollback nếu domain không có transaction hoặc compensation thật.

`afterBatch` chạy sau khi ghi. Nếu hook này lỗi, dữ liệu đã ghi không bị báo giả là chưa ghi; response giữ `success: true` và bổ sung `warnings`.

## 9. Kết quả từng dòng

Mỗi phần tử `relatedResults` có dạng:

```json
{
  "rowNumber": 2,
  "success": false,
  "stage": "VALIDATE",
  "code": "CONTRACT_NO_DUPLICATE",
  "message": "Số hợp đồng đã tồn tại",
  "recordId": ""
}
```

Các stage thường gặp: `NORMALIZE`, `PREPARE`, `VALIDATE`, `ENRICH`, `EXECUTE`, `TRANSACTION`, `ROLLBACK`, `AFTER_BATCH`, `COMPLETED`.

File kết quả gồm dữ liệu nguồn cùng trạng thái, stage, mã lỗi, nội dung lỗi và Record ID. File lỗi chỉ giữ các dòng `FAILED`/`NOT_IMPORTED`.

## 10. Background job và phục hồi sau reload

Khi số dòng hợp lệ đạt `asyncThreshold`, runtime gọi `enqueueJob`. Worker xử lý tối đa 50 dòng mỗi chunk đối với import hợp đồng và lưu:

- Job ID, screen/action/executor;
- `requested.by`, thời điểm yêu cầu;
- tổng số, đã xử lý, thành công, thất bại và phần trăm;
- `result.summary` chứa batch ID và kết quả từng dòng;
- error code/message và lifecycle timestamp.

Runtime lưu Job ID theo `screenId` trong `localStorage`. Sau F5 hoặc mở lại tab, runtime gọi `getJobStatus` và mở lại popup. Khi job kết thúc, người dùng có thể tải file kết quả, tải file lỗi hoặc retry riêng dòng lỗi. Retry tạo batch ID mới có hậu tố `.retry`.

Chỉ chủ sở hữu được xem/hủy job. Trước khi chạy, worker resolve lại screen/action, kiểm tra `asyncEnabled`, executor ID và quyền của `requested.by`. Domain vẫn phải kiểm tra lại data scope/nghiệp vụ.

Scheduler bắt buộc:

```javascript
lib.HPT_JobWorker.runOnce("worker.contract.01");
lib.HPT_JobWorker.recover(300000, 100);
```

Không có scheduler, job sẽ nằm ở `QUEUED` và không ghi dữ liệu.

## 11. UI/UX chuẩn

Popup có ba bước: **Chọn file → Kiểm tra dữ liệu → Kết quả Import**.

- Dùng `HPTModalPortal` để popup/backdrop phủ frame WebTier lớn nhất cùng origin.
- `maxHeight` giới hạn popup; header/footer cố định, nội dung giữa cuộn.
- Preview phân trang 50 dòng/trang và lọc `Hợp lệ`/`Có lỗi`; không có bộ lọc `Tất cả`.
- Ô lỗi được đánh dấu và có nội dung lỗi tương ứng.
- Khi đang commit/enqueue, không cho đóng popup và dùng mask theo `execution.maskScope`.
- Import trực tiếp hiển thị bước kết quả ngay trong popup.
- Import nền chuyển sang popup tiến trình job.
- Đóng kết quả thành công sẽ làm mới danh sách.

## 12. Bảo mật và hiệu năng

V1 áp dụng các giới hạn sau cho màn hình hợp đồng:

| Giới hạn | Giá trị |
| --- | ---: |
| Dòng/file | 500 |
| File XLSX nén | 10 MB |
| XML sau giải nén | 25 MB |
| ZIP entry | 100 |
| Dòng/request | 50 |
| Ngưỡng background | 200 dòng |

Parser từ chối file sai XML, nhiều sheet, có công thức, quá số entry hoặc vượt kích thước sau giải nén. Đây là lớp bảo vệ zip-bomb phía trình duyệt; backend vẫn áp giới hạn mảng/chunk và payload.

Các lookup/trùng dữ liệu phải được batch-load trong `prepareBatch`, không query lại theo từng dòng.

### Chống trùng đồng thời

Framework phát hiện trùng trong file, pre-check trùng trong database và Repository kiểm tra lại ngay trước khi tạo. Nếu `CreateTicket` thất bại, Repository đọc lại business key để trả đúng `CONTRACT_NO_DUPLICATE` khi request khác vừa tạo.

Production vẫn bắt buộc có unique constraint/index tại database cho business key, hiện là `esdHDcontract.contract.no`. JavaScript không thể loại bỏ khoảng đua giữa `SELECT` và `INSERT`.

## 13. DBDict và cấu hình môi trường

`esdbackgroundJob` cần tối thiểu:

- `result.summary`: large character/TEXT;
- `error.code`: character;
- index: `id`, `status`, `requested.by`, `requested.at`.

Ngoài ra phải cấu hình scheduler, permission, data scope và chính sách lưu/dọn job cũ. Không lưu arbitrary server path do client cung cấp vào `result.file`.

## 14. Smoke test

1. Tải file mẫu và import một dòng hợp lệ dưới ngưỡng background.
2. Thử thiếu cột, sai kiểu, ngày `31/02/2026`, giá trị âm và status không tồn tại.
3. Lặp business key trong cùng file; tất cả dòng trùng phải bị đánh dấu.
4. Import business key đã tồn tại trong database.
5. Kiểm tra `invalidRowPolicy: "skip"` và `"rejectAll"`.
6. Tải file kết quả và file lỗi; kiểm tra số dòng nguồn, stage, code và Record ID.
7. Import 200–500 dòng; job phải chạy nền và cập nhật tiến độ.
8. F5 khi job đang chạy; popup phải khôi phục đúng job.
9. Retry dòng lỗi; chỉ dòng lỗi được gửi lại.
10. Hai request đồng thời cùng business key; chỉ một bản ghi được tạo.
11. Tắt action/quyền sau khi enqueue; worker phải trả `JOB_AUTHORIZATION_CHANGED`.
12. Dừng heartbeat rồi chạy recovery; job retry hoặc chuyển `FAILED` theo `maxRetry`.
13. Thử file quá 10 MB, hơn 500 dòng, nhiều sheet, có công thức và dữ liệu giải nén quá 25 MB.
14. Xác nhận user khác không xem/hủy được job.

Chạy regression trước khi publish:

```powershell
node webapps/sm/HPT_Config/api_v1/tests/run_all.js
```

Checklist phát hành đầy đủ: [11_OPERATIONS_AND_RELEASE.md](11_OPERATIONS_AND_RELEASE.md).

## 15. File liên quan

| Tầng | File chính |
| --- | --- |
| Metadata | `screens/contracts/ContractListDefinition.js` |
| Validation/action | `framework/actions/HPT_BatchActionEngine.js` |
| Import framework | `framework/imports/HPT_ImportHandlerRegistry.js`, `HPT_ImportEngine.js` |
| Domain handler | `domains/contracts/HPT_ContractImportHandlerRegistry.js`, `HPT_ContractImportHandler.js` |
| Domain persistence | `HPT_ContractService.js`, `HPT_ContractRepository.js` |
| Background | `HPT_JobRepository.js`, `HPT_BackgroundJobEngine.js`, `HPT_JobWorker.js`, `HPT_ContractJobExecutors.js` |
| Frontend | `js/lib/js/hpt_excel_import.js`, `hpt_screen_runtime.js`, `hpt_screen_bootstrap.js` |

Khi thêm domain mới, tái sử dụng framework và chỉ bổ sung ScreenDefinition, domain registry, import handler, service/repository cùng executor nếu cần chạy nền.
