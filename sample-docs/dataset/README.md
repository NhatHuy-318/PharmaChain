# Bộ dữ liệu minh họa

File này và các hồ sơ trong thư mục do `node scripts/seed.js` sinh từ [scripts/dataset/dataset.js](../../scripts/dataset/dataset.js); không sửa tay.
Mọi tổ chức và hồ sơ đều là giả định.

Hash là SHA-256 của nội dung file, giống giá trị DApp tính trong trình duyệt và giá trị ghi trong event trên chuỗi.
Không mở rồi lưu lại các file này bằng trình soạn thảo: chỉ cần đổi ký tự xuống dòng là hash đã khác.

## Lô

`batchId` do contract cấp theo thứ tự đăng ký, nên đúng như cột # khi nạp lên một contract mới.

| # | Số lô | Nguyên liệu | Trạng thái cuối |
|---|---|---|---|
| 1 | `PEN-ABC-20260901-001` | Penicillin G potassium | Released |
| 2 | `AMO-ABC-20260905-002` | Amoxicillin trihydrate | Quarantined |
| 3 | `PAR-ABC-20260910-003` | Paracetamol | Rejected |
| 4 | `CEF-ABC-20260915-004` | Cefuroxime axetil | Received |
| 5 | `AZI-ABC-20261001-005` | Azithromycin dihydrate | InTransfer |
| 6 | `MET-ABC-20261008-006` | Metformin hydrochloride | Imported |
| 7 | `CIP-ABC-20261015-007` | Ciprofloxacin hydrochloride | Tested |
| 8 | `IBU-ABC-20261020-008` | Ibuprofen | Registered |

## Hồ sơ từng bước

