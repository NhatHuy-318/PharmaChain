# Bộ hồ sơ demo: FOL-ABC-20261102-013

Dùng trong buổi thuyết trình. Mỗi số lô chỉ ghi lên chain được một lần; đã dùng rồi thì dùng bộ còn lại.
Tất cả ngày trong hồ sơ đều ở quá khứ (contract không nhận ngày tương lai).

Đổi ví trong MetaMask đúng thứ tự dưới đây. Mỗi giao dịch chờ khoảng 30 giây để vào khối.

## Bước 1 — Manufacturer (ví 0xD905…36E2Ad), trang manufacturer.html

| Ô | Giá trị |
|---|---|
| Số hiệu lô | `FOL-ABC-20261102-013` |
| Tên nguyên liệu | Folic acid (Vitamin B9) |
| Ngày sản xuất | 02/11/2026 |
| Hạn sử dụng | 02/11/2028 |
| Đơn vị nhập khẩu | Công ty Nhập khẩu Gamma |
| Điều kiện bảo quản | Nơi khô mát, dưới 25°C, tránh ánh sáng |
| Quốc gia sản xuất | Ấn Độ |
| Tổng khối lượng / Đơn vị / Số kiện | 50 / kg / 2 |
| Số niêm phong chì | NC-ABC-2026-1013 |
| File COA | `B1_COA-2026-0013.txt` |

## Bước 2 — Inspector (ví 0x1dc3…FaE9c80), trang inspector.html

| Ô | Giá trị |
|---|---|
| Kết quả | Đạt |
| Số hiệu phiếu kiểm nghiệm | KN-2026-0013 |
| Ngày kiểm nghiệm | 04/11/2026 |
| Phương pháp | HPLC theo Dược điển Việt Nam V |
| Mã mẫu thử | MAU-KN-2026-0013 |
| File | `B2_KN-2026-0013.txt` |

## Bước 3 — Importer (ví 0xD8Df…1574F0), trang importer.html, tab "Nhập khẩu lô"

| Ô | Giá trị |
|---|---|
| Quốc gia xuất xứ | Ấn Độ |
| Số tờ khai Hải quan | HQ-2026-0013 |
| Ngày nhập khẩu | 05/11/2026 |
| Cửa khẩu | Cảng Cát Lái |
| Ngày thông quan | 05/11/2026 |
| File | `B3_HQ-2026-0013.txt` |

## Bước 4 — Importer (cùng ví), tab "Chuyển giao hàng"

| Ô | Giá trị |
|---|---|
| Đơn vị nhận hàng | Nhà máy Dược Delta (0x7bDA…22be7D0b9) |
| Đơn vị vận chuyển | Gamma Logistics |
| Mã vận đơn | GMA-TRK-261106-013 |
| Nhiệt độ vận chuyển | 15 - 25°C |
| Biển số phương tiện | 51C-678.90 |
| File | `B4_PGH-2026-0013.txt` |

## Bước 5 — Receiver Delta (ví 0x7bDA…22be7D0b9), trang receiver.html

| Ô | Giá trị |
|---|---|
| Người nhận / Thủ kho | Trần Văn Bình |
| Vị trí kho | Kho nguyên liệu A1 |
| Tình trạng niêm phong | Nguyên vẹn |
| Khối lượng thực cân nhận | 50 |
| File | `B5_BBN-2026-0013.txt` |

## Bước 6 — Receiver Delta (cùng ví), phần "Thẩm định QC"

| Ô | Giá trị |
|---|---|
| Kết luận QC | Đạt (lô chuyển sang Released) |
| Số hiệu phiếu QC | QC-2026-0013 |
| Ngày thẩm định | 07/11/2026 |
| Khối lượng đạt | 50 |
| Khối lượng không đạt | 0 |
| File | `B6_QC-2026-0013.txt` |

## Kết thúc — đối chiếu hash ở trang trace.html (không cần ví)

1. Tra số lô `FOL-ABC-20261102-013`, xem dòng thời gian đủ 6 bước.
2. Chọn sự kiện Bước 1, tải `B1_COA-2026-0013.txt` lên: **KHỚP**.
3. Tải `X_COA-2026-0013_DA-SUA.txt` lên: **KHÔNG KHỚP**. File này chỉ khác đúng một dòng: Định lượng 99,3% bị sửa thành 98,6%.

## Hash SHA-256 của từng file (để đối chiếu nhanh)

| File | Hash |
|---|---|
| B1_COA-2026-0013.txt | `0xa92920938584bee9f94e56e43c2df703483ddbb94581ceb52f880f38b0f8efa1` |
| B2_KN-2026-0013.txt | `0xeaf1d03c2c4d70216fa393d82a19aa7e1756c07c186c944f060058bc5b898ed0` |
| B3_HQ-2026-0013.txt | `0x17e8cb7aadcb1f7a3283fc59371071598f9ea61e552851a6de28093e1d429093` |
| B4_PGH-2026-0013.txt | `0x09f69934f9c199580a7d5c81c73f59bfe65a5044cf1ba2ee6bf960c9a85f1e64` |
| B5_BBN-2026-0013.txt | `0x0f8b769c3ff9ca73ea3549efdf02f4d45a15b50b318d7abde15c03282a7d6344` |
| B6_QC-2026-0013.txt | `0x39701cfa70360448d6d5adc9f148b49649c3e2057259da433e1185d7b62d6b5d` |
| X_COA-2026-0013_DA-SUA.txt | `0xaa0eefbb138de6619fc77f738a6b60c61c3fbd1a7f32efc03bcf71e7ba987a7c` |
