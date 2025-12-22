'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
  Building,
  GraduationCap,
  MapPin,
  FileText,
  Briefcase,
  Upload,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Input,
  Alert,
  Spinner,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/auth';

// ============================================
// Constants
// ============================================

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const PRACTICE_AREAS = [
  'Criminal Law', 'Civil Law', 'Family Law', 'Property Law', 'Corporate Law',
  'Consumer Law', 'Labour Law', 'Tax Law', 'Constitutional Law', 'Intellectual Property',
  'Cyber Law', 'Environmental Law', 'Immigration Law', 'Banking Law', 'Insurance Law',
  'Real Estate', 'Arbitration', 'Mediation', 'Human Rights', 'Other',
];

const SPECIALIZATIONS = [
  'criminal', 'civil', 'family', 'property', 'corporate', 'other'
] as const;

const COURTS = [
  'Supreme Court of India', 'High Court', 'District Court', 'Sessions Court',
  'Magistrate Court', 'Family Court', 'Consumer Court', 'Labour Court',
  'Tribunal', 'Other',
];

const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati',
  'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu', 'Assamese', 'Other',
];

const ID_PROOF_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_license', label: 'Driving License' },
];

// ============================================
// Validation Schema
// ============================================

const lawyerRegistrationSchema = z.object({
  // Step 1: Personal Info
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .transform((val) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length === 10 && /^[6-9]/.test(digits)) {
        return '+91' + digits;
      }
      return val;
    }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),

  // Step 2: Professional Info
  barCouncilNumber: z.string()
    .min(5, 'Bar Council number is required')
    .regex(/^[A-Z0-9/-]+$/i, 'Invalid Bar Council number format'),
  barCouncilState: z.string().min(2, 'Bar Council state is required'),
  barCouncilEnrollmentDate: z.string().optional(),
  specialization: z.enum(SPECIALIZATIONS),
  experienceYears: z.coerce.number().min(0).max(70),
  
  // Step 3: Education
  education: z.array(z.object({
    degree: z.string().min(2, 'Degree is required'),
    institution: z.string().min(2, 'Institution is required'),
    year: z.coerce.number().min(1950).max(new Date().getFullYear()),
    grade: z.string().optional(),
  })).min(1, 'At least one education entry is required'),

  // Step 4: Practice Details
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(2000),
  headline: z.string().max(200).optional(),
  consultationFee: z.coerce.number().min(100, 'Minimum fee is ₹100').max(100000),
  practiceAreas: z.array(z.string()).min(1, 'Select at least one practice area').max(10),
  languagesSpoken: z.array(z.string()).min(1, 'Select at least one language'),
  courtsPracticed: z.array(z.string()).optional(),

  // Step 5: Office Info
  officeCity: z.string().min(2, 'City is required'),
  officeState: z.string().min(2, 'State is required'),
  officeAddress: z.string().optional(),
  officePincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional().or(z.literal('')),
  officePhone: z.string().optional(),

  // Step 6: Documents
  barCouncilCertificateUrl: z.string().min(1, 'Bar Council certificate is required'),
  idProofType: z.enum(['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license']),
  idProofUrl: z.string().min(1, 'ID proof is required'),
  profilePhotoUrl: z.string().optional(),

  // Accept terms
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LawyerRegistrationData = z.infer<typeof lawyerRegistrationSchema>;

// ============================================
// Step Components
// ============================================

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Professional', icon: Briefcase },
  { id: 3, title: 'Education', icon: GraduationCap },
  { id: 4, title: 'Practice', icon: FileText },
  { id: 5, title: 'Office', icon: Building },
  { id: 6, title: 'Documents', icon: Upload },
];

// ============================================
// Main Form Component
// ============================================

