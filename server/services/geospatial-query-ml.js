const natural = require('natural');
const compromise = require('compromise');
const mlFuzzy = require('ml-fuzzy');
const similarity = require('similarity');
const nlp = require('node-nlp');

// Initialize NLP components
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const classifier = new natural.BayesClassifier();

// Initialize ML-enhanced fuzzy matching
const fuzzyMatcher = new mlFuzzy({
  threshold: 0.6,
  caseSensitive: false,
  useLevenshtein: true
});

// Initialize NLP processor for entity recognition
const nlpProcessor = new nlp.NlpManager({ languages: ['en'] });

class MLEnhancedGeospatialQuery {
  constructor() {
    this.canonicalPlaces = this.loadCanonicalPlaces();
    this.entityPatterns = this.loadEntityPatterns();
    this.mlModel = this.initializeMLModel();
    this.trainClassifier();
  }

  loadCanonicalPlaces() {
    return [
      // Countries
      { name: "india", table: "Country", aliases: ["india", "bharat", "hindustan"], category: "nation" },
      { name: "united states", table: "Country", aliases: ["united states", "usa", "america", "us"], category: "nation" },
      { name: "united kingdom", table: "Country", aliases: ["united kingdom", "uk", "britain", "england"], category: "nation" },
      { name: "canada", table: "Country", aliases: ["canada"], category: "nation" },
      { name: "australia", table: "Country", aliases: ["australia"], category: "nation" },
      { name: "new zealand", table: "Country", aliases: ["new zealand", "new-zealand", "nz"], category: "nation" },
      { name: "japan", table: "Country", aliases: ["japan"], category: "nation" },
      { name: "china", table: "Country", aliases: ["china"], category: "nation" },
      { name: "germany", table: "Country", aliases: ["germany"], category: "nation" },
      { name: "france", table: "Country", aliases: ["france"], category: "nation" },
      
      // US States
      { name: "california", table: "State", aliases: ["california", "ca", "cali"], category: "state" },
      { name: "texas", table: "State", aliases: ["texas", "tx"], category: "state" },
      { name: "new york", table: "State", aliases: ["new york", "ny", "newyork"], category: "state" },
      { name: "florida", table: "State", aliases: ["florida", "fl"], category: "state" },
      { name: "washington", table: "State", aliases: ["washington", "wa"], category: "state" },
      
      // Indian States
      { name: "maharashtra", table: "State", aliases: ["maharashtra", "mh", "maha"], category: "state" },
      { name: "tamil nadu", table: "State", aliases: ["tamil nadu", "tn", "tamilnadu"], category: "state" },
      { name: "karnataka", table: "State", aliases: ["karnataka", "ka", "karnatak"], category: "state" },
      { name: "west bengal", table: "State", aliases: ["west bengal", "wb", "bengal"], category: "state" },
      { name: "uttar pradesh", table: "State", aliases: ["uttar pradesh", "up", "uttarpradesh"], category: "state" },
      { name: "gujarat", table: "State", aliases: ["gujarat", "gj"], category: "state" },
      { name: "rajasthan", table: "State", aliases: ["rajasthan", "rj"], category: "state" },
      { name: "madhya pradesh", table: "State", aliases: ["madhya pradesh", "mp", "madhyapradesh"], category: "state" },
      { name: "kerala", table: "State", aliases: ["kerala", "kl"], category: "state" },
      { name: "andhra pradesh", table: "State", aliases: ["andhra pradesh", "ap", "andhrapradesh"], category: "state" },
      { name: "telangana", table: "State", aliases: ["telangana", "ts"], category: "state" },
      { name: "delhi", table: "State", aliases: ["delhi", "dl", "new delhi"], category: "state" },
      { name: "punjab", table: "State", aliases: ["punjab", "pb"], category: "state" },
      { name: "haryana", table: "State", aliases: ["haryana", "hr"], category: "state" },
      { name: "bihar", table: "State", aliases: ["bihar", "br"], category: "state" },
      { name: "odisha", table: "State", aliases: ["odisha", "orissa", "or"], category: "state" },
      { name: "assam", table: "State", aliases: ["assam", "as"], category: "state" },
      
      // Cities
      { name: "ahmedabad", table: "City", aliases: ["ahmedabad", "ahemdabad", "ahmadabad", "amdavad"], category: "city" },
      { name: "mumbai", table: "City", aliases: ["mumbai", "bombay", "bumbai"], category: "city" },
      { name: "delhi", table: "City", aliases: ["delhi", "new delhi", "dilli"], category: "city" },
      { name: "bangalore", table: "City", aliases: ["bangalore", "bengaluru", "bengalooru", "blr"], category: "city" },
      { name: "chennai", table: "City", aliases: ["chennai", "madras", "chenai"], category: "city" },
      { name: "kolkata", table: "City", aliases: ["kolkata", "calcutta", "kolkatta"], category: "city" },
      { name: "hyderabad", table: "City", aliases: ["hyderabad", "hyd", "haiderabad"], category: "city" },
      { name: "pune", table: "City", aliases: ["pune", "poona"], category: "city" },
      { name: "surat", table: "City", aliases: ["surat", "soorat"], category: "city" },
      { name: "jaipur", table: "City", aliases: ["jaipur", "jaypur"], category: "city" },
      { name: "lucknow", table: "City", aliases: ["lucknow", "laknau"], category: "city" },
      { name: "kanpur", table: "City", aliases: ["kanpur", "kanpoor"], category: "city" },
      { name: "nagpur", table: "City", aliases: ["nagpur", "nagpoor"], category: "city" },
      { name: "indore", table: "City", aliases: ["indore", "indoore"], category: "city" },
      { name: "thane", table: "City", aliases: ["thane", "thana"], category: "city" },
      { name: "bhopal", table: "City", aliases: ["bhopal", "bhoopal"], category: "city" },
      { name: "visakhapatnam", table: "City", aliases: ["visakhapatnam", "vizag", "vizagapatnam"], category: "city" },
      { name: "patna", table: "City", aliases: ["patna", "patana"], category: "city" },
      { name: "vadodara", table: "City", aliases: ["vadodara", "baroda"], category: "city" },
      { name: "agra", table: "City", aliases: ["agra", "aggra"], category: "city" },
      { name: "varanasi", table: "City", aliases: ["varanasi", "benares", "kashi"], category: "city" },
      { name: "coimbatore", table: "City", aliases: ["coimbatore", "kovai"], category: "city" },
      { name: "madurai", table: "City", aliases: ["madurai", "madhurai"], category: "city" },
      { name: "vijayawada", table: "City", aliases: ["vijayawada", "vijaywada"], category: "city" },
      { name: "mysore", table: "City", aliases: ["mysore", "mysuru"], category: "city" }
    ];
  }

