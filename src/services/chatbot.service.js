const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { ExternalServiceError } = require('../middleware/errorHandler');

class ChatbotService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Legal domain mapping - maps keywords to lawyer specializations in database
    this.domainMapping = {
      criminal: {
        keywords: ['criminal', 'fir', 'police', 'arrest', 'bail', 'murder', 'theft', 'robbery', 
          'assault', 'cheating', 'fraud', 'giraftari', 'zamanat', 'chori', 'dhoka', 'marpeet',
          'cybercrime', 'dowry', 'harassment', 'threat', 'blackmail', 'rape', 'kidnapping'],
        specialization: 'criminal',
        displayName: 'Criminal Law',
        displayNameHindi: 'आपराधिक कानून'
      },
      family: {
        keywords: ['divorce', 'custody', 'alimony', 'marriage', 'matrimonial', 'maintenance',
          'child', 'domestic violence', 'dowry', 'separation', 'talaq', 'guzara', 'bachche',
          'shaadi', 'nafqa', 'haq mehr', 'guardianship', 'adoption', 'live-in'],
        specialization: 'family',
        displayName: 'Family Law',
        displayNameHindi: 'पारिवारिक कानून'
      },
      property: {
        keywords: ['property', 'land', 'real estate', 'inheritance', 'will', 'succession',
          'partition', 'title', 'deed', 'registration', 'encroachment', 'tenant', 'rent',
          'zameen', 'jaydad', 'vasiyat', 'virasat', 'batwara', 'kirayedar', 'registry'],
        specialization: 'property',
        displayName: 'Property Law',
        displayNameHindi: 'संपत्ति कानून'
      },
      civil: {
        keywords: ['contract', 'agreement', 'breach', 'damages', 'compensation', 'dispute',
          'recovery', 'injunction', 'suit', 'civil', 'tort', 'negligence', 'defamation',
          'anubandh', 'muavza', 'hani', 'vivad', 'dava'],
        specialization: 'civil',
        displayName: 'Civil Law',
        displayNameHindi: 'दीवानी कानून'
      },
      corporate: {
        keywords: ['company', 'business', 'corporate', 'partnership', 'startup', 'llp',
          'incorporation', 'merger', 'acquisition', 'shareholder', 'director', 'compliance',
          'trademark', 'patent', 'copyright', 'intellectual property', 'ip'],
        specialization: 'corporate',
        displayName: 'Corporate Law',
        displayNameHindi: 'कॉर्पोरेट कानून'
      },
      labour: {
        keywords: ['labour', 'labor', 'employment', 'salary', 'termination', 'wrongful',
          'pf', 'provident fund', 'gratuity', 'esi', 'workplace', 'harassment at work',
          'naukri', 'tankhwah', 'nikala', 'mazdoor', 'employee', 'employer'],
        specialization: 'labour',
        displayName: 'Labour Law',
        displayNameHindi: 'श्रम कानून'
      },
      consumer: {
        keywords: ['consumer', 'product', 'defective', 'refund', 'service', 'complaint',
          'warranty', 'guarantee', 'unfair trade', 'misleading', 'grahak', 'upbhokta',
          'fraud product', 'fake', 'online shopping', 'ecommerce'],
        specialization: 'consumer',
        displayName: 'Consumer Law',
        displayNameHindi: 'उपभोक्ता कानून'
      },
      tax: {
        keywords: ['tax', 'income tax', 'gst', 'taxation', 'it raid', 'notice', 'assessment',
          'appeal', 'refund tax', 'tds', 'kar', 'aaykar', 'tax evasion', 'tribunal'],
        specialization: 'tax',
        displayName: 'Tax Law',
        displayNameHindi: 'कर कानून'
      },
      constitutional: {
        keywords: ['fundamental rights', 'pil', 'public interest', 'writ', 'habeas corpus',
          'constitutional', 'article', 'supreme court', 'high court', 'government',
          'maulik adhikar', 'samvidhan'],
        specialization: 'constitutional',
        displayName: 'Constitutional Law',
        displayNameHindi: 'संवैधानिक कानून'
      },
      banking: {
        keywords: ['bank', 'loan', 'cheque bounce', 'recovery', 'mortgage', 'npa', 'sarfaesi',
          'drt', 'debt', 'emi', 'credit card', 'default', 'karz', 'rin'],
        specialization: 'banking',
        displayName: 'Banking & Finance Law',
        displayNameHindi: 'बैंकिंग कानून'
      },
      cyber: {
        keywords: ['cyber', 'online fraud', 'hacking', 'data breach', 'identity theft',
          'social media', 'defamation online', 'cyber bullying', 'it act', 'digital'],
        specialization: 'cyber',
        displayName: 'Cyber Law',
        displayNameHindi: 'साइबर कानून'
      }
    };
    
    this.systemPrompt = `You are Nyaay Saathi, a helpful legal assistant chatbot for Indian users.

Your role:
- Provide general legal information and guidance in simple language
- Support both English and Hindi languages
- Help users understand their legal rights and options
- Guide users on court procedures, documentation, and costs
- ALWAYS recommend consulting a qualified lawyer for specific legal advice
- Be empathetic and supportive

Expertise areas:
- Criminal Law (FIR, bail, police complaints)
- Civil Law (contracts, disputes, property)
- Family Law (divorce, custody, maintenance)
- Property Law (registration, disputes, inheritance)
- Consumer Rights
- Labour Law basics
- Corporate/Business Law
- Tax Law
- Banking & Finance Law
- Cyber Law

Important guidelines:
- Never provide specific legal advice that could be construed as practicing law
- Always clarify that you're an AI assistant, not a lawyer
- Suggest connecting with a lawyer on the platform for detailed consultation
- Keep responses concise but helpful (200-400 words)
- Use bullet points for better readability
- If unsure, say so and recommend professional consultation

CRITICAL: At the end of your response, you MUST include a JSON block with detected legal domain(s).
Format: ###DOMAIN###{"primary": "criminal", "secondary": ["civil"], "confidence": 0.9}###DOMAIN###
Valid domains: criminal, family, property, civil, corporate, labour, consumer, tax, constitutional, banking, cyber, general`;

    this.costMatrix = {
      criminal: {
        tier1: { min: 50000, max: 200000 },
        tier2: { min: 30000, max: 100000 },
        tier3: { min: 15000, max: 50000 },
      },
      civil: {
        tier1: { min: 30000, max: 150000 },
        tier2: { min: 20000, max: 80000 },
        tier3: { min: 10000, max: 40000 },
      },
      family: {
        tier1: { min: 25000, max: 100000 },
        tier2: { min: 15000, max: 60000 },
        tier3: { min: 8000, max: 30000 },
      },
      property: {
        tier1: { min: 40000, max: 200000 },
        tier2: { min: 25000, max: 100000 },
        tier3: { min: 15000, max: 50000 },
      },
      other: {
        tier1: { min: 20000, max: 100000 },
        tier2: { min: 15000, max: 60000 },
        tier3: { min: 8000, max: 30000 },
      },
    };

    this.tier1Cities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune'];
    this.tier2Cities = ['ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'patna'];
  }

  /**
   * Detect legal domain from user query using keyword matching
   */
  detectDomain(query) {
    const queryLower = query.toLowerCase();
    const scores = {};
    
    // Calculate score for each domain based on keyword matches
    for (const [domain, config] of Object.entries(this.domainMapping)) {
      let score = 0;
      for (const keyword of config.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          // Longer keywords get higher weight
          score += keyword.length > 5 ? 2 : 1;
        }
      }
      if (score > 0) {
        scores[domain] = score;
      }
    }
    
    // Sort by score and get top domains
    const sortedDomains = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([domain]) => domain);
    
    if (sortedDomains.length === 0) {
      return { primary: 'general', secondary: [], confidence: 0.3 };
    }
    
    const primary = sortedDomains[0];
    const secondary = sortedDomains.slice(1, 3);
    const maxScore = scores[primary];
    const confidence = Math.min(0.95, 0.5 + (maxScore * 0.1));
    
    return { primary, secondary, confidence };
  }

  /**
   * Parse domain from AI response
   */
  parseDomainFromResponse(response) {
    const domainMatch = response.match(/###DOMAIN###(.+?)###DOMAIN###/s);
    if (domainMatch) {
      try {
        return JSON.parse(domainMatch[1]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Clean AI response (remove domain JSON)
   */
  cleanResponse(response) {
    return response.replace(/###DOMAIN###(.+?)###DOMAIN###/s, '').trim();
  }

  /**
   * Fetch recommended lawyers for a domain
   */
  async getRecommendedLawyers(domain, options = {}) {
    const {
      limit = 15,
      city = null,
      minRating = 3.5,
      maxFee = null,
      language = null
    } = options;

    try {
      // Check cache first
      const cacheKey = `lawyers:domain:${domain}:${city || 'all'}:${limit}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query for lawyers
      let query = supabaseAdmin
        .from('lawyers')
        .select(`
          id,
          user_id,
          specialization,
          specializations,
          experience_years,
          consultation_fee,
          consultation_duration,
          rating,
          total_reviews,
          total_consultations,
          office_city,
          office_state,
          languages_spoken,
          headline,
          accepts_video,
          accepts_audio,
          users:user_id(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('is_verified', true)
        .eq('is_available', true);

      // Filter by specialization (check both primary and array)
      if (domain && domain !== 'general') {
        query = query.or(`specialization.eq.${domain},specializations.cs.{${domain}}`);
      }

      // Filter by city if provided
      if (city) {
        query = query.ilike('office_city', `%${city}%`);
      }

      // Filter by minimum rating
      if (minRating) {
        query = query.gte('rating', minRating);
      }

      // Filter by max fee
      if (maxFee) {
        query = query.lte('consultation_fee', maxFee);
      }

      // Filter by language
      if (language) {
        query = query.contains('languages_spoken', [language]);
      }

      // Order by rating, reviews, and consultations
      query = query
        .order('rating', { ascending: false, nullsFirst: false })
        .order('total_reviews', { ascending: false })
        .order('total_consultations', { ascending: false })
        .limit(limit);

      const { data: lawyers, error } = await query;

      if (error) {
        logger.error({ message: 'Failed to fetch lawyers', error: error.message, domain });
        return [];
      }

      // Format lawyers for response
      const formattedLawyers = (lawyers || []).map(lawyer => ({
        id: lawyer.id,
        user_id: lawyer.user_id,
        name: lawyer.users?.display_name || 'Advocate',
        avatar_url: lawyer.users?.avatar_url,
        specialization: lawyer.specialization,
        specializations: lawyer.specializations || [],
        experience_years: lawyer.experience_years,
        consultation_fee: lawyer.consultation_fee,
        consultation_duration: lawyer.consultation_duration || 30,
        rating: lawyer.rating || 0,
        total_reviews: lawyer.total_reviews || 0,
        total_consultations: lawyer.total_consultations || 0,
        city: lawyer.office_city,
        state: lawyer.office_state,
        languages: lawyer.languages_spoken || ['English'],
        headline: lawyer.headline,
        accepts_video: lawyer.accepts_video,
        accepts_audio: lawyer.accepts_audio,
        // Calculate display fee in rupees
        fee_display: `₹${Math.round((lawyer.consultation_fee || 0) / 100)}`
      }));

      // Cache for 5 minutes
      await cache.set(cacheKey, formattedLawyers, 300);

      return formattedLawyers;
    } catch (error) {
      logger.error({ message: 'Error fetching recommended lawyers', error: error.message });
      return [];
    }
  }

  /**
   * Process a user query and generate response with lawyer recommendations
   */
  async processQuery(query, language = 'english', sessionId, conversationHistory = [], options = {}) {
    try {
      const { city = null, includeHistory = true } = options;

      // First, detect domain using keyword matching (fast)
      const keywordDomain = this.detectDomain(query);

      const languageInstruction = language === 'hindi' 
        ? '\n\nIMPORTANT: Respond in Hindi language using Devanagari script.'
        : '\n\nRespond in clear, simple English.';

      // Build conversation context
      let conversationContext = '';
      if (includeHistory && conversationHistory.length > 0) {
        conversationContext = `\nPrevious conversation:\n${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;
      }

      const fullPrompt = `${this.systemPrompt}${languageInstruction}${conversationContext}

User query: ${query}

Provide a helpful response. Remember to include the ###DOMAIN### JSON block at the end.`;

      const result = await this.model.generateContent(fullPrompt);
      const rawResponse = result.response.text();

      // Parse domain from AI response
      const aiDomain = this.parseDomainFromResponse(rawResponse);
      const cleanedResponse = this.cleanResponse(rawResponse);

      // Use AI domain if confident, otherwise use keyword detection
      const finalDomain = (aiDomain && aiDomain.confidence > 0.7) ? aiDomain : keywordDomain;

      // Fetch recommended lawyers
      const lawyers = await this.getRecommendedLawyers(finalDomain.primary, {
        limit: 15,
        city,
        language: language === 'hindi' ? 'Hindi' : null
      });

      // Get domain display name
      const domainConfig = this.domainMapping[finalDomain.primary];
      const domainName = domainConfig 
        ? (language === 'hindi' ? domainConfig.displayNameHindi : domainConfig.displayName)
        : (language === 'hindi' ? 'सामान्य कानूनी' : 'General Legal');

      // Extract suggestions from response or provide defaults
      const suggestions = this.extractSuggestions(cleanedResponse, language, finalDomain.primary);

      // Detect intent
      const intent = this.detectIntent(query);

      logger.info({ 
        message: 'Chatbot query processed with lawyer recommendations', 
        sessionId, 
        intent,
        domain: finalDomain.primary,
        lawyersFound: lawyers.length,
        queryLength: query.length 
      });

      return {
        response: cleanedResponse,
        intent,
        confidence: finalDomain.confidence,
        suggestions,
        detected_domain: {
          primary: finalDomain.primary,
          secondary: finalDomain.secondary || [],
          name: domainName,
          confidence: finalDomain.confidence
        },
        recommended_lawyers: lawyers,
        total_lawyers_found: lawyers.length
      };
    } catch (error) {
      logger.error({ message: 'Chatbot error', error: error.message, sessionId });
      
      // Still try to get lawyers on error
      let lawyers = [];
      try {
        const fallbackDomain = this.detectDomain(query);
        lawyers = await this.getRecommendedLawyers(fallbackDomain.primary, { limit: 10 });
      } catch (e) {
        // Ignore
      }

      // Return fallback response
      return {
        response: language === 'hindi' 
          ? 'मुझे खेद है, मैं अभी आपकी सहायता करने में असमर्थ हूं। कृपया बाद में पुनः प्रयास करें या हमारे वकीलों से संपर्क करें।'
          : 'I apologize, I\'m unable to assist right now. Please try again later or connect with one of our lawyers for immediate help.',
        intent: 'error',
        confidence: 0,
        suggestions: [
          language === 'hindi' ? 'वकील से बात करें' : 'Talk to a lawyer',
          language === 'hindi' ? 'सहायता केंद्र' : 'Help Center',
        ],
        detected_domain: {
          primary: 'general',
          secondary: [],
          name: language === 'hindi' ? 'सामान्य' : 'General',
          confidence: 0
        },
        recommended_lawyers: lawyers,
        total_lawyers_found: lawyers.length
      };
    }
  }

  /**
   * Calculate legal cost estimate
   */
  calculateCostEstimate(caseType, city) {
    const cityLower = city.toLowerCase();
    let tier = 'tier3';
    
    if (this.tier1Cities.includes(cityLower)) {
      tier = 'tier1';
    } else if (this.tier2Cities.includes(cityLower)) {
      tier = 'tier2';
    }

    const costs = this.costMatrix[caseType]?.[tier] || this.costMatrix.other[tier];
    
    // Additional estimated costs
    const courtFees = caseType === 'property' ? 10000 : 5000;
    const documentation = 3000;
    const miscellaneous = 2000;

    return {
      lawyer_fee_min: costs.min,
      lawyer_fee_max: costs.max,
      court_fees: courtFees,
      documentation,
      miscellaneous,
      total_min: costs.min + courtFees + documentation + miscellaneous,
      total_max: costs.max + courtFees + documentation + miscellaneous,
      currency: 'INR',
      tier,
      disclaimer: 'These are estimated costs. Actual costs may vary based on case complexity and lawyer fees.',
    };
  }

  /**
   * Detect user intent from query
   */
  detectIntent(query) {
    const queryLower = query.toLowerCase();
    
    const intents = {
      'cost_inquiry': ['cost', 'fee', 'charge', 'price', 'kitna', 'paisa', 'kharcha'],
      'lawyer_search': ['lawyer', 'advocate', 'vakil', 'find', 'need', 'chahiye'],
      'case_tracking': ['case', 'hearing', 'court', 'date', 'status', 'mukadma'],
      'legal_advice': ['advice', 'help', 'what should', 'kya karu', 'suggest', 'salah'],
      'fir_related': ['fir', 'police', 'complaint', 'shikayat', 'report'],
      'divorce': ['divorce', 'talaq', 'separation', 'alimony', 'guzara'],
      'property': ['property', 'land', 'zameen', 'inheritance', 'will', 'vasiyat'],
      'bail': ['bail', 'zamanat', 'arrest', 'giraftari'],
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return intent;
      }
    }

    return 'general_inquiry';
  }

  /**
   * Extract suggestions from response
   */
  extractSuggestions(response, language, domain) {
    const domainSuggestions = {
      criminal: language === 'hindi'
        ? ['आपराधिक वकील से बात करें', 'जमानत की जानकारी', 'FIR की स्थिति जानें']
        : ['Talk to a criminal lawyer', 'Bail information', 'Check FIR status'],
      family: language === 'hindi'
        ? ['पारिवारिक वकील से बात करें', 'गुजारा भत्ता कैलकुलेटर', 'तलाक प्रक्रिया']
        : ['Talk to a family lawyer', 'Alimony calculator', 'Divorce process'],
      property: language === 'hindi'
        ? ['संपत्ति वकील से बात करें', 'रजिस्ट्री प्रक्रिया', 'विरासत कानून']
        : ['Talk to a property lawyer', 'Registration process', 'Inheritance laws'],
      civil: language === 'hindi'
        ? ['दीवानी वकील से बात करें', 'मुआवजा कैलकुलेटर', 'केस फाइल करें']
        : ['Talk to a civil lawyer', 'Compensation calculator', 'File a case'],
      corporate: language === 'hindi'
        ? ['कॉर्पोरेट वकील से बात करें', 'कंपनी रजिस्ट्रेशन', 'अनुबंध समीक्षा']
        : ['Talk to a corporate lawyer', 'Company registration', 'Contract review'],
      labour: language === 'hindi'
        ? ['श्रम वकील से बात करें', 'PF/ESI जानकारी', 'शिकायत दर्ज करें']
        : ['Talk to a labour lawyer', 'PF/ESI information', 'File complaint'],
    };

    return domainSuggestions[domain] || (language === 'hindi' 
      ? ['वकील से बात करें', 'कानूनी खर्च जानें', 'अपना केस जोड़ें']
      : ['Talk to a lawyer', 'Calculate legal costs', 'Add your case']);
  }

  /**
   * Get domain info
   */
  getDomainInfo(domain) {
    return this.domainMapping[domain] || null;
  }

  /**
   * Get all available domains
   */
  getAllDomains() {
    return Object.entries(this.domainMapping).map(([key, config]) => ({
      id: key,
      name: config.displayName,
      nameHindi: config.displayNameHindi,
      specialization: config.specialization
    }));
  }
}

module.exports = new ChatbotService();
