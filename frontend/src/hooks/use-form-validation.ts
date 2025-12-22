'use client';

import { useCallback, useState } from 'react';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must not exceed 15 digits')
  .transform((val) => {
    // Auto-format to +91 prefix for Indian numbers
    const digits = val.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      return '+' + digits;
    }
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return '+91' + digits;
    }
    return val;
  })
  .refine((val) => /^\+91[6-9]\d{9}$/.test(val), {
    message: 'Please enter a valid Indian phone number (10 digits starting with 6-9)',
  });

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens and apostrophes');

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['user', 'lawyer']),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const lawyerRegisterSchema = registerSchema
  .omit({ acceptTerms: true })
  .extend({
    barCouncilNumber: z
      .string()
      .min(1, 'Bar Council registration number is required')
      .regex(/^[A-Z]{2}\/\d+\/\d{4}$/, 'Invalid Bar Council number format (e.g., MH/1234/2020)'),
    barCouncilState: z.string().min(1, 'Bar Council state is required'),
    practiceAreas: z
      .array(z.string())
      .min(1, 'Please select at least one practice area')
      .max(5, 'Maximum 5 practice areas allowed'),
    yearsOfExperience: z
      .number()
      .min(0, 'Experience cannot be negative')
      .max(60, 'Please enter a valid experience'),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// ============================================
// Profile Schemas
// ============================================

export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.object({
    line1: z.string().max(200).optional(),
    line2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pincode: z.string().regex(/^\d{6}$/, 'Invalid PIN code').optional(),
  }).optional(),
});

export const lawyerProfileSchema = profileSchema.extend({
  barCouncilNumber: z.string().min(1, 'Bar Council registration number is required'),
  barCouncilState: z.string().min(1, 'Bar Council state is required'),
  practiceAreas: z.array(z.string()).min(1).max(5),
  yearsOfExperience: z.number().min(0).max(60),
  education: z.array(z.object({
    degree: z.string().min(1),
    institution: z.string().min(1),
    year: z.number().min(1950).max(new Date().getFullYear()),
  })).optional(),
  languages: z.array(z.string()).min(1, 'Please select at least one language'),
  hourlyRate: z.number().min(0, 'Rate cannot be negative').optional(),
  courts: z.array(z.string()).optional(),
});

// ============================================
// Consultation Schemas
// ============================================

export const consultationRequestSchema = z.object({
  lawyerId: z.string().min(1, 'Lawyer selection is required'),
  consultationType: z.enum(['video', 'audio', 'chat', 'in_person']),
  practiceArea: z.string().min(1, 'Practice area is required'),
  description: z
    .string()
    .min(50, 'Please provide at least 50 characters describing your issue')
    .max(2000, 'Description must not exceed 2000 characters'),
  preferredDate: z.string().min(1, 'Preferred date is required'),
  preferredTimeSlot: z.string().min(1, 'Preferred time slot is required'),
  attachments: z.array(z.string()).max(5, 'Maximum 5 attachments allowed').optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

export const consultationNotesSchema = z.object({
  notes: z.string().min(10, 'Notes must be at least 10 characters').max(5000),
  recommendations: z.string().max(2000).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional(),
});

// ============================================
// Review Schema
// ============================================

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  content: z.string().min(20, 'Review must be at least 20 characters').max(1000),
  isAnonymous: z.boolean().optional(),
});

// ============================================
// Contact/Support Schema
// ============================================

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(20, 'Message must be at least 20 characters').max(2000),
  category: z.enum(['general', 'technical', 'billing', 'complaint', 'suggestion']).optional(),
});

// ============================================
// Type Exports
// ============================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LawyerRegisterFormData = z.infer<typeof lawyerRegisterSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type LawyerProfileFormData = z.infer<typeof lawyerProfileSchema>;
export type ConsultationRequestFormData = z.infer<typeof consultationRequestSchema>;
export type ConsultationNotesFormData = z.infer<typeof consultationNotesSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;

// ============================================
// Custom Form Hook
// ============================================

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
}

export function useFormValidation<T extends Record<string, unknown>>({
  schema,
  onSubmit,
}: UseFormValidationOptions<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const validate = useCallback(
    (data: unknown): data is T => {
      const result = schema.safeParse(data);
      if (result.success) {
        setErrors({});
        setIsValid(true);
        return true;
      }
      
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!formattedErrors[path]) {
          formattedErrors[path] = err.message;
        }
      });
      setErrors(formattedErrors);
      setIsValid(false);
      return false;
    },
    [schema]
  );

  const validateField = useCallback(
    (field: string, value: unknown, allData: Record<string, unknown>) => {
      const result = schema.safeParse({ ...allData, [field]: value });
      if (result.success) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
        return true;
      }
      
      const fieldError = result.error.issues.find(
        (err) => err.path.join('.') === field
      );
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
        return false;
      }
      return true;
    },
    [schema]
  );

  const handleSubmit = useCallback(
    async (data: unknown) => {
      if (!validate(data)) return;
      
      setIsSubmitting(true);
      try {
        await onSubmit(data as T);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, onSubmit]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return {
    errors,
    isSubmitting,
    isValid,
    validate,
    validateField,
    handleSubmit,
    clearErrors,
    clearFieldError,
    setErrors,
  };
}