| Số lô | Bước | File | SHA-256 |
|---|---|---|---|
| `PEN-ABC-20260901-001` | B1 | [B1_COA-2026-0001.txt](PEN-ABC-20260901-001/B1_COA-2026-0001.txt) | `0x2c5ab59e9beacbbbdf00f8870ddd0abc2816331134e26d6a5cbea71c4fa9f38b` |
| `PEN-ABC-20260901-001` | B2 | [B2_KN-2026-0001.txt](PEN-ABC-20260901-001/B2_KN-2026-0001.txt) | `0xf97301dbb5fed3fe0b7c19effc31db9e6fa61f8b2770d37b5e2cfcf4870ee6dc` |
| `PEN-ABC-20260901-001` | B3 | [B3_HQ-2026-0001.txt](PEN-ABC-20260901-001/B3_HQ-2026-0001.txt) | `0x16ec94da5c9d5e234f9454dc3c37e774c69a8ac0ad5a7348d1bec3bdc1bdb763` |
| `PEN-ABC-20260901-001` | B4 | [B4_PGH-2026-0001.txt](PEN-ABC-20260901-001/B4_PGH-2026-0001.txt) | `0xcc9a3f61a9cb63cf3fbb674203a1f7d33d1feffa13180699f870815f5b16dd67` |
| `PEN-ABC-20260901-001` | B5 | [B5_BBN-2026-0001.txt](PEN-ABC-20260901-001/B5_BBN-2026-0001.txt) | `0x7c9b6828fa28e651e3b6ae746cda598f4c32cf98e25e64222c9ca2a0d9e014c1` |
| `PEN-ABC-20260901-001` | B6 | [B6_QC-2026-0001.txt](PEN-ABC-20260901-001/B6_QC-2026-0001.txt) | `0x9cccd7198a2b1846315fe2a89ccbb530780a2b904af7e1bb407ec39a9cb64e45` |
| `AMO-ABC-20260905-002` | B1 | [B1_COA-2026-0002.txt](AMO-ABC-20260905-002/B1_COA-2026-0002.txt) | `0x2e3262890f58b2945e32cbccd95bf728656c5ece20ebc4932a2540d0bcfd4b23` |
| `AMO-ABC-20260905-002` | B2 | [B2_KN-2026-0002.txt](AMO-ABC-20260905-002/B2_KN-2026-0002.txt) | `0x51276c313c8d0819ca4a9b7f8935db2b30b0aee1561535a0d863be99482dd264` |
| `AMO-ABC-20260905-002` | B3 | [B3_HQ-2026-0002.txt](AMO-ABC-20260905-002/B3_HQ-2026-0002.txt) | `0x39c0e3d7cba4da0ab5ee064cb832ab5ba0a59fcdf0ac36d01541a1499f835e9c` |
| `AMO-ABC-20260905-002` | B4 | [B4_PGH-2026-0002.txt](AMO-ABC-20260905-002/B4_PGH-2026-0002.txt) | `0x737483b46cd6e2db2b8aa2ab6659abd015d4faacc4e4efb723bf00b75e3162dc` |
| `AMO-ABC-20260905-002` | B5 | [B5_BBN-2026-0002.txt](AMO-ABC-20260905-002/B5_BBN-2026-0002.txt) | `0x2cef72727e386b6ade4c700d95d5b505d612a56ed9c57982651061995ac36ee7` |
| `AMO-ABC-20260905-002` | B6 | [B6_QC-2026-0002.txt](AMO-ABC-20260905-002/B6_QC-2026-0002.txt) | `0x74284dbd43d38ca8669c1c867d882ecbb90800dfca79d31977d1ee1bdef1b43f` |
| `PAR-ABC-20260910-003` | B1 | [B1_COA-2026-0003.txt](PAR-ABC-20260910-003/B1_COA-2026-0003.txt) | `0xda782d5d8f3fa979ea966e948829995d44927593ab23a8b9d001eb524b359d96` |
| `PAR-ABC-20260910-003` | B2 | [B2_KN-2026-0003.txt](PAR-ABC-20260910-003/B2_KN-2026-0003.txt) | `0x01f560412c9dac79cf9d5cd286030367301b5f9d530480c55e5ccbc9f1a2b5f7` |
| `CEF-ABC-20260915-004` | B1 | [B1_COA-2026-0004.txt](CEF-ABC-20260915-004/B1_COA-2026-0004.txt) | `0xda1a4b55c3fcdfc025543b6417132153826f386b5d9ae74a8c1cf3bb3be2d7d7` |
| `CEF-ABC-20260915-004` | B2 | [B2_KN-2026-0004.txt](CEF-ABC-20260915-004/B2_KN-2026-0004.txt) | `0xa40ffad0a168138924e63390b9f2a78eab1dc20c2c99869d4444911de725f22a` |
| `CEF-ABC-20260915-004` | B3 | [B3_HQ-2026-0003.txt](CEF-ABC-20260915-004/B3_HQ-2026-0003.txt) | `0x74743021149a693cf909dcb799e7f5e220ce7a2227432daeb7dbbb4291c3fd69` |
| `CEF-ABC-20260915-004` | B4 | [B4_PGH-2026-0003.txt](CEF-ABC-20260915-004/B4_PGH-2026-0003.txt) | `0xe964582651b254dc64ba988096c2c4eec5df85927948b07ca1ead3466feb643b` |
| `CEF-ABC-20260915-004` | B5 | [B5_BBN-2026-0003.txt](CEF-ABC-20260915-004/B5_BBN-2026-0003.txt) | `0x2c84d5d4cb3bb5ff46ffeaf4a9aae6d573f17d69f4526f4756247e0a94e8efcf` |
| `AZI-ABC-20261001-005` | B1 | [B1_COA-2026-0005.txt](AZI-ABC-20261001-005/B1_COA-2026-0005.txt) | `0x979ecce573a66603c68679bb6c69856593c8c63e91b5cf5b1a902a9e55432add` |
| `AZI-ABC-20261001-005` | B2 | [B2_KN-2026-0005.txt](AZI-ABC-20261001-005/B2_KN-2026-0005.txt) | `0xd5184fe450552d1d22b205b4c5e2a32695e053c80534b1dc570dcc8206170611` |
| `AZI-ABC-20261001-005` | B3 | [B3_HQ-2026-0004.txt](AZI-ABC-20261001-005/B3_HQ-2026-0004.txt) | `0xedc8a0b6d283ca43b84013a0de11c74bacbd9bdf0b644653ff135ad7c385623b` |
| `AZI-ABC-20261001-005` | B4 | [B4_PGH-2026-0004.txt](AZI-ABC-20261001-005/B4_PGH-2026-0004.txt) | `0xa444bbde9bf98647cf63b11676c12d73c623ebc93829d6f77e4de6cddbd87f78` |
| `AZI-ABC-20261001-005` | B4-huy | [B4-huy_BBH-2026-0001.txt](AZI-ABC-20261001-005/B4-huy_BBH-2026-0001.txt) | `0xc7b798d118d3f9c5d6e8b27b05dcb5ee7a1e57df194d6cc974ac5f0095e30d76` |
| `AZI-ABC-20261001-005` | B4 | [B4_PGH-2026-0005.txt](AZI-ABC-20261001-005/B4_PGH-2026-0005.txt) | `0xd3519f416349c861bcf4b302366dce617cff38ba49f07034f488b4eadf47e1c6` |
| `MET-ABC-20261008-006` | B1 | [B1_COA-2026-0006.txt](MET-ABC-20261008-006/B1_COA-2026-0006.txt) | `0x22941a536b1b247406f6fe4ac20a54544755477a6c9afa9942c2b34683ee0cae` |
| `MET-ABC-20261008-006` | B2 | [B2_KN-2026-0006.txt](MET-ABC-20261008-006/B2_KN-2026-0006.txt) | `0x4da625da512e0ee2cc42c44bf26803a4fc9d8060192c2d535beeb03dcef1315d` |
| `MET-ABC-20261008-006` | B3 | [B3_HQ-2026-0005.txt](MET-ABC-20261008-006/B3_HQ-2026-0005.txt) | `0xd67db6afc039077aa34bd341f070939fa8991e4304affb8b650843e5d12fd9a9` |
| `CIP-ABC-20261015-007` | B1 | [B1_COA-2026-0007.txt](CIP-ABC-20261015-007/B1_COA-2026-0007.txt) | `0x19f96065af67ea257a2bbff5a67c18547a08c75ad4ea7e50c1837126b130046c` |
| `CIP-ABC-20261015-007` | B2 | [B2_KN-2026-0007.txt](CIP-ABC-20261015-007/B2_KN-2026-0007.txt) | `0x3ea67a44cf4c2d0b4a78709d4606d0e49fd1750b0c1ae1acf7b0aac991cf29c4` |
| `IBU-ABC-20261020-008` | B1 | [B1_COA-2026-0008.txt](IBU-ABC-20261020-008/B1_COA-2026-0008.txt) | `0x2102544e02d165a06e82d09bbb95b9f5ac10cf28c563a2877388cc49840ca9e0` |

