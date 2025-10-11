// Free Google Translate API (no API key needed)
// Uses the same engine as translate.google.com

// Translation cache to avoid re-translating
const translationCache = new Map<string, string>();

export async function translateText(
  text: string,
  targetLang: 'en' | 'si' | 'ta'
): Promise<string> {
  // If already in English or empty, return as-is
  if (!text || targetLang === 'en') {
    return text;
  }

  // Check cache first
  const cacheKey = `${text}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    console.log('📦 Using cached translation');
    return translationCache.get(cacheKey)!;
  }

  try {
    // Using Google Translate's free API endpoint
    const sourceLang = 'en'; // Assuming source is always English
    const targetCode = targetLang; // 'si' for Sinhala, 'ta' for Tamil

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn('Translation API error:', response.status);
      return text; // Return original on error
    }

    const data = await response.json();
    
    // Google Translate response format: [[[translatedText, originalText, ...]]]
    let translatedText = '';
    
    if (data && data[0]) {
      // Combine all translation segments
      for (const segment of data[0]) {
        if (segment[0]) {
          translatedText += segment[0];
        }
      }
    }

    // Fallback to original if translation failed
    if (!translatedText) {
      translatedText = text;
    }

    // Cache the translation
    translationCache.set(cacheKey, translatedText);

    console.log(`✅ Translated: "${text.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..."`);
    return translatedText;

  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text on error
  }
}

// Translate multiple texts at once
export async function translateBatch(
  texts: string[],
  targetLang: 'en' | 'si' | 'ta'
): Promise<string[]> {
  if (targetLang === 'en') {
    return texts;
  }

  const translations = await Promise.all(
    texts.map(text => translateText(text, targetLang))
  );

  return translations;
}

// Clear translation cache (useful when switching languages)
export function clearTranslationCache() {
  translationCache.clear();
  console.log('🗑️ Translation cache cleared');
}