# PharmaChain DApp - Giao diện & Kiến trúc Hệ thống

Ứng dụng phi tập trung (DApp) phục vụ ghi nhận và truy xuất nguồn gốc lô nguyên liệu dược phẩm trên blockchain Rootstock (RSK) Testnet kết hợp bảo đảm tính toàn vẹn hồ sơ bằng hàm băm SHA-256.

> **Tuyên bố trách nhiệm GMP**: Mô hình minh họa học thuật, không thay thế và không chứng nhận tuân thủ GMP.

---

## 1. Bảng màu & Typography (Quy chuẩn thương hiệu)

Hệ thống tuân thủ nghiêm ngặt 3 màu chủ đạo và phân cấp thị giác hiện đại:
- **Primary**: `#4036A5` — Tím xanh công nghệ (dành cho tiêu đề, số thứ tự, dữ liệu nổi bật, nút chính).
- **Secondary**: `#63C9E8` — Xanh cyan (bổ trợ, làm nổi bật quy trình, đường nối, icon và badge).
- **Background**: `#F7F8FC` — Trắng lạnh (chiếm phần lớn diện tích nền).
- **Màu chữ chính**: Sắc độ đậm của tím xanh (`#1E1B4B`) nhằm đảm bảo độ tương phản tối đa và khả năng tiếp cận (WCAG AA).
- **Typography**: Phông sans-serif hiện đại `Inter`, `Aptos`, `Manrope` với phân tầng rõ nét (`Regular`, `Medium`, `Semibold`, `Bold`).

---

## 2. Cấu trúc thư mục `dapp/`

```text
dapp/
├── index.html                  # Trang chủ giới thiệu & quy trình 6 bước
├── 404.html                    # Trang thông báo 404 chuẩn hóa
├── README.md                   # Hướng dẫn chi tiết vận hành DApp
├── abi/
│   └── BatchRegistry.json      # File ABI chính xác 100% của smart contract BatchRegistry
├── css/
│   ├── tokens.css              # Design tokens (màu sắc, typography, radius, shadow)
│   ├── base.css                # Base reset, layout, button, card, form, table, utility
│   └── components/
│       ├── navbar.css          # Navigation bar responsive, wallet indicator
│       ├── footer.css          # Footer chuẩn hóa kèm GMP disclaimer bắt buộc
│       ├── toast.css           # Hệ thống thông báo toast nổi (success, error, warning, info)
│       ├── modal.css           # Hộp thoại xác nhận accessible (Escape, backdrop blur)
│       └── dev-bar.css         # Thanh công cụ demo nhanh cho Mock Mode
└── js/
    ├── main.js                 # Bootstrap ứng dụng
    ├── config/
    │   ├── env.js              # Cấu hình APP_MODE ('mock' | 'live'), endpoint, địa chỉ contract
    │   ├── env.example.js      # Template cấu hình mẫu
    │   ├── network.js          # Thông số mạng RSK Testnet (Chain ID 31 / 0x1f, RPC, Explorer)
    │   ├── contract.js         # Nạp ABI và cấu hình gas
    │   └── dataSchema.js       # Ranh giới schema giữa on-chain và metadata off-chain
    ├── constants/
    │   ├── roles.js            # Enum vai trò on-chain (None..Receiver) & Viewer UI
    │   ├── batchStatus.js      # Enum trạng thái lô (None..Quarantined) & cờ kết thúc
    │   └── events.js           # Danh mục 9 sự kiện on-chain của BatchRegistry
    ├── i18n/
    │   └── vi.js               # Toàn bộ từ điển tiếng Việt & ánh xạ lỗi contract BR: ...
    ├── utils/
    │   ├── dom.js              # Tiện ích DOM selector, createElement, escape
    │   ├── format.js           # Rút gọn địa chỉ ví, ngày tháng VN, validate số lô
    │   └── eventEmitter.js     # Pub/Sub event bus phân tán
    ├── services/
    │   └── wallet.service.js   # Quản lý kết nối ví (hỗ trợ chuyển đổi Mock và MetaMask thật)
    └── components/
        ├── navbar.js           # Render Navbar động theo quyền ví và mạng
        ├── footer.js           # Render Footer kèm GMP disclaimer
        ├── toast.js            # Trình quản lý toast notification
        ├── modal.js            # Trình quản lý modal xác nhận
        └── devBar.js           # Thanh công cụ chuyển đổi nhanh 6 role demo
```

---

## 3. Cách chạy ứng dụng

Frontend được xây dựng bằng **HTML, CSS và JavaScript ES Modules thuần túy**, không yêu cầu bước build (webpack/vite) hay cài đặt npm:

### Cách 1: Chạy bằng Python (tích hợp sẵn)
```bash
# Tại thư mục gốc của repository:
python -m http.server 8000 --directory dapp
```
Sau đó truy cập: `http://localhost:8000`

### Cách 2: Chạy bằng Node.js (npx serve hoặc http-server)
```bash
npx serve dapp
```

---

## 4. Chế độ hoạt động (APP_MODE)

Cấu hình trong file [dapp/js/config/env.js](file:///d:/PharmaChain/PharmaChain/dapp/js/config/env.js):

- **Chế độ `mock` (Mặc định)**:
  - Hoạt động ngay trong trình duyệt mà không cần cài MetaMask hay kết nối mạng blockchain RSK.
  - Hiển thị thanh **Dev Bar** ở cạnh trên màn hình cho phép chuyển đổi tức thì giữa 6 vai trò: Admin, Manufacturer, Inspector, Importer, Receiver và Viewer.
  - Có nút **Reset Mock Data** để khôi phục dữ liệu ban đầu.

- **Chế độ `live`**:
  - Tự động ẩn hoàn toàn thanh Dev Bar.
  - Kết nối trực tiếp với tiện ích MetaMask qua `window.ethereum`.
  - Tự động kiểm tra mạng và đề xuất chuyển sang **Rootstock Testnet (Chain ID 31)** nếu đang ở sai mạng.