Bản bị sửa để demo đối chiếu: [B1_COA-2026-0001_DA-SUA.txt](PEN-ABC-20260901-001/B1_COA-2026-0001_DA-SUA.txt) chỉ khác bản gốc ở dòng định lượng,
hash `0xc4cefe18b82d9f89e66411628773ade27c1fa3cff82d86ac53209e4150d41b76`.

## Giấy phép của tổ chức (Bước 0)

| Tổ chức | Vai trò | File | SHA-256 |
|---|---|---|---|
| Công ty Hóa dược ABC | Manufacturer | [GP-2026-0001.txt](to-chuc/GP-2026-0001.txt) | `0x7de1c635633df7811baab6aa1ca2d35ac4c14ac417784167a5d51f8ad4366336` |
| Trung tâm Kiểm nghiệm Beta | Inspector | [GP-2026-0002.txt](to-chuc/GP-2026-0002.txt) | `0x9553d149864084d9cbfc119489064fcfb620437682cc1e71bb22328443267467` |
| Công ty Nhập khẩu Gamma | Importer | [GP-2026-0003.txt](to-chuc/GP-2026-0003.txt) | `0x562463fa9907974452a720b59f048223a98cc7be7ad46e0a28f50f5dbb902fdf` |
| Nhà máy Dược Delta | Receiver | [GP-2026-0004.txt](to-chuc/GP-2026-0004.txt) | `0x813f4aaa1b1e9b92a810a0f7c35345e0f0f12fc89cd3fdcb7c1112e93e5e0035` |
| Nhà máy Dược Epsilon | Receiver | [GP-2026-0005.txt](to-chuc/GP-2026-0005.txt) | `0x288f3c8afc51de40f80d0c192cac56f0c781d1942176d6c69191f4c05df7c342` |
