import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  UserGroupIcon,
  HeartIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  NameData,
  generateGemmaEnhancedRecommendations,
  EnhancedRecommendation,
  FamilyContext,
} from '../services/namesApi';
import {
  testGemmaConnection,
  debugGemmaConnection,
} from '../services/gemmaService';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface FamilyMember {
  id: string;
  name: string;
  gender: 'M' | 'F';
}

interface RecommendationPreferences {
  gender: 'M' | 'F' | 'any';
  popularityLevel: 'rare' | 'uncommon' | 'moderate' | 'popular' | 'any';
  maxLetters: number;
  meaningImportance: 'low' | 'medium' | 'high';
}

export const AIRecommendationsPage: React.FC = () => {
  const [lastName, setLastName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [preferences, setPreferences] = useState<RecommendationPreferences>({
    gender: 'any',
    popularityLevel: 'any',
    maxLetters: 8,
    meaningImportance: 'medium',
  });
  const [recommendations, setRecommendations] = useState<
    EnhancedRecommendation[]
  >([]);
  const [gemmaConnected, setGemmaConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const addFamilyMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: '',
      gender: 'M',
    };
    setFamilyMembers([...familyMembers, newMember]);
  };

  const updateFamilyMember = (
    id: string,
    field: keyof FamilyMember,
    value: string
  ) => {
    setFamilyMembers(
      familyMembers.map((member) =>
        member.id === id ? { ...member, [field]: value } : member
      )
    );
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter((member) => member.id !== id));
  };

  const generateRecommendations = async () => {
    if (!lastName.trim()) {
      alert('Please enter a last name');
      return;
    }

    setLoading(true);
    try {
      // Test Gemma connection if not already tested
      if (gemmaConnected === null) {
        const connected = await testGemmaConnection();
        setGemmaConnected(connected);
      }

      // Prepare family context
      const context: FamilyContext = {
        lastName: lastName.trim(),
        existingChildren: familyMembers
          .filter((member) => member.name.trim())
          .map((member) => ({
            name: member.name.trim(),
            gender: member.gender,
          })),
        preferences,
      };

      // Generate enhanced AI recommendations with Gemma
      const enhancedRecommendations =
        await generateGemmaEnhancedRecommendations(context);
      setRecommendations(enhancedRecommendations);
      setShowResults(true);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert(
        'Sorry, there was an error generating recommendations. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <SparklesIcon className="w-12 h-12 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI Name Recommendations
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
          Get personalized name suggestions based on your family's existing
          names and preferences. Our AI analyzes phonetic harmony, sibling
          compatibility, and naming patterns.
        </p>

        {/* Gemma Connection Status */}
        {gemmaConnected !== null && (
          <div className="flex flex-col items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                gemmaConnected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  gemmaConnected ? 'bg-emerald-500' : 'bg-yellow-500'
                }`}
              />
              {gemmaConnected
                ? 'Gemma 3 AI Connected'
                : 'Gemma 3 AI Unavailable - Using Traditional AI'}
            </div>

            {!gemmaConnected && (
              <button
                onClick={() => debugGemmaConnection()}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Debug Connection (Check Console)
              </button>
            )}
          </div>
        )}
      </div>

      {!showResults ? (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Family Information Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
              Family Information
            </h2>

            {/* Last Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your family's last name"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                We'll analyze phonetic compatibility with your last name
              </p>
            </div>

            {/* Existing Children */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Existing Children's Names
                </label>
                <button
                  onClick={addFamilyMember}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Child
                </button>
              </div>

              {familyMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>
                    Add your existing children's names to get better
                    recommendations
                  </p>
                  <p className="text-sm">
                    We'll find names that complement their siblings
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateFamilyMember(member.id, 'name', e.target.value)
                        }
                        placeholder="Child's name"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <select
                        value={member.gender}
                        onChange={(e) =>
                          updateFamilyMember(
                            member.id,
                            'gender',
                            e.target.value
                          )
                        }
                        className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="M">Boy</option>
                        <option value="F">Girl</option>
                      </select>
                      <button
                        onClick={() => removeFamilyMember(member.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-6 h-6 text-purple-600" />
              Your Preferences
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gender Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender Preference
                </label>
                <select
                  value={preferences.gender}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      gender: e.target.value as any,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="any">Any Gender</option>
                  <option value="M">Boy Names</option>
                  <option value="F">Girl Names</option>
                </select>
              </div>

              {/* Popularity Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popularity Level
                </label>
                <select
                  value={preferences.popularityLevel}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      popularityLevel: e.target.value as any,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="any">Any Popularity</option>
                  <option value="rare">Rare & Unique</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="moderate">Moderately Popular</option>
                  <option value="popular">Very Popular</option>
                </select>
              </div>

              {/* Max Letters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre maximum de lettres
                </label>
                <input
                  type="number"
                  min="2"
                  max="15"
                  value={preferences.maxLetters}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      maxLetters: parseInt(e.target.value) || 8,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Limite la longueur des noms suggérés
                </p>
              </div>

              {/* Meaning Importance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meaning Importance
                </label>
                <select
                  value={preferences.meaningImportance}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      meaningImportance: e.target.value as any,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Not important</option>
                  <option value="medium">Somewhat important</option>
                  <option value="high">Very important</option>
                </select>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={generateRecommendations}
              disabled={loading || !lastName.trim()}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <SparklesIcon className="w-6 h-6" />
              )}
              {loading
                ? 'Generating Recommendations...'
                : 'Get AI Recommendations'}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Results Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              AI-Powered Recommendations
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Based on your family name "{lastName}" and preferences, here are
              our top suggestions:
            </p>
            <button
              onClick={() => setShowResults(false)}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to Form
            </button>
          </div>

          {/* Recommendations Grid */}
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation.name.name}-${recommendation.name.sex}`}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  {/* Ranking Badge and Gemma Indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index < 3
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                            : index < 6
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      {recommendation.isGemmaRecommended && (
                        <div className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs rounded-full font-medium">
                          Gemma AI
                        </div>
                      )}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        recommendation.name.sex === 'M'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-pink-100 text-pink-800'
                      }`}
                    >
                      {recommendation.name.sex === 'M' ? 'Boy' : 'Girl'}
                    </div>
                  </div>

                  {/* Name */}
                  <Link
                    to={`/name/${recommendation.name.name}`}
                    className="block mb-4 group"
                  >
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                      {recommendation.name.name} {lastName}
                    </h3>
                  </Link>

                  {/* AI Scores */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        AI Match Score
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                            style={{
                              width: `${recommendation.aiScore * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(recommendation.aiScore * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Gemma Insights */}
                    {recommendation.gemmaInsights && (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                          <SparklesIcon className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-800">
                            Gemma AI Insights
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 mb-2">
                          {recommendation.gemmaInsights.reasoning}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <span className="text-emerald-600">Confidence</span>
                            <p className="font-medium">
                              {Math.round(
                                recommendation.gemmaInsights.confidence * 100
                              )}
                              %
                            </p>
                          </div>
                          <div className="text-center">
                            <span className="text-emerald-600">Last Name</span>
                            <p className="font-medium">
                              {Math.round(
                                recommendation.gemmaInsights.compatibility
                                  .lastName * 100
                              )}
                              %
                            </p>
                          </div>
                          <div className="text-center">
                            <span className="text-emerald-600">Siblings</span>
                            <p className="font-medium">
                              {Math.round(
                                recommendation.gemmaInsights.compatibility
                                  .siblings * 100
                              )}
                              %
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Traditional AI Scores */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last name fit:</span>
                        <span className="font-medium">
                          {Math.round(
                            ((recommendation.name as any)
                              .lastNameCompatibility || 0) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sibling match:</span>
                        <span className="font-medium">
                          {Math.round(
                            ((recommendation.name as any)
                              .siblingCompatibility || 0) * 100
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Name Stats */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">2024 births:</span>
                        <p className="font-medium">
                          {(
                            recommendation.name.yearlyData['2024'] || 0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Popularity:</span>
                        <p className="font-medium">
                          {(recommendation.name.yearlyData['2024'] || 0) <= 50
                            ? 'Rare'
                            : (recommendation.name.yearlyData['2024'] || 0) <=
                                200
                              ? 'Uncommon'
                              : (recommendation.name.yearlyData['2024'] || 0) <=
                                  800
                                ? 'Moderate'
                                : 'Popular'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Link
                      to={`/name/${recommendation.name.name}`}
                      className="flex-1 bg-purple-600 text-white text-center py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </Link>
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <HeartIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <SparklesIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No recommendations found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your preferences or adding more family
                information.
              </p>
              <button
                onClick={() => setShowResults(false)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Modify Search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
