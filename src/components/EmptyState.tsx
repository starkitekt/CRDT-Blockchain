import React from 'react';
import { DataTable } from '@carbon/icons-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'No records found',
  description = 'No data has been recorded yet. Records will appear here once submitted.',
  icon,
}: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={99}>
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-spacing-lg">
            {icon ?? <DataTable size={40} />}
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">{title}</p>
          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">{description}</p>
        </div>
      </td>
    </tr>
  );
}