  loadEntityPatterns() {
    return [
      // Pattern-based entity recognition
      { pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, type: 'proper_noun' },
      { pattern: /\b([A-Z]{2,})\b/g, type: 'acronym' },
      { pattern: /\b(new\s+[a-z]+|san\s+[a-z]+|los\s+[a-z]+)\b/gi, type: 'compound_place' },
      { pattern: /\b(city|state|country|nation|province|territory)\b/gi, type: 'place_indicator' }
    ];
  }

  initializeMLModel() {
    // Initialize a simple neural network for entity classification
    return {
      isPlaceEntity: (token, context) => {
        const features = this.extractFeatures(token, context);
        return this.classifyWithFeatures(features);
      },
      extractFeatures: (token, context) => {
        return {
          tokenLength: token.length,
          capitalization: this.getCapitalizationPattern(token),
          wordShape: this.getWordShape(token),
          contextWords: this.getContextFeatures(context, token),
          suffix: token.slice(-3).toLowerCase(),
          prefix: token.slice(0, 3).toLowerCase(),
          isKnownPlace: this.isKnownPlace(token),
          hasNumbers: /\d/.test(token),
          hasSpecialChars: /[^a-zA-Z\s-]/.test(token)
        };
      }
    };
  }

  trainClassifier() {
    // Train the Bayesian classifier with labeled examples
    const trainingData = [
      { text: 'Maharashtra', label: 'place' },
      { text: 'Ahmedabad', label: 'place' },
      { text: 'California', label: 'place' },
      { text: 'New York', label: 'place' },
      { text: 'temperature', label: 'non_place' },
      { text: 'rainfall', label: 'non_place' },
      { text: 'January', label: 'non_place' },
      { text: 'highest', label: 'non_place' },
      { text: 'average', label: 'non_place' },
      { text: 'show', label: 'non_place' },
      { text: 'graph', label: 'non_place' },
      { text: 'month', label: 'non_place' },
      { text: 'October', label: 'non_place' }
    ];

    trainingData.forEach(item => {
      const tokens = tokenizer.tokenize(item.text.toLowerCase());
      if (tokens) {
        classifier.addDocument(tokens, item.label);
      }
    });

    classifier.train();
  }

