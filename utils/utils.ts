import { Decimal } from '@prisma/client/runtime/library';

import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from './constants';

export const getPagination = (page: number, limit: number) => {
  const _page = Number(page) > 0 ? Number(page) : DEFAULT_PAGE;
  const _limit = Number(limit) > 0 ? Math.min(Number(limit), MAX_LIMIT) : DEFAULT_LIMIT;

  return { _page, _limit };
};

export const generateSlug = (name: string): string => {
  const ran = Math.floor(Math.random() * 1000000).toString();

  // "Xe Hơi Đẹp" -> "xe-hoi-dep" (trước đây ký tự có dấu bị xoá mất: "xe-hi-p")
  const base = name
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${base || 'xe'}-${ran}`;
};

export const formatDecimalToNumber = (value: Decimal): number => {
  return Number(value.toFixed(2));
};

export const calculatePercentageChange = (previousValue: number, currentValue: number): number | null => {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100; // Handle division by zero
  }

  return Math.floor(((currentValue - previousValue) / previousValue) * 100);
};

export const formatDateToDMY = (date: Date) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** "ACTIVE,INACTIVE" hoặc ["ACTIVE"] -> danh sách giá trị hợp lệ của enum (bỏ giá trị lạ) */
export const parseEnumList = <T extends string>(value: unknown, allowed: Record<string, T>): T[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const raw = (Array.isArray(value) ? value : String(value).split(',')).map((item) => String(item).trim());
  const valid = raw.filter((item): item is T => (Object.values(allowed) as string[]).includes(item));

  return valid.length > 0 ? valid : undefined;
};

/** Chuỗi tìm kiếm đã cắt khoảng trắng và giới hạn độ dài */
export const normalizeSearch = (value: unknown): string | undefined => {
  const text = typeof value === 'string' ? value.trim().slice(0, 100) : '';
  return text || undefined;
};
