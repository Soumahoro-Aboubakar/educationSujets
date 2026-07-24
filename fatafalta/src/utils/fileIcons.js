/**
 * File icon and color mapping
 * Maps file extensions to appropriate icon names and colors
 */

import { colors } from '../theme/tokens';

const FILE_ICON_MAP = {
  PDF: {
    icon: 'file-text',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    label: 'PDF',
  },
  DOC: {
    icon: 'file-text',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    label: 'DOC',
  },
  DOCX: {
    icon: 'file-text',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    label: 'DOCX',
  },
  PPT: {
    icon: 'file-text',
    color: '#F97316',
    bgColor: '#FFF7ED',
    label: 'PPT',
  },
  PPTX: {
    icon: 'file-text',
    color: '#F97316',
    bgColor: '#FFF7ED',
    label: 'PPTX',
  },
  XLS: {
    icon: 'file-text',
    color: '#10B981',
    bgColor: '#ECFDF5',
    label: 'XLS',
  },
  XLSX: {
    icon: 'file-text',
    color: '#10B981',
    bgColor: '#ECFDF5',
    label: 'XLSX',
  },
  JPG: {
    icon: 'image',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    label: 'JPG',
  },
  JPEG: {
    icon: 'image',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    label: 'JPEG',
  },
  PNG: {
    icon: 'image',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    label: 'PNG',
  },
  GIF: {
    icon: 'image',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    label: 'GIF',
  },
  WEBP: {
    icon: 'image',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    label: 'WEBP',
  },
  ZIP: {
    icon: 'archive',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    label: 'ZIP',
  },
  RAR: {
    icon: 'archive',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    label: 'RAR',
  },
  TXT: {
    icon: 'file-text',
    color: colors.textMuted,
    bgColor: colors.surfaceRaised,
    label: 'TXT',
  },
};

/**
 * Get file icon configuration from extension/fileType
 * @param {string} fileType - Extension or file type (e.g. 'PDF', '.pdf')
 * @returns {{ icon: string, color: string, bgColor: string, label: string }}
 */
export const getFileIcon = (fileType) => {
  if (!fileType) {
    return FILE_ICON_MAP.PDF; // default
  }

  const normalized = fileType.replace('.', '').toUpperCase();
  return FILE_ICON_MAP[normalized] || FILE_ICON_MAP.PDF;
};

export default FILE_ICON_MAP;
