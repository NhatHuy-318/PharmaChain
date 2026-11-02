/**
 * PharmaChain Vietnamese Translations & Localization Dictionary
 * Bao gồm chuyển dịch mã lỗi hợp đồng "BR: ...", nhãn vai trò, trạng thái và quy chuẩn M1-M10
 */

import { Role } from '../constants/roles.js';
import { BatchStatus } from '../constants/batchStatus.js';

export const i18n = Object.freeze({
  app: {
    title: 'PharmaChain',
    subtitle: 'Hệ thống truy xuất nguồn gốc lô nguyên liệu dược phẩm trên Blockchain',
    disclaimer: 'Mô hình minh họa, không thay thế và không chứng nhận tuân thủ GMP. Dữ liệu chạy trên môi trường thử nghiệm RSK Testnet.',
    copyright: '© 2026 PharmaChain - Nhóm 5 (BIM5017) - ĐH Kinh tế - Luật, ĐHQG TP.HCM.',
    loading: 'Đang tải dữ liệu...',
  },

  nav: {
    home: 'Trang chủ',
    search: 'Tra cứu',
    trace: 'Truy xuất',
    admin: 'Quản trị vai trò',
    manufacturer: 'Nhà sản xuất',
    inspector: 'Kiểm nghiệm',
    importer: 'Nhập khẩu & Giao hàng',
    receiver: 'Tiếp nhận & Kiểm tra',
    connectWallet: 'Kết nối ví',
    disconnect: 'Ngắt kết nối',
    wrongNetwork: 'Sai mạng (yêu cầu RSK)',
    switchNetwork: 'Chuyển sang RSK Testnet',
    guestViewer: 'Khách xem',
  },

  roles: {
    [Role.None]: 'Chưa cấp quyền',
    [Role.Admin]: 'Quản trị viên (Admin)',
    [Role.Manufacturer]: 'Nhà sản xuất (Manufacturer)',
    [Role.Inspector]: 'Đơn vị kiểm nghiệm (Inspector)',
    [Role.Importer]: 'Đơn vị nhập khẩu (Importer)',
    [Role.Receiver]: 'Bên nhận / Nhà máy (Receiver)',
    Viewer: 'Khách xem công khai',
  },

  status: {
    [BatchStatus.None]: 'Không tồn tại',
    [BatchStatus.Registered]: 'Đã đăng ký',
    [BatchStatus.Tested]: 'Đã kiểm nghiệm đạt',
    [BatchStatus.Rejected]: 'Không đạt kiểm nghiệm (Rejected)',
    [BatchStatus.Imported]: 'Đã nhập khẩu',
    [BatchStatus.InTransfer]: 'Đang chuyển giao',
    [BatchStatus.Received]: 'Đã tiếp nhận',
    [BatchStatus.Released]: 'Đạt kiểm tra / Được giải phóng',
    [BatchStatus.Quarantined]: 'Biệt trữ / Cảnh báo (Quarantined)',
  },

  statusDescriptions: {
    [BatchStatus.Registered]: 'Lô mới được tạo bởi Nhà sản xuất, đang chờ kiểm nghiệm.',
    [BatchStatus.Tested]: 'Lô đã qua kiểm nghiệm xuất xưởng đạt tiêu chuẩn chất lượng.',
    [BatchStatus.Rejected]: 'Lô không đạt kiểm nghiệm chất lượng. Vòng đời kết thúc.',
    [BatchStatus.Imported]: 'Lô đã thông quan và nằm dưới sự quản lý của đơn vị nhập khẩu.',
    [BatchStatus.InTransfer]: 'Lô đang trên đường vận chuyển tới cơ sở của bên nhận.',
    [BatchStatus.Received]: 'Bên nhận đã xác nhận tiếp nhận vật lý lô nguyên liệu.',
    [BatchStatus.Released]: 'Kiểm tra đạt tiêu chuẩn tại nơi nhận; được giải phóng để đưa vào sản xuất.',
    [BatchStatus.Quarantined]: 'Phát hiện sự cố chất lượng hoặc hư hại; lô bị biệt trữ cô lập.',
  },

  steps: {
    step0: 'Bước 0: Cấp quyền danh tính',
    step1: 'Bước 1: Đăng ký lô nguyên liệu',
    step2: 'Bước 2: Kiểm nghiệm xuất xưởng',
    step3: 'Bước 3: Nhập khẩu & Hải quan',
    step4: 'Bước 4: Khởi tạo chuyển giao',
    step5: 'Bước 5: Xác nhận nhận hàng',
    step6: 'Bước 6: Kiểm tra chất lượng tại nơi nhận',
  },

  contractErrors: {
    'BR: not admin': 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.',
    'BR: wrong role': 'Ví hiện tại không có vai trò phù hợp để thực hiện giao dịch này.',
    'BR: zero address': 'Địa chỉ ví được cung cấp không hợp lệ (địa chỉ 0x0).',
    'BR: invalid role': 'Vai trò được chọn không hợp lệ (không thể cấp None hoặc Admin).',
    'BR: account has role': 'Ví này đã được cấp vai trò trước đó. Cần thu hồi vai trò cũ trước.',
    'BR: empty org name': 'Vui lòng nhập tên đơn vị / tổ chức đại diện.',
    'BR: no role': 'Ví này hiện chưa có vai trò nào trong hệ thống.',
    'BR: cannot revoke admin': 'Không thể thu hồi quyền của Quản trị viên tối cao.',
    'BR: zero hash': 'Vui lòng tải lên tài liệu hợp lệ để băm mã SHA-256 (mã băm không được bằng 0).',
    'BR: batch not found': 'Không tìm thấy lô nguyên liệu với mã được yêu cầu.',
    'BR: wrong status': 'Lô không ở trạng thái cho phép thực hiện bước này.',
    'BR: empty batchNo': 'Vui lòng nhập số hiệu lô nguyên liệu.',
    'BR: empty material': 'Vui lòng nhập tên hoạt chất / nguyên liệu dược phẩm.',
    'BR: batchNo used': 'Số hiệu lô này đã tồn tại trên hệ thống. Vui lòng kiểm tra lại.',
    'BR: invalid dates': 'Ngày sản xuất phải xảy ra trước hạn sử dụng.',
    'BR: expired': 'Lô nguyên liệu này đã hết hạn sử dụng. Giao dịch bị từ chối.',
    'BR: not importer': 'Địa chỉ được chọn làm đơn vị nhập khẩu không có vai trò Importer.',
    'BR: empty reportNo': 'Vui lòng nhập số hiệu phiếu kiểm nghiệm / biên bản.',
    'BR: not designated': 'Ví của bạn không phải đơn vị được chỉ định đích danh cho lô nguyên liệu này.',
    'BR: empty origin': 'Vui lòng nhập quốc gia xuất xứ của nguyên liệu.',
    'BR: empty customsDeclNo': 'Vui lòng nhập số tờ khai hải quan nhập khẩu.',
    'BR: not receiver': 'Địa chỉ được chọn làm bên nhận không có vai trò Receiver.',
    'BR: invalid batchNo': 'Số lô chỉ gồm chữ in hoa (A-Z), số (0-9) và các ký tự: - _ / . (tối đa 32 ký tự).',
    'BR: invalid date': 'Ngày nhập không hợp lệ: không được để trống hoặc chọn thời điểm tương lai.',
  },

  wallet: {
    notInstalled: 'Không tìm thấy tiện ích MetaMask. Vui lòng cài đặt MetaMask để tiếp tục.',
    userRejected: 'Người dùng đã hủy yêu cầu kết nối hoặc từ chối ký giao dịch.',
    connected: 'Kết nối ví thành công.',
    disconnected: 'Đã ngắt kết nối ví.',
    networkSwitched: 'Đã chuyển sang mạng RSK Testnet thành công.',
    switchFailed: 'Chuyển mạng thất bại. Vui lòng tự đổi mạng trên MetaMask sang RSK Testnet (Chain ID 31).',
  },

  hash: {
    calculating: 'Đang tính mã băm SHA-256 từ file...',
    match: 'KHỚP — File trùng khớp byte tuyệt đối với tài liệu đã ghi trên Blockchain.',
    mismatch: 'KHÔNG KHỚP — Nội dung file đã bị chỉnh sửa hoặc đây là tài liệu khác.',
    disclaimer: 'Lưu ý: Mã băm SHA-256 chỉ chứng minh tính toàn vẹn byte của file, không chứng minh tính hợp pháp pháp lý của nội dung.',
  },

  common: {
    confirm: 'Xác nhận',
    cancel: 'Hủy bỏ',
    save: 'Lưu thay đổi',
    close: 'Đóng',
    search: 'Tìm kiếm',
    viewTrace: 'Xem hành trình',
    downloadQR: 'Tải mã QR',
    copy: 'Sao chép',
    copied: 'Đã sao chép vào bộ nhớ tạm!',
  }
});

/**
 * Trả về thông điệp lỗi tiếng Việt thân thiện từ lỗi contract revert
 */
export function translateError(error) {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  const msg = error.message || String(error);
  
  for (const [key, translated] of Object.entries(i18n.contractErrors)) {
    if (msg.includes(key)) {
      return translated;
    }
  }

  if (msg.includes('User denied') || msg.includes('user rejected')) {
    return i18n.wallet.userRejected;
  }

  return msg;
}

