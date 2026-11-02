# Dữ liệu mô phỏng PharmaChain (Mock Data)

Thư mục này chứa nguồn dữ liệu ban đầu cho `MockDataAdapter` và `MockChainAdapter` hoạt động khi `ENV.APP_MODE === 'mock'`.

## Các tệp dữ liệu:
- `organizations.json`: Danh mục 6 tổ chức đại diện (Admin, Manufacturer, Inspector, Importer, Receiver và Viewer).
- `batches.json`: 9 lô nguyên liệu mẫu bao phủ đủ 8 trạng thái smart contract (`Registered`, `Tested`, `Rejected`, `Imported`, `InTransfer`, `Received`, `Released`, `Quarantined`) và trường hợp hết hạn (`Expired`).
- `events.json`: Danh mục sự kiện on-chain giả lập theo đúng chuỗi thời gian, liên kết mã băm SHA-256 khớp tuyệt đối với các file văn bản tại `sample-docs/`.

