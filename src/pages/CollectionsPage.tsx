import React from 'react';

export const CollectionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          My Collections
        </h1>
        <p className="text-gray-600">
          Organize your favorite names into custom collections.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🚧 Coming Soon
        </h2>
        <p className="text-gray-600">
          The collections functionality is currently being developed. This will
          include:
        </p>
        <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-gray-600">
          <li>• Create custom name collections</li>
          <li>• Organize by themes or criteria</li>
          <li>• Share collections with others</li>
          <li>• Collaborative collection editing</li>
          <li>• Collection analytics and insights</li>
        </ul>
      </div>
    </div>
  );
};
