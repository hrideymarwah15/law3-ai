/**
 * Application Configuration
 * Centralized configuration for the Nyaay Saathi frontend
 */

export const config = {
  // App Info
  app: {
    name: "Nyaay Saathi",
    tagline: "न्याय सबके लिए | Justice for All",
    description: "AI-Powered Legal Consultation Platform - Connect with verified lawyers across India",
    version: "3.0.0",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },

  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
    timeout: 30000, // 30 seconds
    retries: 3,
  },

  // Socket Configuration
  socket: {
    url: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  },

  // Feature Flags
  features: {
    aiChatbot: true,
    videoConsultations: true,
    multiLanguage: true,
    darkMode: true,
    pushNotifications: true,
  },

  // Supported Languages
  languages: [
    { code: "en", name: "English", nativeName: "English" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  ],

  // Practice Areas
  practiceAreas: [
    { id: "criminal", name: "Criminal Law", icon: "Gavel" },
    { id: "family", name: "Family Law", icon: "Users" },
    { id: "property", name: "Property Law", icon: "Home" },
    { id: "corporate", name: "Corporate Law", icon: "Building" },
    { id: "civil", name: "Civil Law", icon: "Scale" },
    { id: "consumer", name: "Consumer Rights", icon: "ShoppingBag" },
    { id: "labour", name: "Labour Law", icon: "Briefcase" },
    { id: "tax", name: "Tax Law", icon: "Receipt" },
    { id: "intellectual", name: "Intellectual Property", icon: "Lightbulb" },
    { id: "cyber", name: "Cyber Law", icon: "Shield" },
    { id: "constitutional", name: "Constitutional Law", icon: "BookOpen" },
    { id: "immigration", name: "Immigration Law", icon: "Globe" },
  ],

  // Consultation Types
  consultationTypes: [
    { id: "video", name: "Video Call", icon: "Video", description: "Face-to-face video consultation" },
    { id: "audio", name: "Audio Call", icon: "Phone", description: "Voice-only consultation" },
    { id: "chat", name: "Chat", icon: "MessageSquare", description: "Text-based consultation" },
    { id: "in_person", name: "In Person", icon: "MapPin", description: "Visit lawyer's office" },
  ],

  // Indian States
  states: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Chandigarh", "Puducherry", "Jammu and Kashmir", "Ladakh",
  ],

  // Courts
  courts: [
    "Supreme Court of India",
    "High Court",
    "District Court",
    "Sessions Court",
    "Family Court",
    "Consumer Court",
    "Labour Court",
    "Tribunal",
  ],

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // File Upload
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"],
  },

  // Social Links
  social: {
    twitter: "https://twitter.com/nyaaysaathi",
    linkedin: "https://linkedin.com/company/nyaaysaathi",
    facebook: "https://facebook.com/nyaaysaathi",
    instagram: "https://instagram.com/nyaaysaathi",
  },

  // Contact
  contact: {
    email: "support@nyaaysaathi.com",
    phone: "+91 1800-XXX-XXXX",
    address: "New Delhi, India",
  },

  // SEO Defaults
  seo: {
    titleTemplate: "%s | Nyaay Saathi",
    defaultTitle: "Nyaay Saathi - AI-Powered Legal Consultation Platform",
    defaultDescription: "Connect with verified lawyers across India. Get expert legal advice on criminal, family, property, corporate law and more. Book consultations online.",
    keywords: [
      "legal consultation",
      "lawyer",
      "advocate",
      "legal advice",
      "India",
      "online lawyer",
      "law firm",
      "legal services",
    ],
  },
} as const;

export type Config = typeof config;
export default config;
