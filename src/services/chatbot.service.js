const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../config/logger');
const { ExternalServiceError } = require('../middleware/errorHandler');

class ChatbotService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
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

Important guidelines:
- Never provide specific legal advice that could be construed as practicing law
- Always clarify that you're an AI assistant, not a lawyer
- Suggest connecting with a lawyer on the platform for detailed consultation
- Keep responses concise but helpful (200-400 words)
- Use bullet points for better readability
- If unsure, say so and recommend professional consultation`;

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
   * Process a user query and generate response
   */
  async processQuery(query, language = 'english', sessionId, conversationHistory = []) {
    try {
      const languageInstruction = language === 'hindi' 
        ? '\n\nIMPORTANT: Respond in Hindi language using Devanagari script.'
        : '\n\nRespond in clear, simple English.';

      const fullPrompt = `${this.systemPrompt}${languageInstruction}

Previous conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User query: ${query}

Provide a helpful response. At the end, suggest 2-3 relevant follow-up actions the user can take on our platform (like "Talk to a lawyer", "Calculate legal costs", "Track your case").`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response.text();

      // Extract suggestions from response or provide defaults
      const suggestions = this.extractSuggestions(response, language);

      // Detect intent
      const intent = this.detectIntent(query);

      logger.info({ 
        message: 'Chatbot query processed', 
        sessionId, 
        intent,
        queryLength: query.length 
      });

      return {
        response: response,
        intent,
        confidence: 0.85,
        suggestions,
      };
    } catch (error) {
      logger.error({ message: 'Chatbot error', error: error.message, sessionId });
      
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
  extractSuggestions(response, language) {
    const defaultSuggestions = language === 'hindi' 
      ? ['वकील से बात करें', 'कानूनी खर्च जानें', 'अपना केस जोड़ें']
      : ['Talk to a lawyer', 'Calculate legal costs', 'Add your case'];

    return defaultSuggestions;
  }
}

module.exports = new ChatbotService();
