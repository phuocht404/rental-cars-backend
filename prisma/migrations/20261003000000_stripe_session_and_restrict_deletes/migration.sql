-- DropForeignKey
ALTER TABLE `xe` DROP FOREIGN KEY `xe_ma_nguoi_dung_fkey`;

-- DropForeignKey
ALTER TABLE `don_hang` DROP FOREIGN KEY `don_hang_ma_nguoi_dung_fkey`;

-- DropForeignKey
ALTER TABLE `chi_tiet_don_hang` DROP FOREIGN KEY `chi_tiet_don_hang_ma_xe_fkey`;

-- AlterTable
ALTER TABLE `nguoi_dung` MODIFY `so_dien_thoai` VARCHAR(15) NULL;

-- AlterTable
ALTER TABLE `don_hang` ADD COLUMN `stripe_session_id` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `don_hang_stripe_session_id_key` ON `don_hang`(`stripe_session_id`);

-- CreateIndex
CREATE INDEX `danh_gia_ma_nguoi_dung_idx` ON `danh_gia`(`ma_nguoi_dung`);

-- AddForeignKey
ALTER TABLE `xe` ADD CONSTRAINT `xe_ma_nguoi_dung_fkey` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung`(`ma_nguoi_dung`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `don_hang` ADD CONSTRAINT `don_hang_ma_nguoi_dung_fkey` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung`(`ma_nguoi_dung`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_don_hang` ADD CONSTRAINT `chi_tiet_don_hang_ma_xe_fkey` FOREIGN KEY (`ma_xe`) REFERENCES `xe`(`ma_xe`) ON DELETE RESTRICT ON UPDATE CASCADE;

