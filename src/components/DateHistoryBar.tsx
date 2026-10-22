'use client';

import React from 'react';
import { UnifiedCalendar } from './UnifiedCalendar';

export interface DateHistoryBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onQuickPrint?: (date: string) => void;
  availableDates?: string[];
  cloudStatus?: 'synced' | 'syncing' | 'offline' | 'permission_denied';
  className?: string;
  isSidebar?: boolean;
  defaultCollapsed?: boolean;
  isLoading?: boolean;
}

export const DateHistoryBar: React.FC<DateHistoryBarProps> = ({
  selectedDate,
  onDateChange,
  onQuickPrint,
  availableDates = [],
  cloudStatus = 'synced',
  className = '',
  defaultCollapsed = true,
  isLoading = false,
}) => {
  return (
    <UnifiedCalendar
      selectedDate={selectedDate}
      onDateChange={onDateChange}
      onQuickPrint={onQuickPrint}
      availableDates={availableDates}
      cloudStatus={cloudStatus}
      className={className}
      isLoading={isLoading}
      defaultExpanded={!defaultCollapsed}
    />
  );
};

export default DateHistoryBar;
