import React from 'react';

export const SearchPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Names</h1>
        <p className="text-gray-600">
          Find the perfect name with our advanced search and filtering options.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🚧 Coming Soon
        </h2>
        <p className="text-gray-600">
          The search functionality is currently being developed. This will
          include:
        </p>
        <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-gray-600">
          <li>• Advanced name filtering by gender, origin, and meaning</li>
          <li>• Real-time search suggestions</li>
          <li>• Popularity rankings and trends</li>
          <li>• Phonetic search capabilities</li>
        </ul>
      </div>
    </div>
  );
};
