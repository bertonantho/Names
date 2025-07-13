import React from 'react';

export const FavoritesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">My Favorites</h1>
        <p className="text-gray-600">
          View and manage your saved favorite names.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🚧 Coming Soon
        </h2>
        <p className="text-gray-600">
          The favorites functionality is currently being developed. This will
          include:
        </p>
        <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-gray-600">
          <li>• Save and organize favorite names</li>
          <li>• Create custom collections</li>
          <li>• Add notes and ratings</li>
          <li>• Share favorites with partners</li>
          <li>• Export favorites list</li>
        </ul>
      </div>
    </div>
  );
};
