import React from 'react';

export const NameDetailsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Name Details</h1>
        <p className="text-gray-600">
          Detailed information about a specific name.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🚧 Coming Soon
        </h2>
        <p className="text-gray-600">
          The name details page is currently being developed. This will include:
        </p>
        <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-gray-600">
          <li>• Complete name meaning and etymology</li>
          <li>• Origin and cultural background</li>
          <li>• Popularity trends over time</li>
          <li>• Famous people with this name</li>
          <li>• Name variations and nicknames</li>
        </ul>
      </div>
    </div>
  );
};
