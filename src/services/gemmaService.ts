import OpenAI from 'openai';

// Configure OpenAI client to use local LM Studio server
const gemmaClient = new OpenAI({
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'lm-studio', // LM Studio doesn't require a real API key
  dangerouslyAllowBrowser: true, // Allow browser usage for local development
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});

export interface GemmaNameSuggestion {
  name: string;
  reasoning: string;
  confidence: number;
  compatibility: {
    lastName: number;
    siblings: number;
    overall: number;
  };
}

export interface GemmaRecommendationRequest {
  lastName: string;
  existingChildren: Array<{ name: string; gender: 'M' | 'F' }>;
  targetGender: 'M' | 'F' | 'any';
  preferences?: {
    popularityLevel?: 'rare' | 'uncommon' | 'moderate' | 'popular' | 'any';
    stylePreference?: 'similar' | 'complementary' | 'any';
    meaningImportance?: 'low' | 'medium' | 'high';
  };
}

export async function generateGemmaNameSuggestions(
  request: GemmaRecommendationRequest
): Promise<GemmaNameSuggestion[]> {
  try {
    const prompt = buildGemmaPrompt(request);

    // Get the available model name dynamically
    const modelName = await getAvailableModel();
    if (!modelName) {
      throw new Error('No model available in LM Studio');
    }

    const response = await gemmaClient.chat.completions.create({
      model: modelName, // Use dynamic model name
      messages: [
        {
          role: 'system',
          content: `You are a French baby name expert specializing in name recommendations. You have deep knowledge of French naming traditions, phonetics, and cultural significance. Always respond with valid JSON format.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      // Remove response_format for now as it might not be supported
      // response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Gemma model');
    }

    console.log('Raw Gemma response:', content);

    // Extract JSON from markdown code blocks if present
    const jsonContent = extractJsonFromMarkdown(content);
    console.log('Extracted JSON:', jsonContent);

    const parsed = JSON.parse(jsonContent);
    return validateAndNormalizeGemmaResponse(parsed);
  } catch (error) {
    console.error('Error generating Gemma suggestions:', error);
    throw new Error(
      'Failed to generate AI suggestions. Please check if LM Studio is running.'
    );
  }
}

function buildGemmaPrompt(request: GemmaRecommendationRequest): string {
  const { lastName, existingChildren, targetGender, preferences } = request;

  const genderText =
    targetGender === 'any'
      ? 'any gender'
      : targetGender === 'M'
        ? 'boy'
        : 'girl';
  const siblingText =
    existingChildren.length > 0
      ? `existing children: ${existingChildren.map((child) => `${child.name} (${child.gender})`).join(', ')}`
      : 'no existing children';

  const popularityText =
    preferences?.popularityLevel && preferences.popularityLevel !== 'any'
      ? `Popularity preference: ${preferences.popularityLevel}`
      : '';

  const styleText =
    preferences?.stylePreference && preferences.stylePreference !== 'any'
      ? `Style preference: ${preferences.stylePreference} to existing names`
      : '';

  return `Please suggest 5 French baby names for a ${genderText} with the last name "${lastName}".

Family context:
- Last name: ${lastName}
- ${siblingText}
- Target gender: ${genderText}
${popularityText ? `- ${popularityText}` : ''}
${styleText ? `- ${styleText}` : ''}

Consider:
1. Phonetic harmony with the last name "${lastName}"
2. Sibling name compatibility (avoid similar sounds, maintain family style)
3. French cultural appropriateness and pronunciation
4. Modern French naming trends
5. Avoid names that are too similar to existing siblings

Respond with JSON in this exact format:
{
  "suggestions": [
    {
      "name": "suggested name",
      "reasoning": "detailed explanation of why this name fits",
      "confidence": 0.85,
      "compatibility": {
        "lastName": 0.9,
        "siblings": 0.8,
        "overall": 0.85
      }
    }
  ]
}

Confidence and compatibility scores should be between 0.0 and 1.0.`;
}

// Extract JSON from markdown code blocks
function extractJsonFromMarkdown(content: string): string {
  // Remove markdown code block markers
  let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

  // If the content is still wrapped in code blocks without language specifier
  cleaned = cleaned.replace(/```\s*/g, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  // If it starts with { and ends with }, it's likely valid JSON
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    return cleaned;
  }

  // Try to find JSON object in the content
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // If no JSON found, return the original content (will likely fail parsing)
  return cleaned;
}

function validateAndNormalizeGemmaResponse(
  response: any
): GemmaNameSuggestion[] {
  if (
    !response ||
    !response.suggestions ||
    !Array.isArray(response.suggestions)
  ) {
    throw new Error('Invalid response format from Gemma model');
  }

  return response.suggestions
    .map((suggestion: any, index: number) => {
      // Validate and normalize each suggestion
      const name = suggestion.name || `Unknown_${index}`;
      const reasoning = suggestion.reasoning || 'No reasoning provided';
      const confidence = Math.max(0, Math.min(1, suggestion.confidence || 0.5));

      const compatibility = {
        lastName: Math.max(
          0,
          Math.min(1, suggestion.compatibility?.lastName || 0.5)
        ),
        siblings: Math.max(
          0,
          Math.min(1, suggestion.compatibility?.siblings || 0.5)
        ),
        overall: Math.max(
          0,
          Math.min(1, suggestion.compatibility?.overall || 0.5)
        ),
      };

      return {
        name,
        reasoning,
        confidence,
        compatibility,
      };
    })
    .slice(0, 5); // Limit to 5 suggestions
}

export async function testGemmaConnection(): Promise<boolean> {
  try {
    // First try to fetch available models using a simple fetch request
    const modelsResponse = await fetch('http://localhost:1234/v1/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!modelsResponse.ok) {
      console.error('Models endpoint failed:', modelsResponse.status);
      return false;
    }

    const modelsData = await modelsResponse.json();
    console.log('Available models:', modelsData);

    // Try a simple chat completion to verify the model works
    const modelName =
      modelsData.data && modelsData.data.length > 0
        ? modelsData.data[0].id
        : 'gemma-3-27b-it-q4_k_m';
    const response = await gemmaClient.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello" in one word only.',
        },
      ],
      max_tokens: 5,
      temperature: 0.1,
    });

    return response.choices && response.choices.length > 0;
  } catch (error) {
    console.error('Gemma connection test failed:', error);

    // Check if it's a CORS error or connection error
    if (error instanceof Error) {
      if (error.message.includes('CORS') || error.message.includes('fetch')) {
        console.log('CORS or network error. Please ensure:');
        console.log('1. LM Studio is running on port 1234');
        console.log('2. CORS is enabled in LM Studio settings');
        console.log('3. The model is loaded and ready');
      }
    }

    return false;
  }
}

// Get the available model name from LM Studio
export async function getAvailableModel(): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:1234/v1/models');
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].id; // Return the first available model
      }
    }
  } catch (error) {
    console.error('Failed to get available models:', error);
  }
  return null;
}

// Debug function to test the connection manually
export async function debugGemmaConnection(): Promise<void> {
  console.log('=== Gemma Connection Debug ===');

  try {
    // Test 1: Basic fetch to models endpoint
    console.log('Test 1: Fetching models...');
    const modelsResponse = await fetch('http://localhost:1234/v1/models');
    console.log('Models response status:', modelsResponse.status);

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log('Available models:', modelsData);
    }

    // Test 2: Simple chat completion
    console.log('Test 2: Testing chat completion...');
    const chatResponse = await fetch(
      'http://localhost:1234/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma-3-27b-it-q4_k_m',
          messages: [
            {
              role: 'user',
              content: 'Say hello',
            },
          ],
          max_tokens: 10,
          temperature: 0.1,
        }),
      }
    );

    console.log('Chat response status:', chatResponse.status);

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('Chat response:', chatData);
    } else {
      const errorText = await chatResponse.text();
      console.log('Chat error:', errorText);
    }
  } catch (error) {
    console.error('Debug test failed:', error);
  }
}