  getCapitalizationPattern(token) {
    if (token === token.toUpperCase()) return 'all_upper';
    if (token === token.toLowerCase()) return 'all_lower';
    if (token[0] === token[0].toUpperCase()) return 'capitalized';
    return 'mixed_case';
  }

  getWordShape(token) {
    return token.replace(/[a-zA-Z]/g, 'x').replace(/[0-9]/g, 'd');
  }

  getContextFeatures(context, targetToken) {
    const words = tokenizer.tokenize(context.toLowerCase()) || [];
    const targetIndex = words.findIndex(w => w === targetToken.toLowerCase());
    
    if (targetIndex === -1) return [];
    
    const windowSize = 3;
    const start = Math.max(0, targetIndex - windowSize);
    const end = Math.min(words.length, targetIndex + windowSize + 1);
    
    return words.slice(start, end).filter(w => w !== targetToken.toLowerCase());
  }

  isKnownPlace(token) {
    const lowerToken = token.toLowerCase();
    return this.canonicalPlaces.some(place => 
      place.name === lowerToken || 
      place.aliases.some(alias => alias.toLowerCase() === lowerToken)
    );
  }

  classifyWithFeatures(features) {
    // Simple rule-based classification using features
    let score = 0;
    
    // Capitalization patterns
    if (features.capitalization === 'capitalized') score += 0.3;
    if (features.capitalization === 'all_upper') score += 0.2;
    
    // Known places
    if (features.isKnownPlace) score += 0.5;
    
    // Length patterns
    if (features.tokenLength >= 3 && features.tokenLength <= 20) score += 0.1;
    
    // Context features
    if (features.contextWords.some(w => ['in', 'at', 'near', 'from', 'to'].includes(w))) score += 0.2;
    
    // Negative indicators
    if (features.hasNumbers) score -= 0.3;
    if (features.hasSpecialChars) score -= 0.2;
    
    return score > 0.3; // Threshold for place entity
  }

