/**
 * Automated Test Suite for MockChainAdapter & BatchService
 * Kiểm thử toàn diện 100% các điều kiện máy trạng thái, kiểm soát vai trò và xử lý ngoại lệ
 */

import { MockChainAdapter } from '../dapp/js/services/chain/mockChain.adapter.js';
import { Role } from '../dapp/js/constants/roles.js';
import { BatchStatus } from '../dapp/js/constants/batchStatus.js';
import { HashService } from '../dapp/js/services/hash.service.js';
import fs from 'fs';
import path from 'path';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName}`);
  }
}

async function assertRevert(asyncFn, expectedMessage, testName) {
  try {
    await asyncFn();
    failedCount++;
    console.error(`  [FAIL] ${testName} (Kỳ vọng lỗi "${expectedMessage}" nhưng hàm chạy thành công)`);
  } catch (err) {
    if (err.message.includes(expectedMessage)) {
      passedCount++;
      console.log(`  [PASS] ${testName} -> Chặn đúng: ${expectedMessage}`);
    } else {
      failedCount++;
      console.error(`  [FAIL] ${testName} (Lỗi nhận được "${err.message}" không chứa "${expectedMessage}")`);
    }
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 2: SERVICE & MOCK');
  console.log('======================================================\n');

  // Khởi tạo adapter độc lập
  const chain = new MockChainAdapter();

  // Nạp dữ liệu mock từ file json
  const orgs = JSON.parse(fs.readFileSync('./dapp/data/organizations.json', 'utf8'));
  const batches = JSON.parse(fs.readFileSync('./dapp/data/batches.json', 'utf8'));
  const events = JSON.parse(fs.readFileSync('./dapp/data/events.json', 'utf8'));

  await chain.init({ organizations: orgs, batches, events });

  const ADMIN = '0x1111111111111111111111111111111111111111';
  const MFG = '0x2222222222222222222222222222222222222222';
  const INSP = '0x3333333333333333333333333333333333333333';
  const IMP = '0x4444444444444444444444444444444444444444';
  const REC = '0x5555555555555555555555555555555555555555';
  const STRANGER = '0x8888888888888888888888888888888888888888';

  const DUMMY_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

  console.log('--- Nhóm 1: Kiểm thử Phân quyền & Quản lý vai trò (Bước 0) ---');
  // Giả lập caller
  chain._getSender = () => ADMIN;
  const newAccount = '0x7777777777777777777777777777777777777777';
  await chain.grantRole(newAccount, Role.Manufacturer, 'Công ty Dược ABC', DUMMY_HASH);
  assert((await chain.getRole(newAccount)) === Role.Manufacturer, 'Admin cấp quyền Manufacturer thành công');

  await assertRevert(
    () => chain.grantRole(newAccount, Role.Inspector, 'ABC', DUMMY_HASH),
    'BR: account has role',
    'Chặn cấp vai trò thứ hai cho ví đã có vai trò'
  );

  chain._getSender = () => MFG;
  await assertRevert(
    () => chain.grantRole('0x6666666666666666666666666666666666666666', Role.Inspector, 'ABC', DUMMY_HASH),
    'BR: not admin',
    'Chặn ví không phải Admin gọi grantRole'
  );

  chain._getSender = () => ADMIN;
  await chain.revokeRole(newAccount);
  assert((await chain.getRole(newAccount)) === Role.None, 'Admin thu hồi vai trò thành công (về None)');

  await assertRevert(
    () => chain.revokeRole(ADMIN),
    'BR: cannot revoke admin',
    'Chặn thu hồi quyền của Quản trị viên (Admin)'
  );

  console.log('\n--- Nhóm 2: Kiểm thử Đăng ký lô (Bước 1) ---');
  chain._getSender = () => MFG;
  const now = Math.floor(Date.now() / 1000);
  const mfgDate = now - 86400 * 5;
  const expiryDate = now + 86400 * 365;

  const testBatchNo = 'TEST-BATCH-001';
  const bId = await chain.registerBatch(
    testBatchNo,
    'Hoạt chất Thử nghiệm',
    mfgDate,
    expiryDate,
    'Dưới 25°C',
    IMP,
    DUMMY_HASH
  );
  assert(bId > 0, `Manufacturer đăng ký lô thành công, cấp batchId = ${bId}`);

  const batchObj = await chain.getBatch(bId);
  assert(batchObj.status === BatchStatus.Registered, 'Lô mới tạo ở trạng thái Registered');
  assert(batchObj.holder.toLowerCase() === MFG.toLowerCase(), 'Người giữ ban đầu là Manufacturer');

  await assertRevert(
    () => chain.registerBatch(testBatchNo, 'Trùng số lô', mfgDate, expiryDate, 'Dưới 25°C', IMP, DUMMY_HASH),
    'BR: batchNo used',
    'Chặn đăng ký trùng số hiệu lô (batchNo used)'
  );

  await assertRevert(
    () => chain.registerBatch('INVALID/lowercase', 'Dược liệu', mfgDate, expiryDate, 'Dưới 25°C', IMP, DUMMY_HASH),
    'BR: invalid batchNo',
    'Chặn số lô chứa chữ thường'
  );

  await assertRevert(
    () => chain.registerBatch('TEST-DATE-ERR', 'Dược liệu', expiryDate, mfgDate, 'Dưới 25°C', IMP, DUMMY_HASH),
    'BR: invalid dates',
    'Chặn ngày sản xuất sau hạn sử dụng'
  );

  await assertRevert(
    () => chain.registerBatch('TEST-IMP-ERR', 'Dược liệu', mfgDate, expiryDate, 'Dưới 25°C', STRANGER, DUMMY_HASH),
    'BR: not importer',
    'Chặn chỉ định ví không có vai trò Importer'
  );

  console.log('\n--- Nhóm 3: Kiểm thử Kiểm nghiệm xuất xưởng (Bước 2) ---');
  chain._getSender = () => STRANGER;
  await assertRevert(
    () => chain.recordTestResult(bId, true, 'KN-01', mfgDate + 86400, DUMMY_HASH),
    'BR: wrong role',
    'Chặn ví không phải Inspector ghi kết quả kiểm nghiệm'
  );

  chain._getSender = () => INSP;
  await chain.recordTestResult(bId, true, 'KN-TEST-99', mfgDate + 86400, DUMMY_HASH);
  const batchAfterTest = await chain.getBatch(bId);
  assert(batchAfterTest.status === BatchStatus.Tested, 'Kiểm nghiệm Đạt chuyển trạng thái sang Tested');

  await assertRevert(
    () => chain.recordTestResult(bId, true, 'KN-TEST-REPEAT', mfgDate + 86400, DUMMY_HASH),
    'BR: wrong status',
    'Chặn ghi kiểm nghiệm lần 2 trên cùng một lô'
  );

  console.log('\n--- Nhóm 4: Kiểm thử Nhập khẩu & Hải quan (Bước 3) ---');
  chain._getSender = () => STRANGER;
  await assertRevert(
    () => chain.recordImport(bId, 'Ấn Độ', 'HQ-01', mfgDate + 86400 * 2, DUMMY_HASH),
    'BR: wrong role',
    'Chặn ví không có vai trò Importer gọi recordImport'
  );

  chain._getSender = () => IMP;
  await chain.recordImport(bId, 'Ấn Độ', 'HQ-9988', mfgDate + 86400 * 2, DUMMY_HASH);
  const batchAfterImport = await chain.getBatch(bId);
  assert(batchAfterImport.status === BatchStatus.Imported, 'Lô chuyển sang Imported');
  assert(batchAfterImport.holder.toLowerCase() === IMP.toLowerCase(), 'Người giữ chuyển sang Importer');

  console.log('\n--- Nhóm 5: Kiểm thử Khởi tạo chuyển giao & Hủy chuyển giao (Bước 4 & Ngoại lệ) ---');
  chain._getSender = () => IMP;
  await chain.initiateTransfer(bId, REC, DUMMY_HASH);
  let batchInTransfer = await chain.getBatch(bId);
  assert(batchInTransfer.status === BatchStatus.InTransfer, 'Lô chuyển sang InTransfer');
  assert(batchInTransfer.holder.toLowerCase() === IMP.toLowerCase(), 'Trong lúc InTransfer, Importer vẫn là holder');
  assert(batchInTransfer.receiver.toLowerCase() === REC.toLowerCase(), 'Receiver đích danh được lưu trữ');

  // Thử hủy chuyển giao
  await chain.cancelTransfer(bId, DUMMY_HASH);
  let batchCancelled = await chain.getBatch(bId);
  assert(batchCancelled.status === BatchStatus.Imported, 'Hủy chuyển giao thành công: Lô quay về Imported');
  assert(batchCancelled.receiver.toLowerCase() === ZERO_HASH.substring(0, 42), 'Receiver đã được reset về 0x0');

  // Khởi tạo chuyển giao lại
  await chain.initiateTransfer(bId, REC, DUMMY_HASH);
  assert((await chain.getBatch(bId)).status === BatchStatus.InTransfer, 'Khởi tạo chuyển giao lại thành công');

  console.log('\n--- Nhóm 6: Kiểm thử Tiếp nhận & Kiểm tra nơi nhận (Bước 5 & 6) ---');
  chain._getSender = () => STRANGER;
  await assertRevert(
    () => chain.confirmTransfer(bId, DUMMY_HASH),
    'BR: wrong role',
    'Chặn ví không phải Receiver xác nhận tiếp nhận'
  );

  chain._getSender = () => REC;
  await chain.confirmTransfer(bId, DUMMY_HASH);
  const batchReceived = await chain.getBatch(bId);
  assert(batchReceived.status === BatchStatus.Received, 'Lô chuyển sang Received');
  assert(batchReceived.holder.toLowerCase() === REC.toLowerCase(), 'Bên nhận trở thành holder');

  // Bước 6: Kiểm tra tại nơi nhận (Release)
  await chain.recordReceivingInspection(bId, true, 'QC-TEST-01', mfgDate + 86400 * 3, DUMMY_HASH);
  const batchReleased = await chain.getBatch(bId);
  assert(batchReleased.status === BatchStatus.Released, 'Kiểm tra đạt: Lô chuyển sang Released');

  await assertRevert(
    () => chain.recordReceivingInspection(bId, true, 'QC-AGAIN', mfgDate + 86400 * 3, DUMMY_HASH),
    'BR: wrong status',
    'Chặn ghi kiểm tra QC lần 2 cho lô đã Released (Terminal)'
  );

  console.log('\n--- Nhóm 7: Kiểm thử Toàn vẹn mã băm SHA-256 (Hash Service) ---');
  const sampleDocPath = './sample-docs/COA_PEN-K-20260901-001.txt';
  const modifiedDocPath = './sample-docs/COA_PEN-K-20260901-001_MODIFIED.txt';

  const originalContent = fs.readFileSync(sampleDocPath, 'utf8');
  const modifiedContent = fs.readFileSync(modifiedDocPath, 'utf8');

  const expectedCoaHash = '0x59857645f9d131d4d760bbba4f3550197ce89826a4160b4f17753c981ac7da6d';

  const resOriginal = await HashService.verifyFileHash(originalContent, expectedCoaHash);
  assert(resOriginal.match === true, 'Tài liệu gốc COA xác minh: KHỚP 100%');

  const resModified = await HashService.verifyFileHash(modifiedContent, expectedCoaHash);
  assert(resModified.match === false, 'Tài liệu COA bị sửa đổi: BÁO KHÔNG KHỚP chính xác');

  console.log('\n======================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedCount} ĐẠT / ${passedCount + failedCount} TỔNG CỘNG`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Lỗi ngoại lệ trong quá trình chạy kiểm thử:', err);
  process.exit(1);
});

