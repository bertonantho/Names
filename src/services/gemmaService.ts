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
    maxLetters?: number;
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
          content: `Vous êtes un expert en prénoms français spécialisé dans les recommandations de noms. Vous avez une connaissance approfondie des traditions de nommage françaises, de la phonétique et de la signification culturelle. Répondez toujours au format JSON valide.`,
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
      ? 'tous genres'
      : targetGender === 'M'
        ? 'garçon'
        : 'fille';
  const siblingText =
    existingChildren.length > 0
      ? `enfants existants : ${existingChildren.map((child) => `${child.name} (${child.gender === 'M' ? 'garçon' : 'fille'})`).join(', ')}`
      : 'aucun enfant existant';

  const popularityText =
    preferences?.popularityLevel && preferences.popularityLevel !== 'any'
      ? `Préférence de popularité : ${preferences.popularityLevel === 'rare' ? 'rare' : preferences.popularityLevel === 'uncommon' ? 'peu commun' : preferences.popularityLevel === 'moderate' ? 'modérément populaire' : 'très populaire'}`
      : '';

  const maxLettersText = preferences?.maxLetters
    ? `Nombre maximum de lettres : ${preferences.maxLetters}`
    : '';

  return `Veuillez suggérer 5 prénoms français pour un(e) ${genderText} avec le nom de famille "${lastName}".

Contexte familial :
- Nom de famille : ${lastName}
- ${siblingText}
- Genre cible : ${genderText}
${popularityText ? `- ${popularityText}` : ''}
${maxLettersText ? `- ${maxLettersText}` : ''}

Considérez :
1. L'harmonie phonétique avec le nom de famille "${lastName}"
2. La compatibilité avec les frères et sœurs (éviter les sons similaires, maintenir le style familial)
3. L'adéquation culturelle française et la prononciation
4. Les tendances modernes de nommage français
5. Éviter les noms trop similaires aux frères et sœurs existants
${maxLettersText ? `6. Les noms ne doivent pas dépasser ${preferences?.maxLetters} lettres` : ''}
${popularityText ? `7. Privilégier les noms ${preferences?.popularityLevel === 'rare' ? 'rares et uniques' : preferences?.popularityLevel === 'uncommon' ? 'peu communs' : preferences?.popularityLevel === 'moderate' ? 'modérément populaires' : 'très populaires'}` : ''}

Répondez avec JSON dans ce format exact :
{
  "suggestions": [
    {
      "name": "nom suggéré",
      "reasoning": "explication détaillée de pourquoi ce nom convient",
      "confidence": 0.85,
      "compatibility": {
        "lastName": 0.9,
        "siblings": 0.8,
        "overall": 0.85
      }
    }
  ]
}

Les scores de confiance et de compatibilité doivent être entre 0.0 et 1.0.`;
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
          content: 'Dites "Bonjour" en un seul mot.',
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
              content: 'Dites bonjour',
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
