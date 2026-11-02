/**
 * PharmaChain Data Schemas & Field Specifications (P1.1 Update)
 * Quy định rõ ranh giới giữa on-chain (smart contract) và off-chain (JSON metadata).
 *
 * NGUYÊN TẮC:
 * 1. Smart Contract BatchRegistry.sol chỉ nhận đúng các tham số được định nghĩa trong ABI.
 * 2. Không truyền các trường off-chain vào hàm contract.
 * 3. storageConditions được phát ra trong event BatchRegistered, không lưu trong struct Batch.
 * 4. Các trường off-chain chưa có nguồn xác thực thực tế phải để null hoặc chuỗi rỗng.
 */

/**
 * Phân loại các loại tài liệu nghiệp vụ tương ứng theo từng bước
 */
export const DocumentType = Object.freeze({
  COA: 'COA', // Bước 1: Giấy chứng nhận phân tích (COA / MSDS)
  TEST_REPORT: 'TEST_REPORT', // Bước 2: Phiếu kiểm nghiệm xuất xưởng (Inspector)
  IMPORT_DECLARATION: 'IMPORT_DECLARATION', // Bước 3: Tờ khai hải quan nhập khẩu (Importer)
  DELIVERY_NOTE: 'DELIVERY_NOTE', // Bước 4: Phiếu giao hàng / Vận đơn (Importer)
  RECEIVING_PROTOCOL: 'RECEIVING_PROTOCOL', // Bước 5: Biên bản nhận hàng (Receiver)
  QC_REPORT: 'QC_REPORT', // Bước 6: Phiếu kiểm tra chất lượng tại nơi nhận (Receiver)
  CANCEL_PROTOCOL: 'CANCEL_PROTOCOL', // Ngoại lệ: Biên bản hủy chuyển giao (Importer)
});

export const DocumentTypeLabel = Object.freeze({
  [DocumentType.COA]: 'Giấy chứng nhận phân tích (COA / MSDS)',
  [DocumentType.TEST_REPORT]: 'Phiếu kiểm nghiệm xuất xưởng',
  [DocumentType.IMPORT_DECLARATION]: 'Tờ khai Hải quan nhập khẩu',
  [DocumentType.DELIVERY_NOTE]: 'Phiếu giao hàng / Vận đơn',
  [DocumentType.RECEIVING_PROTOCOL]: 'Biên bản nhận hàng',
  [DocumentType.QC_REPORT]: 'Phiếu kiểm tra QC nơi nhận',
  [DocumentType.CANCEL_PROTOCOL]: 'Biên bản hủy chuyển giao',
});

