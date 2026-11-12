import { fileType } from '../theme/tokens';
/**
 * File icon and color mapping
 * Maps file extensions to appropriate icon names and colors
 */

import { colors } from '../theme/tokens';

const FILE_ICON_MAP = {
  PDF: {
    icon: 'file-text',
    color: fileType.pdf,
    bgColor: fileType.pdfWash,
    label: 'PDF',
  },
  DOC: {
    icon: 'file-text',
    color: fileType.word,
    bgColor: fileType.wordWash,
    label: 'DOC',
  },
  DOCX: {
    icon: 'file-text',
    color: fileType.word,
    bgColor: fileType.wordWash,
    label: 'DOCX',
  },
  PPT: {
    icon: 'file-text',
    color: fileType.presentation,
    bgColor: fileType.presentationWash,
    label: 'PPT',
  },
  PPTX: {
    icon: 'file-text',
    color: fileType.presentation,
    bgColor: fileType.presentationWash,
    label: 'PPTX',
  },
  XLS: {
    icon: 'file-text',
    color: fileType.spreadsheet,
    bgColor: fileType.spreadsheetWash,
    label: 'XLS',
  },
  XLSX: {
    icon: 'file-text',
    color: fileType.spreadsheet,
    bgColor: fileType.spreadsheetWash,
    label: 'XLSX',
  },
  JPG: {
    icon: 'image',
    color: fileType.image,
    bgColor: fileType.imageWash,
    label: 'JPG',
  },
  JPEG: {
    icon: 'image',
    color: fileType.image,
    bgColor: fileType.imageWash,
    label: 'JPEG',
  },
  PNG: {
    icon: 'image',
    color: fileType.image,
    bgColor: fileType.imageWash,
    label: 'PNG',
  },
  GIF: {
    icon: 'image',
    color: fileType.audio,
    bgColor: fileType.audioWash,
    label: 'GIF',
  },
  WEBP: {
    icon: 'image',
    color: fileType.image,
    bgColor: fileType.imageWash,
    label: 'WEBP',
  },
  ZIP: {
    icon: 'archive',
    color: fileType.archive,
    bgColor: fileType.archiveWash,
    label: 'ZIP',
  },
  RAR: {
    icon: 'archive',
    color: fileType.archive,
    bgColor: fileType.archiveWash,
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
