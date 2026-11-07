# Bộ hồ sơ demo: PYR-ABC-20261102-012

Tập dượt trước buổi demo. Mỗi số lô chỉ ghi lên chain được một lần; đã dùng rồi thì dùng bộ còn lại.
Tất cả ngày trong hồ sơ đều ở quá khứ (contract không nhận ngày tương lai).

Đổi ví trong MetaMask đúng thứ tự dưới đây. Mỗi giao dịch chờ khoảng 30 giây để vào khối.

## Bước 1 — Manufacturer (ví 0xD905…36E2Ad), trang manufacturer.html

| Ô | Giá trị |
|---|---|
| Số hiệu lô | `PYR-ABC-20261102-012` |
| Tên nguyên liệu | Pyridoxine hydrochloride (Vitamin B6) |
| Ngày sản xuất | 02/11/2026 |
| Hạn sử dụng | 02/11/2028 |
| Đơn vị nhập khẩu | Công ty Nhập khẩu Gamma |
| Điều kiện bảo quản | Nơi khô mát, dưới 25°C, tránh ánh sáng |
| Quốc gia sản xuất | Ấn Độ |
| Tổng khối lượng / Đơn vị / Số kiện | 100 / kg / 4 |
| Số niêm phong chì | NC-ABC-2026-1012 |
| File COA | `B1_COA-2026-0012.txt` |

## Bước 2 — Inspector (ví 0x1dc3…FaE9c80), trang inspector.html

| Ô | Giá trị |
|---|---|
| Kết quả | Đạt |
| Số hiệu phiếu kiểm nghiệm | KN-2026-0012 |
| Ngày kiểm nghiệm | 04/11/2026 |
| Phương pháp | HPLC theo Dược điển Việt Nam V |
| Mã mẫu thử | MAU-KN-2026-0012 |
| File | `B2_KN-2026-0012.txt` |

## Bước 3 — Importer (ví 0xD8Df…1574F0), trang importer.html, tab "Nhập khẩu lô"

| Ô | Giá trị |
|---|---|
| Quốc gia xuất xứ | Ấn Độ |
| Số tờ khai Hải quan | HQ-2026-0012 |
| Ngày nhập khẩu | 05/11/2026 |
| Cửa khẩu | Cảng Cát Lái |
| Ngày thông quan | 05/11/2026 |
| File | `B3_HQ-2026-0012.txt` |

## Bước 4 — Importer (cùng ví), tab "Chuyển giao hàng"

| Ô | Giá trị |
|---|---|
| Đơn vị nhận hàng | Nhà máy Dược Delta (0x7bDA…22be7D0b9) |
| Đơn vị vận chuyển | Gamma Logistics |
| Mã vận đơn | GMA-TRK-261106-012 |
| Nhiệt độ vận chuyển | 15 - 25°C |
| Biển số phương tiện | 51C-123.45 |
| File | `B4_PGH-2026-0012.txt` |

## Bước 5 — Receiver Delta (ví 0x7bDA…22be7D0b9), trang receiver.html

| Ô | Giá trị |
|---|---|
| Người nhận / Thủ kho | Trần Văn Bình |
| Vị trí kho | Kho nguyên liệu A1 |
| Tình trạng niêm phong | Nguyên vẹn |
| Khối lượng thực cân nhận | 100 |
| File | `B5_BBN-2026-0012.txt` |

## Bước 6 — Receiver Delta (cùng ví), phần "Thẩm định QC"

| Ô | Giá trị |
|---|---|
| Kết luận QC | Đạt (lô chuyển sang Released) |
| Số hiệu phiếu QC | QC-2026-0012 |
| Ngày thẩm định | 07/11/2026 |
| Khối lượng đạt | 100 |
| Khối lượng không đạt | 0 |
| File | `B6_QC-2026-0012.txt` |

## Kết thúc — đối chiếu hash ở trang trace.html (không cần ví)

1. Tra số lô `PYR-ABC-20261102-012`, xem dòng thời gian đủ 6 bước.
2. Chọn sự kiện Bước 1, tải `B1_COA-2026-0012.txt` lên: **KHỚP**.
3. Tải `X_COA-2026-0012_DA-SUA.txt` lên: **KHÔNG KHỚP**. File này chỉ khác đúng một dòng: Định lượng 99,6% bị sửa thành 98,6%.

## Hash SHA-256 của từng file (để đối chiếu nhanh)

| File | Hash |
|---|---|
| B1_COA-2026-0012.txt | `0x6e0d971d9d439ed18780027f550705a51d86640ad2e85eb03ef1397ff95ed632` |
| B2_KN-2026-0012.txt | `0x4ad71e6ce921a9e89f2107f6a9c169bd5d164a81cdc7c10f86d09ce41d211230` |
| B3_HQ-2026-0012.txt | `0xbd13abad912beb408dc64261acabab8bf99d932c67be5a842562415f8b3c1d1b` |
| B4_PGH-2026-0012.txt | `0x0e013b883379d6c71f7a61a82894a3eafdbb5933de5de9261baab5c5a92e26e5` |
| B5_BBN-2026-0012.txt | `0x8cd9ade6d94500645c7a3a5f01149c2373dbbddbe352c060bdec6d1e7627d2dc` |
| B6_QC-2026-0012.txt | `0x68b774f7b8605d8799f797f54d265ef886978a3539db9ead2d001fb997e60764` |
| X_COA-2026-0012_DA-SUA.txt | `0x3a539257a3528357fa46a82015380aaa8438646de42f275eff53407a3af412ec` |