export const DataSchemas = Object.freeze({
  /**
   * 1. On-chain struct Batch (lưu trong storage của BatchRegistry.sol)
   * Lưu ý: storageConditions KHÔNG nằm trong struct này mà nằm trong event BatchRegistered.
   */
  OnChainBatch: {
    id: 'uint256', // Mã lô tự tăng từ 1
    batchNo: 'string', // Số hiệu lô (A-Z, 0-9, -_/., tối đa 32 ký tự)
    manufacturer: 'address', // Địa chỉ ví Nhà sản xuất
    importer: 'address', // Địa chỉ ví Đơn vị nhập khẩu
    receiver: 'address', // 0x0 trước Bước 4; được gán ở initiateTransfer
    holder: 'address', // Người đang nắm giữ thực tế
    status: 'uint8', // Enum Status: 0=None, 1=Registered... 7=Released, 8=Quarantined
    expiryDate: 'uint64', // Hạn dùng (Unix timestamp giây)
    createdAt: 'uint64', // Thời điểm tạo (Unix timestamp giây)
  },

  /**
   * 2. Metadata liên kết tài liệu theo từng bước nghiệp vụ
   */
  DocumentMetadata: {
    docType: 'string', // Một trong các giá trị của DocumentType enum
    docTypeName: 'string', // Tên hiển thị tiếng Việt của loại tài liệu
    docNumber: 'string', // Số hiệu văn bản (vd: KN-0932, HQ-2026-9981)
    batchId: 'number', // Liên kết trực tiếp tới batchId
    batchNo: 'string', // Số hiệu lô
    docHash: 'string', // Mã băm SHA-256 on-chain (bytes32, 0x + 64 ký tự hex)
    fileName: 'string', // Tên file gốc (vd: COA_PEN-K-20260901-001.txt)
    fileSize: 'number', // Kích thước byte
    uploadedAt: 'number', // Thời điểm tính băm và tải lên (Unix timestamp)
    uploadedBy: 'string', // Địa chỉ ví người tải lên
    issuingOrg: 'string', // Đơn vị phát hành (tùy chọn, để null nếu chưa rõ)
    verificationDisclaimer: 'string', // "Mã băm SHA-256 xác minh tính toàn vẹn byte của file, không thay thế chứng thực pháp lý"
  },

  /**
   * 3. Off-chain Batch Metadata (lưu tại JSON Server / localStorage / Mock Data)
   * Phân định rõ:
   * - Bắt buộc nghiệp vụ (Core Required)
   * - Tùy chọn kỹ thuật P1 (Optional - để null/trống nếu chưa có nguồn xác nhận)
   */
  OffChainBatchMetadata: {
    // --- Định danh & Đối soát (Core) ---
    batchId: 'number', // Bắt buộc: Khóa chính liên kết on-chain
    batchNo: 'string', // Bắt buộc: Số hiệu lô khớp trên chuỗi
    materialName: 'string', // Bắt buộc: Tên nguyên liệu/hoạt chất
    isMock: 'boolean', // Đánh dấu dữ liệu minh họa học thuật
    dataSource: 'string', // Ghi chú nguồn dữ liệu ("Dữ liệu minh họa phục vụ thử nghiệm")

    // --- Định danh nguyên liệu (Material Identity - P1 Optional) ---
    materialCode: 'string | null', // Mã nguyên liệu nội bộ (để null nếu chưa cấp)
    casNumber: 'string | null', // Mã CAS (để null nếu không có nguồn)
    grade: 'string | null', // Cấp chất lượng (vd: Pharmaceutical Grade / Dược dụng)
    pharmacopoeiaStandard: 'string | null', // Tiêu chuẩn tham chiếu (vd: DĐVN V, USP 44)
    manufacturerSite: 'string | null', // Địa chỉ nhà xưởng sản xuất
    productSpecRef: 'string | null', // Số hiệu tiêu chuẩn cơ sở (TCCS)

    // --- Định danh lô & Quy cách đóng gói (Batch & Packaging - P1) ---
    internalBatchNo: 'string | null', // Số lô nội bộ bổ sung
    quantity: 'number', // Khối lượng tổng cộng
    unit: 'string', // Đơn vị tính: 'kg', 'tấn', 'thùng', 'bao'
    batchSize: 'number | null', // Tổng cỡ lô sản xuất ban đầu
    netWeight: 'number | null', // Khối lượng tịnh thực tế
    grossWeight: 'number | null', // Khối lượng cả bì
    packageType: 'string | null', // Loại bao bì: 'Thùng carton', 'Phuy nhựa', 'Phuy nhôm'
    packageCount: 'number', // Số kiện hàng đóng gói
    packagingSpec: 'string | null', // Quy cách chi tiết (vd: 20 thùng x 25kg, 2 lớp túi PE)
    packagingMaterial: 'string | null', // Vật liệu bao bì tiếp xúc trực tiếp
    sealNumber: 'string | null', // Số niêm phong chì xuất xưởng
    palletId: 'string | null', // Mã pallet lưu kho

    // --- Thông tin Vận chuyển & Logistics (Shipment - P1 Optional) ---
    carrierName: 'string | null', // Đơn vị vận chuyển logistics
    trackingNumber: 'string | null', // Mã vận đơn (AWB / B/L)
    dispatchDate: 'number | null', // Ngày xuất phát thực tế (Unix timestamp)
    expectedDeliveryDate: 'number | null', // Ngày giao hàng dự kiến (Unix timestamp)
    transportTempRange: 'string | null', // Khoảng nhiệt độ vận chuyển (vd: 15-25°C)
    vehiclePlate: 'string | null', // Biển số xe / Số hiệu container

    // --- Thông tin Nhập khẩu Hải quan (Import - P1) ---
    countryOfOrigin: 'string', // Quốc gia xuất xứ
    countryOfExport: 'string | null', // Quốc gia xuất khẩu (nếu chuyển tiếp)
    importPort: 'string | null', // Cửa khẩu nhập khẩu (vd: Cửa khẩu Cát Lái / Tân Sơn Nhất)
    customsDeclNo: 'string | null', // Số tờ khai hải quan
    customsClearanceDate: 'number | null', // Ngày thông quan thực tế (Unix timestamp)
    actualImportedQuantity: 'number | null', // Khối lượng thực nhập khẩu

    // --- Thông tin Tiếp nhận & QC Nơi nhận (Receiving & QC - P1) ---
    warehouseLocation: 'string | null', // Vị trí kho tiếp nhận (vd: Kho nguyên liệu A)
    recipientName: 'string | null', // Thủ kho / Người đại diện ký nhận
    actualReceivedQuantity: 'number | null', // Khối lượng thực tế cân nhận
    acceptedQuantity: 'number | null', // Khối lượng chấp nhận nhập kho
    rejectedQuantity: 'number | null', // Khối lượng không đạt/từ chối
    sealStatus: 'string | null', // Tình trạng niêm phong chì ('Nguyên vẹn', 'Hư hỏng')

    // --- Thông tin Kiểm nghiệm Xuất xưởng (Inspector Structured QC - P1) ---
    testReportNo: 'string | null', // Số hiệu phiếu kiểm nghiệm (vd: KN-0932)
    testMethod: 'string | null', // Phương pháp kiểm nghiệm (vd: HPLC, UV-Vis)
    sampleId: 'string | null', // Mã mẫu lấy kiểm nghiệm
    analystName: 'string | null', // Kiểm nghiệm viên thực hiện
    reviewerName: 'string | null', // Người soát xét / Phê duyệt
    testNotes: 'string | null', // Ghi chú tóm tắt kết quả phân tích
    qcReportNo: 'string | null', // Số phiếu nghiệm thu QC tại nơi nhận (Bước 6)
    qcPassed: 'boolean | null', // Kết quả nghiệm thu QC tại nơi nhận (Bước 6)

    // --- Điều kiện bảo quản & Ghi chú ---
    storageConditions: 'string', // Điều kiện bảo quản (được nhập ở Bước 1)
    notes: 'string | null', // Ghi chú chung
  },

  /**
   * 4. Sự kiện Timeline (Tổng hợp từ on-chain Event log và off-chain metadata)
   */
  TimelineEvent: {
    batchId: 'number',
    eventName: 'string',
    step: 'number',
    stepLabel: 'string',
    actor: 'string',
    actorRole: 'string',
    orgName: 'string',
    timestamp: 'number',
    txHash: 'string',
    blockNumber: 'number',
    docHash: 'string',
    docType: 'string',
    docName: 'string',
    fields: 'object',
  },

  /**
   * 5. Tổ chức tham gia (Organization)
   */
  Organization: {
    address: 'string', // Địa chỉ ví (0x...)
    role: 'number', // Enum Role
    name: 'string', // Tên tổ chức/doanh nghiệp
    licenseHash: 'string', // Mã băm hồ sơ pháp lý trên smart contract
    licenseNumber: 'string | null', // Số giấy phép (nếu có nguồn xác thực)
    operatingSite: 'string | null', // Địa chỉ trụ sở/nhà máy
    contactEmail: 'string | null',
  },
});