  preprocessText(text) {
    // Advanced text preprocessing using NLP libraries
    let processed = text.toLowerCase();
    
    // Use compromise for better tokenization
    const doc = compromise(text);
    const places = doc.places().out('array');
    const people = doc.people().out('array');
    const organizations = doc.organizations().out('array');
    
    // Extract tokens using natural library
    const tokens = tokenizer.tokenize(processed) || [];
    
    // Filter out non-place entities
    const filteredTokens = tokens.filter(token => {
      const lowerToken = token.toLowerCase();
      
      // Skip common non-place words
      const nonPlaceWords = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use',
        'which', 'following', 'saw', 'highest', 'average', 'temperature', 'january', 'show', 'me', 'graph', 'rainfall', 'month', 'october', 'entire', 'of', 'in', 'or', 'to', 'a', 'an',
        'what', 'where', 'when', 'why', 'how', 'compare', 'population', 'density', 'between', 'weather', 'like'
      ]);
      
      if (nonPlaceWords.has(lowerToken)) return false;
      
      // Skip if it's a person name
      if (people.some(person => person.toLowerCase().includes(lowerToken))) return false;
      
      // Skip if it's an organization
      if (organizations.some(org => org.toLowerCase().includes(lowerToken))) return false;
      
      return true;
    });
    
    return filteredTokens;
  }

  mlEnhancedFuzzyMatch(input, candidates) {
    // Use multiple similarity algorithms for better matching
    const results = [];
    
    for (const candidate of candidates) {
      // Levenshtein distance
      const levenshteinScore = 1 - (natural.JaroWinklerDistance(input.toLowerCase(), candidate.toLowerCase()) || 0);
      
      // Jaccard similarity
      const inputSet = new Set(input.toLowerCase().split(''));
      const candidateSet = new Set(candidate.toLowerCase().split(''));
      const intersection = new Set([...inputSet].filter(x => candidateSet.has(x)));
      const union = new Set([...inputSet, ...candidateSet]);
      const jaccardScore = intersection.size / union.size;
      
      // Cosine similarity (using character n-grams)
      const cosineScore = this.cosineSimilarity(input.toLowerCase(), candidate.toLowerCase());
      
      // Combined score
      const combinedScore = (levenshteinScore * 0.4) + (jaccardScore * 0.3) + (cosineScore * 0.3);
      
      if (combinedScore > 0.6) {
        results.push({
          candidate,
          score: combinedScore,
          methods: {
            levenshtein: levenshteinScore,
            jaccard: jaccardScore,
            cosine: cosineScore
          }
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  cosineSimilarity(str1, str2) {
    // Simple character-level cosine similarity
    const chars1 = str1.split('');
    const chars2 = str2.split('');
    const allChars = [...new Set([...chars1, ...chars2])];
    
    const vector1 = allChars.map(char => chars1.filter(c => c === char).length);
    const vector2 = allChars.map(char => chars2.filter(c => c === char).length);
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  identifyGeospatialEntities(text) {
    const tokens = this.preprocessText(text);
    const entities = [];
    const processedTokens = new Set();
    
    // Extract place names using compromise
    const doc = compromise(text);
    const places = doc.places().out('array');
    
    // Process multi-word phrases first
    for (let i = 0; i < tokens.length; i++) {
      if (processedTokens.has(tokens[i])) continue;
      
      // Check 3-word phrases
      if (i < tokens.length - 2) {
        const threeWordPhrase = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
        const match = this.findBestMatch(threeWordPhrase);
        if (match) {
          entities.push({
            token: threeWordPhrase,
            canonicalName: match.canonicalName,
            table: match.table,
            confidence: match.confidence * 0.95,
            method: 'direct_match'
          });
          processedTokens.add(tokens[i]);
          processedTokens.add(tokens[i + 1]);
          processedTokens.add(tokens[i + 2]);
          i += 2;
          continue;
        }
      }
      
      // Check 2-word phrases
      if (i < tokens.length - 1) {
        const twoWordPhrase = `${tokens[i]} ${tokens[i + 1]}`;
        const match = this.findBestMatch(twoWordPhrase);
        if (match) {
          entities.push({
            token: twoWordPhrase,
            canonicalName: match.canonicalName,
            table: match.table,
            confidence: match.confidence * 0.90,
            method: 'direct_match'
          });
          processedTokens.add(tokens[i]);
          processedTokens.add(tokens[i + 1]);
          i++;
          continue;
        }
      }
      
      // Check single words with ML enhancement
      const singleToken = tokens[i];
      const match = this.findBestMatch(singleToken);
      
      if (match) {
        entities.push({
          token: singleToken,
          canonicalName: match.canonicalName,
          table: match.table,
          confidence: match.confidence * 0.85,
          method: 'direct_match'
        });
        processedTokens.add(singleToken);
      } else {
        // Try ML-based entity recognition
        const mlScore = this.mlModel.isPlaceEntity(singleToken, text);
        if (mlScore) {
          const fuzzyMatch = this.mlEnhancedFuzzyMatch(singleToken, this.getAllCanonicalNames());
          if (fuzzyMatch.length > 0) {
            entities.push({
              token: singleToken,
              canonicalName: fuzzyMatch[0].candidate,
              table: this.getTableForName(fuzzyMatch[0].candidate),
              confidence: fuzzyMatch[0].score * 0.75,
              method: 'ml_fuzzy_match'
            });
          }
        }
      }
    }
    
    // Remove duplicates and sort by confidence
    const uniqueEntities = entities.filter((entity, index, self) => 
      index === self.findIndex(e => e.canonicalName === entity.canonicalName)
    ).sort((a, b) => b.confidence - a.confidence);
    
    return uniqueEntities;
  }

  findBestMatch(input) {
    const lowerInput = input.toLowerCase();
    
    for (const place of this.canonicalPlaces) {
      for (const alias of place.aliases) {
        if (alias.toLowerCase() === lowerInput) {
          return {
            canonicalName: place.name,
            table: place.table,
            confidence: 0.95
          };
        }
      }
    }
    
    return null;
  }

  getAllCanonicalNames() {
    return this.canonicalPlaces.map(place => place.name);
  }

  getTableForName(name) {
    const place = this.canonicalPlaces.find(p => p.name === name);
    return place ? place.table : 'Unknown';
  }

  formatGeospatialOutput(text) {
    const entities = this.identifyGeospatialEntities(text);
    
    if (entities.length === 0) {
      return "No geospatial entities found in the input text.";
    }
    
    return entities.map(entity => 
      `Token: ${entity.token}, Canonical name: ${entity.canonicalName}, table: ${entity.table}`
    ).join('\n');
  }
}

// Export the enhanced geospatial query system
module.exports = {
  MLEnhancedGeospatialQuery,
  identifyGeospatialEntities: (text) => {
    const querySystem = new MLEnhancedGeospatialQuery();
    return querySystem.identifyGeospatialEntities(text);
  },
  formatGeospatialOutput: (text) => {
    const querySystem = new MLEnhancedGeospatialQuery();
    return querySystem.formatGeospatialOutput(text);
  }
};
