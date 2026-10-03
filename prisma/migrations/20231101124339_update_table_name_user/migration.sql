/*
  Warnings:

  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `danh_gia` DROP FOREIGN KEY `danh_gia_ma_nguoi_dung_fkey`;

-- DropForeignKey
ALTER TABLE `don_hang` DROP FOREIGN KEY `don_hang_ma_nguoi_dung_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_ma_vai_tro_fkey`;

-- DropTable
DROP TABLE `User`;

-- CreateTable
CREATE TABLE `nguoi_dung` (
    `ma_nguoi_dung` INTEGER NOT NULL AUTO_INCREMENT,
    `ten_dang_nhap` VARCHAR(100) NOT NULL,
    `mat_khau` VARCHAR(100) NOT NULL,
    `ten_nguoi_dung` VARCHAR(255) NOT NULL,
    `email` VARCHAR(100) NULL,
    `so_dien_thoai` VARCHAR(11) NULL,
    `gioi_tinh` ENUM('nam', 'nu', 'khac') NULL DEFAULT 'khac',
    `dia_chi` VARCHAR(191) NULL,
    `avatar_url` LONGTEXT NULL,
    `ma_vai_tro` INTEGER NOT NULL,
    `ngay_tao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ngay_cap_nhat` DATETIME(3) NOT NULL,
    `trang_thai` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `nguoi_dung_ten_dang_nhap_key`(`ten_dang_nhap`),
    UNIQUE INDEX `nguoi_dung_email_key`(`email`),
    UNIQUE INDEX `nguoi_dung_so_dien_thoai_key`(`so_dien_thoai`),
    PRIMARY KEY (`ma_nguoi_dung`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `nguoi_dung` ADD CONSTRAINT `nguoi_dung_ma_vai_tro_fkey` FOREIGN KEY (`ma_vai_tro`) REFERENCES `vai_tro`(`ma_vai_tro`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `don_hang` ADD CONSTRAINT `don_hang_ma_nguoi_dung_fkey` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung`(`ma_nguoi_dung`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `danh_gia` ADD CONSTRAINT `danh_gia_ma_nguoi_dung_fkey` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung`(`ma_nguoi_dung`) ON DELETE RESTRICT ON UPDATE CASCADE;
