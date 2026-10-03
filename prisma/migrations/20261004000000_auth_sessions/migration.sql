-- CreateTable
CREATE TABLE `phien_dang_nhap` (
    `ma_phien` VARCHAR(36) NOT NULL,
    `ma_nguoi_dung` INTEGER NOT NULL,
    `jti_hien_tai` VARCHAR(36) NOT NULL,
    `jti_truoc_do` VARCHAR(36) NULL,
    `xoay_vong_luc` DATETIME(3) NULL,
    `thiet_bi` VARCHAR(255) NULL,
    `het_han` DATETIME(3) NOT NULL,
    `thu_hoi_luc` DATETIME(3) NULL,
    `ngay_tao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `phien_dang_nhap_ma_nguoi_dung_idx`(`ma_nguoi_dung`),
    INDEX `phien_dang_nhap_het_han_idx`(`het_han`),
    PRIMARY KEY (`ma_phien`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `phien_dang_nhap` ADD CONSTRAINT `phien_dang_nhap_ma_nguoi_dung_fkey` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung`(`ma_nguoi_dung`) ON DELETE CASCADE ON UPDATE CASCADE;

