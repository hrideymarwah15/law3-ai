// ============================================
// Hooks Index
// ============================================

// Auth hooks
export { useAuth, useUser, useIsAuthenticated } from './use-auth';

// Form validation hooks
export {
  useFormValidation,
  // Schemas
  loginSchema,
  registerSchema,
  lawyerRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  profileSchema,
  lawyerProfileSchema,
  consultationRequestSchema,
  consultationNotesSchema,
  reviewSchema,
  contactSchema,
  // Validation schemas
  emailSchema,
  passwordSchema,
  phoneSchema,
  nameSchema,
} from './use-form-validation';

// Types
export type {
  LoginFormData,
  RegisterFormData,
  LawyerRegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  ChangePasswordFormData,
  ProfileFormData,
  LawyerProfileFormData,
  ConsultationRequestFormData,
  ConsultationNotesFormData,
  ReviewFormData,
  ContactFormData,
} from './use-form-validation';

// Socket hooks
export { 
  useSocket, 
  useChatRoom, 
  useOnlineStatus, 
  useTypingIndicator 
} from './use-socket';

// Utility hooks
export {
  // Media query hooks
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  // Storage hooks
  useLocalStorage,
  // Timing hooks
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  // UI interaction hooks
  useClickOutside,
  useEscapeKey,
  useToggle,
  useDisclosure,
  useLockBodyScroll,
  useCopyToClipboard,
  // DOM hooks
  useIntersectionObserver,
  useWindowSize,
  useScrollPosition,
  useDocumentTitle,
  useEventListener,
  // Utility hooks
  usePrevious,
  useIsMounted,
} from './use-utils';
