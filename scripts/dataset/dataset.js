// Bộ dữ liệu minh họa của PharmaChain: tổ chức, lô và hồ sơ từng bước.
// scripts/seed.js đọc file này để sinh file hồ sơ, gửi giao dịch lên contract và ghi server/db.json.
//
// Quy ước định dạng (dùng chung cho cả bộ dữ liệu):
// - Số lô:        <3 chữ hoạt chất>-<mã nhà sản xuất>-<YYYYMMDD ngày sản xuất>-<số thứ tự 3 chữ số>, ví dụ PEN-ABC-20260901-001
// - Số hồ sơ:     <loại>-<năm>-<số thứ tự 4 chữ số>, ví dụ KN-2026-0001
//                 COA: phiếu phân tích (Bước 1), KN: phiếu kiểm nghiệm (Bước 2), HQ: tờ khai hải quan (Bước 3),
//                 PGH: phiếu giao hàng (Bước 4), BBN: biên bản nhận hàng (Bước 5), QC: phiếu kiểm tra nơi nhận (Bước 6),
//                 BBH: biên bản hủy giao, GP: giấy phép của tổ chức (Bước 0)
// - Ngày:         YYYY-MM-DD theo giờ Việt Nam; script đổi sang Unix timestamp (giây) lúc 00:00 +07:00
// - Nước:         tên tiếng Việt
// - Tổ chức:      tên giả định, không trùng doanh nghiệp có thật

const ORGS = {
  manufacturer: {
    role: 'Manufacturer',
    name: 'Công ty Hóa dược ABC',
    code: 'ABC',
    licenseNo: 'GP-2026-0001',
    licenseTitle: 'Giấy chứng nhận đủ điều kiện sản xuất nguyên liệu làm thuốc',
    address: 'Lô C2, Khu công nghiệp Hóa dược, Mumbai, Ấn Độ',
    country: 'Ấn Độ', // nước xuất xứ của mọi lô do đơn vị này sản xuất
  },
  inspector: {
    role: 'Inspector',
    name: 'Trung tâm Kiểm nghiệm Beta',
    code: 'BETA',
    licenseNo: 'GP-2026-0002',
    licenseTitle: 'Giấy chứng nhận phòng thí nghiệm đạt ISO/IEC 17025',
    address: 'Số 12 đường Số 3, Quận 7, TP.HCM',
  },
  importer: {
    role: 'Importer',
    name: 'Công ty Nhập khẩu Gamma',
    code: 'GAMMA',
    licenseNo: 'GP-2026-0003',
    licenseTitle: 'Giấy phép xuất nhập khẩu nguyên liệu làm thuốc',
    address: 'Số 45 đường Nguyễn Tất Thành, Quận 4, TP.HCM',
  },
  receiver: {
    role: 'Receiver',
    name: 'Nhà máy Dược Delta',
    code: 'DELTA',
    licenseNo: 'GP-2026-0004',
    licenseTitle: 'Giấy chứng nhận đủ điều kiện sản xuất thuốc',
    address: 'Khu công nghiệp Tân Tạo, Quận Bình Tân, TP.HCM',
  },
  receiver2: {
    role: 'Receiver',
    name: 'Nhà máy Dược Epsilon',
    code: 'EPSILON',
    licenseNo: 'GP-2026-0005',
    licenseTitle: 'Giấy chứng nhận đủ điều kiện sản xuất thuốc',
    address: 'Khu công nghiệp Việt Nam - Singapore, Bình Dương',
  },
};

