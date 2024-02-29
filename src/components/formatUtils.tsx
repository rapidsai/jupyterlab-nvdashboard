import { format } from 'd3-format';

export const formatBytes = (value: number | undefined): string => {
  return value !== undefined ? `${format('.2s')(value)}B` : '';
};

export const formatDate = (value: number | string | undefined): string => {
  return value ? new Date(value).toLocaleTimeString() : '';
};
