import React from 'react';

export const ProfilePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">My Profile</h1>
        <p className="text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🚧 Coming Soon
        </h2>
        <p className="text-gray-600">
          The profile functionality is currently being developed. This will
          include:
        </p>
        <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-gray-600">
          <li>• Update personal information</li>
          <li>• Change password and security settings</li>
          <li>• Manage notification preferences</li>
          <li>• View usage statistics</li>
          <li>• Account deletion and data export</li>
        </ul>
      </div>
    </div>
  );
};