// Mỗi lô dừng ở một trạng thái khác nhau để demo đủ 8 trạng thái của contract.
// steps: các bước sau Bước 1, theo đúng thứ tự gửi giao dịch.
const BATCHES = [
  {
    batchNo: 'PEN-ABC-20260901-001',
    materialName: 'Penicillin G potassium',
    mfgDate: '2026-09-01',
    expiryDate: '2029-09-01',
    storageConditions: 'Nơi khô mát, dưới 25°C, tránh ánh sáng',
    quantity: 500, unit: 'kg', packageCount: 20, packagingSpec: '20 thùng x 25 kg, lót 2 lớp túi PE',
    coa: { docNo: 'COA-2026-0001', assay: '99,6%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [
      { type: 'test', date: '2026-09-05', docNo: 'KN-2026-0001', passed: true, note: 'Định lượng 99,4%, tạp chất liên quan 0,18%' },
      { type: 'import', date: '2026-09-15', docNo: 'HQ-2026-0001', port: 'Cảng Cát Lái, TP.HCM' },
      { type: 'deliver', date: '2026-09-20', docNo: 'PGH-2026-0001', to: 'receiver' },
      { type: 'receive', date: '2026-09-22', docNo: 'BBN-2026-0001', note: 'Đủ 20 thùng, niêm phong nguyên vẹn' },
      { type: 'qc', date: '2026-09-24', docNo: 'QC-2026-0001', passed: true, note: 'Định lượng 99,3%, đạt yêu cầu đưa vào sản xuất' },
    ],
    expect: 'Released',
  },
  {
    batchNo: 'AMO-ABC-20260905-002',
    materialName: 'Amoxicillin trihydrate',
    mfgDate: '2026-09-05',
    expiryDate: '2029-09-05',
    storageConditions: 'Nhiệt độ dưới 30°C, độ ẩm dưới 75%',
    quantity: 400, unit: 'kg', packageCount: 16, packagingSpec: '16 thùng x 25 kg, lót 2 lớp túi PE',
    coa: { docNo: 'COA-2026-0002', assay: '99,1%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [
      { type: 'test', date: '2026-09-09', docNo: 'KN-2026-0002', passed: true, note: 'Định lượng 99,0%, tạp chất liên quan 0,6%' },
      { type: 'import', date: '2026-09-18', docNo: 'HQ-2026-0002', port: 'Cảng Cát Lái, TP.HCM' },
      { type: 'deliver', date: '2026-09-23', docNo: 'PGH-2026-0002', to: 'receiver' },
      { type: 'receive', date: '2026-09-25', docNo: 'BBN-2026-0002', note: 'Đủ 16 thùng, 2 thùng móp méo nhẹ' },
      { type: 'qc', date: '2026-09-28', docNo: 'QC-2026-0002', passed: false, note: 'Tạp chất liên quan 1,2%, vượt giới hạn 1,0%; chuyển biệt trữ' },
    ],
    expect: 'Quarantined',
  },
  {
    batchNo: 'PAR-ABC-20260910-003',
    materialName: 'Paracetamol',
    mfgDate: '2026-09-10',
    expiryDate: '2030-09-10',
    storageConditions: 'Nơi khô mát, dưới 30°C',
    quantity: 1000, unit: 'kg', packageCount: 40, packagingSpec: '40 bao x 25 kg',
    coa: { docNo: 'COA-2026-0003', assay: '99,2%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [
      { type: 'test', date: '2026-09-14', docNo: 'KN-2026-0003', passed: false, note: 'Định lượng 97,1%, ngoài giới hạn 99,0–101,0%' },
    ],
    expect: 'Rejected',
  },
  {
    batchNo: 'CEF-ABC-20260915-004',
    materialName: 'Cefuroxime axetil',
    mfgDate: '2026-09-15',
    expiryDate: '2028-09-15',
    storageConditions: 'Dưới 25°C, tránh ẩm',
    quantity: 200, unit: 'kg', packageCount: 10, packagingSpec: '10 thùng x 20 kg',
    coa: { docNo: 'COA-2026-0004', assay: '98,9%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [
      { type: 'test', date: '2026-09-19', docNo: 'KN-2026-0004', passed: true, note: 'Định lượng 98,7%' },
      { type: 'import', date: '2026-10-01', docNo: 'HQ-2026-0003', port: 'Sân bay Tân Sơn Nhất, TP.HCM' },
      { type: 'deliver', date: '2026-10-06', docNo: 'PGH-2026-0003', to: 'receiver' },
      { type: 'receive', date: '2026-10-08', docNo: 'BBN-2026-0003', note: 'Đủ 10 thùng, chờ kiểm tra chất lượng' },
    ],
    expect: 'Received',
  },
  {
    batchNo: 'AZI-ABC-20261001-005',
    materialName: 'Azithromycin dihydrate',
    mfgDate: '2026-10-01',
    expiryDate: '2029-10-01',
    storageConditions: 'Nơi khô mát, dưới 25°C',
    quantity: 150, unit: 'kg', packageCount: 6, packagingSpec: '6 thùng x 25 kg',
    coa: { docNo: 'COA-2026-0005', assay: '99,0%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [
      { type: 'test', date: '2026-10-05', docNo: 'KN-2026-0005', passed: true, note: 'Định lượng 98,9%' },
      { type: 'import', date: '2026-10-14', docNo: 'HQ-2026-0004', port: 'Cảng Cát Lái, TP.HCM' },
      // Giao nhầm nhà máy, hủy rồi giao lại: demo cancelTransfer
      { type: 'deliver', date: '2026-10-18', docNo: 'PGH-2026-0004', to: 'receiver2' },
      { type: 'cancel', date: '2026-10-19', docNo: 'BBH-2026-0001', reason: 'Chọn nhầm nhà máy nhận; đơn hàng thuộc Nhà máy Dược Delta' },
      { type: 'deliver', date: '2026-10-19', docNo: 'PGH-2026-0005', to: 'receiver' },
    ],
    expect: 'InTransfer',
  },
  {
    batchNo: 'MET-ABC-20261008-006',
    materialName: 'Metformin hydrochloride',
    mfgDate: '2026-10-08',
    expiryDate: '2030-10-08',
    storageConditions: 'Dưới 30°C, tránh ẩm',
    quantity: 800, unit: 'kg', packageCount: 32, packagingSpec: '32 thùng x 25 kg',
    coa: { docNo: 'COA-2026-0006', assay: '99,5%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [
      { type: 'test', date: '2026-10-12', docNo: 'KN-2026-0006', passed: true, note: 'Định lượng 99,3%' },
      { type: 'import', date: '2026-10-22', docNo: 'HQ-2026-0005', port: 'Cảng Cát Lái, TP.HCM' },
    ],
    expect: 'Imported',
  },
  {
    batchNo: 'CIP-ABC-20261015-007',
    materialName: 'Ciprofloxacin hydrochloride',
    mfgDate: '2026-10-15',
    expiryDate: '2029-10-15',
    storageConditions: 'Nơi khô mát, dưới 25°C, tránh ánh sáng',
    quantity: 120, unit: 'kg', packageCount: 6, packagingSpec: '6 thùng x 20 kg',
    coa: { docNo: 'COA-2026-0007', assay: '99,3%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [
      { type: 'test', date: '2026-10-20', docNo: 'KN-2026-0007', passed: true, note: 'Định lượng 99,1%' },
    ],
    expect: 'Tested',
  },
  {
    batchNo: 'IBU-ABC-20261020-008',
    materialName: 'Ibuprofen',
    mfgDate: '2026-10-20',
    expiryDate: '2030-10-20',
    storageConditions: 'Dưới 30°C',
    quantity: 600, unit: 'kg', packageCount: 24, packagingSpec: '24 thùng x 25 kg',
    coa: { docNo: 'COA-2026-0008', assay: '99,7%', note: 'Đạt toàn bộ chỉ tiêu' },
    steps: [],
    expect: 'Registered',
  },
];

module.exports = { ORGS, BATCHES };
