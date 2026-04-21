import React from 'react';

export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm mt-4">
      {Icon && <Icon className="w-16 h-16 text-gray-300 mb-4" />}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  );
}
