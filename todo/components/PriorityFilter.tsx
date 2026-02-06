'use client';

import type { Priority } from '@/types/todo';

interface PriorityFilterProps {
  selectedPriority: Priority | 'all';
  onChange: (priority: Priority | 'all') => void;
}

export default function PriorityFilter({ selectedPriority, onChange }: PriorityFilterProps) {
  const getPriorityBadgeColor = (priority: Priority | 'all') => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      case 'all':
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Filter by Priority
      </label>
      <select
        value={selectedPriority}
        onChange={(e) => onChange(e.target.value as Priority | 'all')}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        <option value="all">All Priorities</option>
        <option value="high">High Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="low">Low Priority</option>
      </select>
      
      {/* Visual indicator of selected priority */}
      {selectedPriority !== 'all' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Showing:</span>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(selectedPriority)}`}>
            {selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)} Priority
          </span>
        </div>
      )}
    </div>
  );
}
