-- CreateIndex
CREATE INDEX `xe_trang_thai_idx` ON `xe`(`trang_thai`);

-- CreateIndex
CREATE INDEX `xe_ma_mau_xe_idx` ON `xe`(`ma_mau_xe`);

-- CreateIndex
CREATE INDEX `xe_ma_nguoi_dung_idx` ON `xe`(`ma_nguoi_dung`);

-- CreateIndex
CREATE INDEX `chi_tiet_don_hang_ma_xe_ngay_bat_dau_ngay_ket_thuc_idx` ON `chi_tiet_don_hang`(`ma_xe`, `ngay_bat_dau`, `ngay_ket_thuc`);

-- CreateIndex
CREATE INDEX `chi_tiet_don_hang_trang_thai_chi_tiet_don_hang_idx` ON `chi_tiet_don_hang`(`trang_thai_chi_tiet_don_hang`);

-- CreateIndex
CREATE INDEX `don_hang_ma_nguoi_dung_idx` ON `don_hang`(`ma_nguoi_dung`);
