import { Decimal } from '@prisma/client/runtime/library';

import { DEFAULT_LIMIT, DEFAULT_PAGE } from './constants';

export const getPagination = (page: number, limit: number) => {
  const _page = Number(page) > 0 ? Number(page) : DEFAULT_PAGE;
  const _limit = Number(limit) > 0 ? Number(limit) : DEFAULT_LIMIT;

  return { _page, _limit };
};

export const generateSlug = (name: string): string => {
  const ran = Math.floor(Math.random() * 1000000).toString();

  return `${name
    .toString()
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')}-${ran}`;
};

export const formatDecimalToNumber = (value: Decimal): number => {
  return Number(value.toFixed(2));
};

export const convertBase64ToFile = (base64String: string): Express.Multer.File => {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  const file: any = {};

  if (matches?.length !== 3) {
    throw new Error('Invalid input string');
  }

  file.fieldname = 'file';
  file.originalname = 'file';
  file.encoding = '7bit';
  file.mimetype = matches[1];
  file.type = matches[1];
  file.buffer = Buffer.from(matches[2], 'base64');
  file.size = Buffer.byteLength(matches[2], 'base64');

  return file;
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
