import { randomInt } from 'crypto';

import * as fs from 'fs';
import * as path from 'path';

export const generateOtp = (): string => {
  return randomInt(100000, 999999).toString();
};

export const getExpirationTime = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

export const deleteOldFile = (folder: string, file?: string): void => {
  try {
    if (!file) return;

    const filePath = path.join(__dirname, '../../../uploads', folder, file);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Deleted:', filePath);
    } else {
      console.log('No file:', filePath);
    }
  } catch (error) {
    console.log('Error while deleting file --------->', error);
  }
};

export const parseDate = (dateStr: string) => {
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(dateStr);
};
