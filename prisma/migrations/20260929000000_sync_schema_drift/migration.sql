-- Đồng bộ lịch sử migration với schema thực tế.
-- Schema đã từng được cập nhật bằng `prisma db push` nên các migration trước không tạo lại được DB từ đầu.
--
-- DB ĐANG CHẠY (đã có sẵn các cột bên dưới) KHÔNG được chạy lại file này, hãy đánh dấu đã áp dụng:
--   npx prisma migrate resolve --applied 20260929000000_sync_schema_drift
-- DB mới tạo thì cứ `prisma migrate deploy` như bình thường.

-- DropForeignKey
ALTER TABLE `danh_gia` DROP FOREIGN KEY `danh_gia_ma_xe_fkey`;

-- DropIndex
DROP INDEX `danh_gia_ma_xe_fkey` ON `danh_gia`;

-- DropIndex
DROP INDEX `nguoi_dung_ten_dang_nhap_key` ON `nguoi_dung`;

-- AlterTable
ALTER TABLE `chi_tiet_don_hang` DROP COLUMN `trang_thai`,
    ADD COLUMN `ghi_chu` TEXT NULL,
    ADD COLUMN `phi_dich_vu` DECIMAL(10, 2) NULL,
    ADD COLUMN `tien_dat_coc` DECIMAL(10, 2) NULL,
    ADD COLUMN `trang_thai_chi_tiet_don_hang` ENUM('cho_xac_nhan', 'da_xac_nhan', 'da_huy', 'da_nhan_xe', 'da_hoan_thanh') NOT NULL DEFAULT 'cho_xac_nhan',
    ADD COLUMN `trang_thai_thanh_toan` ENUM('cho_thanh_toan', 'da_dat_coc', 'da_thanh_toan', 'da_hoan_tien') NULL DEFAULT 'cho_thanh_toan',
    MODIFY `ngay_bat_dau` DATE NOT NULL,
    MODIFY `ngay_ket_thuc` DATE NOT NULL;

-- AlterTable
ALTER TABLE `danh_gia` DROP COLUMN `ma_xe`,
    ADD COLUMN `ma_chi_tiet_don_hang` INTEGER NULL;

-- AlterTable
ALTER TABLE `don_hang` DROP COLUMN `trang_thai`,
    ADD COLUMN `trang_thai_don_hang` ENUM('cho_xac_nhan', 'da_xac_nhan', 'da_huy', 'da_hoan_thanh') NOT NULL DEFAULT 'cho_xac_nhan',
    ADD COLUMN `trang_thai_thanh_toan` ENUM('cho_thanh_toan', 'da_dat_coc', 'da_thanh_toan', 'da_hoan_tien') NULL DEFAULT 'cho_thanh_toan';

-- AlterTable
ALTER TABLE `mau_sac_xe` MODIFY `ten_mau_sac_xe` ENUM('den', 'trang', 'do', 'xanh_duong', 'vang', 'cam', 'xanh_la', 'tim', 'hong', 'nau', 'xam', 'bac') NOT NULL;

-- AlterTable
ALTER TABLE `nguoi_dung` DROP COLUMN `ten_dang_nhap`,
    ADD COLUMN `dang_ky_chu_xe` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ngay_dang_ky_chu_xe` DATETIME(3) NULL,
    ADD COLUMN `tai_khoan` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `xe` MODIFY `trang_thai` ENUM('san_sang', 'dang_thue', 'khong_san_sang') NOT NULL DEFAULT 'khong_san_sang';

-- CreateIndex
CREATE UNIQUE INDEX `danh_gia_ma_chi_tiet_don_hang_key` ON `danh_gia`(`ma_chi_tiet_don_hang`);

-- CreateIndex
CREATE UNIQUE INDEX `nguoi_dung_tai_khoan_key` ON `nguoi_dung`(`tai_khoan`);

-- AddForeignKey
ALTER TABLE `danh_gia` ADD CONSTRAINT `danh_gia_ma_chi_tiet_don_hang_fkey` FOREIGN KEY (`ma_chi_tiet_don_hang`) REFERENCES `chi_tiet_don_hang`(`ma_chi_tiet_don_hang`) ON DELETE CASCADE ON UPDATE CASCADE;