export function LawyerRegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<LawyerRegistrationData>({
    resolver: zodResolver(lawyerRegistrationSchema) as never,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      barCouncilNumber: '',
      barCouncilState: '',
      specialization: 'civil',
      experienceYears: 0,
      education: [{ degree: '', institution: '', year: new Date().getFullYear(), grade: '' }],
      bio: '',
      headline: '',
      consultationFee: 500,
      practiceAreas: [],
      languagesSpoken: ['English'],
      courtsPracticed: [],
      officeCity: '',
      officeState: '',
      officeAddress: '',
      officePincode: '',
      idProofType: 'aadhaar',
      barCouncilCertificateUrl: '',
      idProofUrl: '',
      profilePhotoUrl: '',
      acceptTerms: false,
    },
    mode: 'onChange',
  });

  const watchEducation = watch('education');
  const watchPracticeAreas = watch('practiceAreas');
  const watchLanguages = watch('languagesSpoken');
  const watchCourts = watch('courtsPracticed');
  const watchAcceptTerms = watch('acceptTerms');

  // Step validation
  const validateStep = async (step: number): Promise<boolean> => {
    const fieldsToValidate: Record<number, (keyof LawyerRegistrationData)[]> = {
      1: ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'],
      2: ['barCouncilNumber', 'barCouncilState', 'specialization', 'experienceYears'],
      3: ['education'],
      4: ['bio', 'consultationFee', 'practiceAreas', 'languagesSpoken'],
      5: ['officeCity', 'officeState'],
      6: ['barCouncilCertificateUrl', 'idProofType', 'idProofUrl', 'acceptTerms'],
    };
    
    const fields = fieldsToValidate[step];
    if (!fields) return true;
    
    const result = await trigger(fields);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Mock file upload - In production, integrate with actual file upload service
  const handleFileUpload = async (field: 'barCouncilCertificateUrl' | 'idProofUrl' | 'profilePhotoUrl') => {
    setUploadingField(field);
    
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = field === 'profilePhotoUrl' ? 'image/*' : 'image/*,.pdf';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        setUploadingField(null);
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 5MB',
          variant: 'error',
        });
        setUploadingField(null);
        return;
      }
      
      try {
        // In production, upload to your storage service (S3, Supabase Storage, etc.)
        // For now, we'll use a placeholder URL
        // const response = await uploadFile(file);
        // setValue(field, response.url);
        
        // Placeholder: Convert to data URL for demo
        const reader = new FileReader();
        reader.onload = () => {
          // In production, this would be the uploaded file URL
          const mockUrl = `https://storage.nyaaysaathi.com/uploads/${Date.now()}-${file.name}`;
          setValue(field, mockUrl, { shouldValidate: true });
          toast({
            title: 'Success',
            description: 'File uploaded successfully',
            variant: 'success',
          });
          setUploadingField(null);
        };
        reader.onerror = () => {
          toast({
            title: 'Error',
            description: 'Failed to upload file',
            variant: 'error',
          });
          setUploadingField(null);
        };
        reader.readAsDataURL(file);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to upload file',
          variant: 'error',
        });
        setUploadingField(null);
      }
    };
    
    input.click();
  };

  // Education field management
  const addEducation = () => {
    const current = watch('education') || [];
    if (current.length < 10) {
      setValue('education', [...current, { degree: '', institution: '', year: new Date().getFullYear(), grade: '' }]);
    }
  };

  const removeEducation = (index: number) => {
    const current = watch('education') || [];
    if (current.length > 1) {
      setValue('education', current.filter((_, i) => i !== index));
    }
  };

  // Multi-select toggle
  const toggleArrayItem = (field: 'practiceAreas' | 'languagesSpoken' | 'courtsPracticed', item: string) => {
    const current = watch(field) || [];
    if (current.includes(item)) {
      setValue(field, current.filter(i => i !== item), { shouldValidate: true });
    } else {
      setValue(field, [...current, item], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: LawyerRegistrationData) => {
    setIsSubmitting(true);
    
    try {
      // Step 1: Create user account first
      await authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
        role: 'user', // Register as user first, then apply for lawyer
        acceptTerms: data.acceptTerms,
      });

      toast({
        title: 'Account Created',
        description: 'Please check your email to verify your account, then login to complete lawyer registration.',
        variant: 'success',
      });

      // Store the lawyer registration data temporarily
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingLawyerRegistration', JSON.stringify({
          barCouncilNumber: data.barCouncilNumber,
          barCouncilState: data.barCouncilState,
          barCouncilEnrollmentDate: data.barCouncilEnrollmentDate,
          specialization: data.specialization,
          experienceYears: data.experienceYears,
          education: data.education,
          bio: data.bio,
          headline: data.headline,
          consultationFee: data.consultationFee,
          practiceAreas: data.practiceAreas,
          languagesSpoken: data.languagesSpoken,
          courtsPracticed: data.courtsPracticed,
          officeCity: data.officeCity,
          officeState: data.officeState,
          officeAddress: data.officeAddress,
          officePincode: data.officePincode,
          barCouncilCertificateUrl: data.barCouncilCertificateUrl,
          idProofType: data.idProofType,
          idProofUrl: data.idProofUrl,
          profilePhotoUrl: data.profilePhotoUrl,
        }));
      }

      // Redirect to login
      router.push('/login?registered=lawyer&message=Please verify your email and login to complete lawyer registration');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: 'Registration Failed',
        description: message,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                currentStep === step.id
                  ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                  : currentStep > step.id
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
              )}
            >
              {currentStep > step.id ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'hidden sm:block w-12 md:w-16 h-1 mx-2',
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center">
        <h2 className="text-lg font-semibold">
          Step {currentStep}: {STEPS[currentStep - 1].title}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="John"
                  autoComplete="given-name"
                  leftElement={<User className="h-4 w-4 text-muted-foreground" />}
                  error={errors.firstName?.message}
                  {...register('firstName')}
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  autoComplete="family-name"
                  error={errors.lastName?.message}
                  {...register('lastName')}
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                leftElement={<Mail className="h-4 w-4 text-muted-foreground" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="9876543210"
                autoComplete="tel"
                leftElement={<Phone className="h-4 w-4 text-muted-foreground" />}
                error={errors.phone?.message}
                {...register('phone')}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                leftElement={<Lock className="h-4 w-4 text-muted-foreground" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                leftElement={<Lock className="h-4 w-4 text-muted-foreground" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </motion.div>
          )}

          {/* Step 2: Professional Info */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Input
                label="Bar Council Registration Number"
                placeholder="e.g., MH/1234/2020"
                error={errors.barCouncilNumber?.message}
                {...register('barCouncilNumber')}
              />

              <div>
                <label className="block text-sm font-medium mb-1.5">Bar Council State</label>
                <select
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]',
                    errors.barCouncilState ? 'border-red-500' : 'border-gray-300'
                  )}
                  {...register('barCouncilState')}
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.barCouncilState && (
                  <p className="text-sm text-red-600 mt-1">{errors.barCouncilState.message}</p>
                )}
              </div>

              <Input
                label="Enrollment Date (Optional)"
                type="date"
                error={errors.barCouncilEnrollmentDate?.message}
                {...register('barCouncilEnrollmentDate')}
              />

              <div>
                <label className="block text-sm font-medium mb-1.5">Primary Specialization</label>
                <select
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]',
                    errors.specialization ? 'border-red-500' : 'border-gray-300'
                  )}
                  {...register('specialization')}
                >
                  {SPECIALIZATIONS.map(spec => (
                    <option key={spec} value={spec}>
                      {spec.charAt(0).toUpperCase() + spec.slice(1)} Law
                    </option>
                  ))}
                </select>
                {errors.specialization && (
                  <p className="text-sm text-red-600 mt-1">{errors.specialization.message}</p>
                )}
              </div>

              <Input
                label="Years of Experience"
                type="number"
                min={0}
                max={70}
                error={errors.experienceYears?.message}
                {...register('experienceYears')}
              />
            </motion.div>
          )}

          {/* Step 3: Education */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Education Details</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEducation}
                  disabled={(watchEducation?.length || 0) >= 10}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add More
                </Button>
              </div>

              {watchEducation?.map((_, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  
                  <Input
                    label="Degree"
                    placeholder="e.g., LLB, LLM, BA LLB"
                    error={errors.education?.[index]?.degree?.message}
                    {...register(`education.${index}.degree`)}
                  />
                  
                  <Input
                    label="Institution"
                    placeholder="e.g., Delhi University"
                    error={errors.education?.[index]?.institution?.message}
                    {...register(`education.${index}.institution`)}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Graduation Year"
                      type="number"
                      min={1950}
                      max={new Date().getFullYear()}
                      error={errors.education?.[index]?.year?.message}
                      {...register(`education.${index}.year`)}
                    />
                    <Input
                      label="Grade/Percentage (Optional)"
                      placeholder="e.g., First Class"
                      {...register(`education.${index}.grade`)}
                    />
                  </div>
                </div>
              ))}
              {errors.education?.message && (
                <p className="text-sm text-red-600">{errors.education.message}</p>
              )}
            </motion.div>
          )}

          {/* Step 4: Practice Details */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1.5">Professional Bio</label>
                <textarea
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] min-h-[120px]',
                    errors.bio ? 'border-red-500' : 'border-gray-300'
                  )}
                  placeholder="Describe your experience, expertise, and approach to legal matters..."
                  {...register('bio')}
                />
                {errors.bio && <p className="text-sm text-red-600 mt-1">{errors.bio.message}</p>}
              </div>

              <Input
                label="Headline (Optional)"
                placeholder="e.g., Senior Criminal Lawyer with 15+ years experience"
                error={errors.headline?.message}
                {...register('headline')}
              />

              <Input
                label="Consultation Fee (₹)"
                type="number"
                min={100}
                max={100000}
                leftElement={<span className="text-muted-foreground">₹</span>}
                error={errors.consultationFee?.message}
                {...register('consultationFee')}
              />

              <div>
                <label className="block text-sm font-medium mb-2">
                  Practice Areas <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_AREAS.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArrayItem('practiceAreas', area)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-full border transition-all',
                        watchPracticeAreas?.includes(area)
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#4F46E5]'
                      )}
                    >
                      {area}
                    </button>
                  ))}
                </div>
                {errors.practiceAreas && (
                  <p className="text-sm text-red-600 mt-1">{errors.practiceAreas.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Languages Spoken <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleArrayItem('languagesSpoken', lang)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-full border transition-all',
                        watchLanguages?.includes(lang)
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#4F46E5]'
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                {errors.languagesSpoken && (
                  <p className="text-sm text-red-600 mt-1">{errors.languagesSpoken.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Courts Practiced (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {COURTS.map(court => (
                    <button
                      key={court}
                      type="button"
                      onClick={() => toggleArrayItem('courtsPracticed', court)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-full border transition-all',
                        watchCourts?.includes(court)
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#4F46E5]'
                      )}
                    >
                      {court}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Office Info */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  placeholder="e.g., Mumbai"
                  leftElement={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  error={errors.officeCity?.message}
                  {...register('officeCity')}
                />
                <div>
                  <label className="block text-sm font-medium mb-1.5">State</label>
                  <select
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]',
                      errors.officeState ? 'border-red-500' : 'border-gray-300'
                    )}
                    {...register('officeState')}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.officeState && (
                    <p className="text-sm text-red-600 mt-1">{errors.officeState.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Office Address (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] min-h-[80px]"
                  placeholder="Full office address..."
                  {...register('officeAddress')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Pincode (Optional)"
                  placeholder="e.g., 400001"
                  error={errors.officePincode?.message}
                  {...register('officePincode')}
                />
                <Input
                  label="Office Phone (Optional)"
                  type="tel"
                  placeholder="e.g., +91 22 12345678"
                  {...register('officePhone')}
                />
              </div>
            </motion.div>
          )}

          {/* Step 6: Documents */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Alert variant="info">
                <AlertCircle className="h-4 w-4" />
                <span className="ml-2 text-sm">
                  Please upload clear, readable copies of your documents. Supported formats: JPG, PNG, PDF (max 5MB each)
                </span>
              </Alert>

              {/* Bar Council Certificate */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bar Council Certificate <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => !uploadingField && handleFileUpload('barCouncilCertificateUrl')}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
                    watch('barCouncilCertificateUrl')
                      ? 'border-green-500 bg-green-50'
                      : errors.barCouncilCertificateUrl
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-[#4F46E5]'
                  )}
                >
                  {uploadingField === 'barCouncilCertificateUrl' ? (
                    <Spinner size="sm" />
                  ) : watch('barCouncilCertificateUrl') ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span>Certificate uploaded</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload Bar Council Certificate</p>
                    </div>
                  )}
                </div>
                {errors.barCouncilCertificateUrl && (
                  <p className="text-sm text-red-600 mt-1">{errors.barCouncilCertificateUrl.message}</p>
                )}
              </div>

              {/* ID Proof */}
              <div>
                <label className="block text-sm font-medium mb-1.5">ID Proof Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  {...register('idProofType')}
                >
                  {ID_PROOF_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ID Proof Document <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => !uploadingField && handleFileUpload('idProofUrl')}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
                    watch('idProofUrl')
                      ? 'border-green-500 bg-green-50'
                      : errors.idProofUrl
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-[#4F46E5]'
                  )}
                >
                  {uploadingField === 'idProofUrl' ? (
                    <Spinner size="sm" />
                  ) : watch('idProofUrl') ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span>ID Proof uploaded</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload ID Proof</p>
                    </div>
                  )}
                </div>
                {errors.idProofUrl && (
                  <p className="text-sm text-red-600 mt-1">{errors.idProofUrl.message}</p>
                )}
              </div>

              {/* Profile Photo */}
              <div>
                <label className="block text-sm font-medium mb-2">Profile Photo (Optional)</label>
                <div
                  onClick={() => !uploadingField && handleFileUpload('profilePhotoUrl')}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
                    watch('profilePhotoUrl')
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-[#4F46E5]'
                  )}
                >
                  {uploadingField === 'profilePhotoUrl' ? (
                    <Spinner size="sm" />
                  ) : watch('profilePhotoUrl') ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span>Photo uploaded</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload Profile Photo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 pt-4 border-t">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={watchAcceptTerms}
                  onChange={(e) => setValue('acceptTerms', e.target.checked, { shouldValidate: true })}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                  style={{ accentColor: '#4F46E5' }}
                />
                <div>
                  <label htmlFor="acceptTerms" className="text-sm cursor-pointer">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[#4F46E5] hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-[#4F46E5] hover:underline">
                      Privacy Policy
                    </Link>
                    . I confirm that all the information provided is accurate and I am a registered advocate with the Bar Council.
                  </label>
                  {errors.acceptTerms && (
                    <p className="text-sm text-red-600 mt-1">{errors.acceptTerms.message}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            style={{ borderColor: '#E5E7EB', color: '#374151' }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              style={{ background: '#4F46E5', color: '#ffffff' }}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ 
                background: isSubmitting ? '#9CA3AF' : '#4F46E5', 
                color: '#ffffff' 
              }}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[#4F46E5] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
