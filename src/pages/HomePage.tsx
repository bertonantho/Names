import React from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  HeartIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Baby Names Explorer
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover the perfect name for your little one. Search through
          thousands of names, learn their meanings, and create your favorite
          collections.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/search"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all duration-200 hover:scale-105 group text-center"
        >
          <MagnifyingGlassIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Search Names
          </h3>
          <p className="text-gray-600">
            Explore thousands of names with advanced filtering options
          </p>
        </Link>

        <Link
          to="/favorites"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all duration-200 hover:scale-105 group text-center"
        >
          <HeartIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            My Favorites
          </h3>
          <p className="text-gray-600">
            View and manage your saved favorite names
          </p>
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all duration-200 hover:scale-105 group text-center cursor-pointer">
          <SparklesIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            AI Suggestions
          </h3>
          <p className="text-gray-600">
            Get personalized name recommendations powered by AI
          </p>
        </div>
      </div>

      {/* Featured Names */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Names</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'Emma',
              gender: 'girl',
              meaning: 'Universal, whole',
              origin: 'Germanic',
            },
            {
              name: 'Liam',
              gender: 'boy',
              meaning: 'Strong-willed warrior',
              origin: 'Irish',
            },
            {
              name: 'Olivia',
              gender: 'girl',
              meaning: 'Olive tree',
              origin: 'Latin',
            },
            {
              name: 'Noah',
              gender: 'boy',
              meaning: 'Rest, comfort',
              origin: 'Hebrew',
            },
            {
              name: 'Ava',
              gender: 'girl',
              meaning: 'Life, bird',
              origin: 'Latin',
            },
            {
              name: 'Oliver',
              gender: 'boy',
              meaning: 'Olive tree',
              origin: 'Latin',
            },
          ].map((name, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {name.name}
                </h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    name.gender === 'boy'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-pink-100 text-pink-800'
                  }`}
                >
                  {name.gender}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{name.meaning}</p>
              <p className="text-xs text-gray-500">Origin: {name.origin}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-primary-50 rounded-lg p-8 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              1. Search & Explore
            </h3>
            <p className="text-gray-600">
              Use our powerful search to find names by gender, origin, meaning,
              or popularity.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              2. Save Favorites
            </h3>
            <p className="text-gray-600">
              Create collections of your favorite names and organize them by
              categories.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              3. Get AI Suggestions
            </h3>
            <p className="text-gray-600">
              Let our AI recommend names based on your preferences and naming
              style.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              4. Share & Collaborate
            </h3>
            <p className="text-gray-600">
              Share your collections with your partner and make decisions
              together.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
