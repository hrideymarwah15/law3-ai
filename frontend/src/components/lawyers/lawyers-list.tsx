'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  MapPin,
  Star,
  Video,
  MessageSquare,
  Phone,
  Clock,
  ChevronDown,
  X,
  SlidersHorizontal,
  Grid3X3,
  List,
  ArrowUpDown,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Skeleton,
  Separator,
} from '@/components/ui';
import { lawyerApi, queryKeys } from '@/lib/api';
import { cn } from '@/lib/utils';
import { config } from '@/config';
import type { LawyerProfile } from '@/types';

// ============================================
// Types
// ============================================

interface FiltersState {
  search: string;
  practiceAreas: string[];
  location: string;
  minRating: number;
  maxFee: number;
  languages: string[];
  availability: string;
  sortBy: string;
  consultationType: string[];
}

// ============================================
// Filter Sidebar
// ============================================

interface FilterSidebarProps {
  filters: FiltersState;
  onFilterChange: (key: keyof FiltersState, value: FiltersState[keyof FiltersState]) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function FilterSidebar({ filters, onFilterChange, onClearFilters, isOpen, onClose }: FilterSidebarProps) {
  const hasActiveFilters = 
    filters.practiceAreas.length > 0 ||
    filters.location ||
    filters.minRating > 0 ||
    filters.maxFee < 10000 ||
    filters.languages.length > 0 ||
    filters.consultationType.length > 0;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-80 bg-background border-r lg:border-r-0 z-50 lg:z-0 overflow-y-auto',
          'lg:block',
          isOpen ? 'block' : 'hidden lg:block'
        )}
        initial={{ x: -320 }}
        animate={{ x: isOpen || typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0 : -320 }}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  Clear All
                </Button>
              )}
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Practice Areas */}
          <div className="space-y-3">
            <h4 className="font-medium">Practice Areas</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {config.practiceAreas.map((area) => (
                <Checkbox
                  key={area.id}
                  label={area.name}
                  checked={filters.practiceAreas.includes(area.id)}
                  onCheckedChange={(checked) => {
                    const newAreas = checked
                      ? [...filters.practiceAreas, area.id]
                      : filters.practiceAreas.filter((a) => a !== area.id);
                    onFilterChange('practiceAreas', newAreas);
                  }}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-3">
            <h4 className="font-medium">Location</h4>
            <Select
              value={filters.location}
              onValueChange={(value) => onFilterChange('location', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {config.states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Rating */}
          <div className="space-y-3">
            <h4 className="font-medium">Minimum Rating</h4>
            <div className="flex gap-2">
              {[0, 3, 3.5, 4, 4.5].map((rating) => (
                <Button
                  key={rating}
                  variant={filters.minRating === rating ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onFilterChange('minRating', rating)}
                >
                  {rating === 0 ? 'Any' : `${rating}+`}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Consultation Fee */}
          <div className="space-y-3">
            <h4 className="font-medium">Max Consultation Fee</h4>
            <input
              type="range"
              min={500}
              max={10000}
              step={500}
              value={filters.maxFee}
              onChange={(e) => onFilterChange('maxFee', Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>₹500</span>
              <span className="font-medium text-foreground">Up to ₹{filters.maxFee}</span>
              <span>₹10,000</span>
            </div>
          </div>

          <Separator />

          {/* Languages */}
          <div className="space-y-3">
            <h4 className="font-medium">Languages</h4>
            <div className="flex flex-wrap gap-2">
              {['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'].map((lang) => (
                <Badge
                  key={lang}
                  variant={filters.languages.includes(lang) ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => {
                    const newLangs = filters.languages.includes(lang)
                      ? filters.languages.filter((l) => l !== lang)
                      : [...filters.languages, lang];
                    onFilterChange('languages', newLangs);
                  }}
                >
                  {lang}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Consultation Type */}
          <div className="space-y-3">
            <h4 className="font-medium">Consultation Type</h4>
            <div className="space-y-2">
              {config.consultationTypes.map((type) => (
                <Checkbox
                  key={type.id}
                  label={type.name}
                  checked={filters.consultationType.includes(type.id)}
                  onCheckedChange={(checked) => {
                    const newTypes = checked
                      ? [...filters.consultationType, type.id]
                      : filters.consultationType.filter((t) => t !== type.id);
                    onFilterChange('consultationType', newTypes);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

// ============================================
// Lawyer Card
// ============================================

interface LawyerCardProps {
  lawyer: LawyerProfile;
  viewMode: 'grid' | 'list';
}

function LawyerCard({ lawyer, viewMode }: LawyerCardProps) {
  const initials = `${lawyer.firstName?.[0] || ''}${lawyer.lastName?.[0] || ''}`.toUpperCase();

  if (viewMode === 'list') {
    return (
      <Link href={`/lawyers/${lawyer.id}`}>
        <Card className="p-6 hover:shadow-lg transition-all hover:border-primary/50">
          <div className="flex gap-6">
            <Avatar
              size="xl"
              src={lawyer.profilePhoto || undefined}
              fallback={initials}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Adv. {lawyer.firstName} {lawyer.lastName}
                  </h3>
                  <p className="text-muted-foreground">{lawyer.practiceAreas?.[0]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">₹{lawyer.consultationFee}</p>
                  <p className="text-sm text-muted-foreground">per consultation</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  {lawyer.rating?.toFixed(1) || 'N/A'} ({lawyer.totalReviews || 0} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {lawyer.yearsOfExperience} years exp.
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {lawyer.city}, {lawyer.state}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {lawyer.practiceAreas?.slice(0, 4).map((area) => (
                  <Badge key={area} variant="secondary" size="sm">
                    {area}
                  </Badge>
                ))}
                {(lawyer.practiceAreas?.length || 0) > 4 && (
                  <Badge variant="outline" size="sm">
                    +{(lawyer.practiceAreas?.length || 0) - 4} more
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-4">
                {lawyer.isAvailableForVideo && (
                  <Badge variant="outline" className="gap-1">
                    <Video className="h-3 w-3" /> Video
                  </Badge>
                )}
                {lawyer.isAvailableForChat && (
                  <Badge variant="outline" className="gap-1">
                    <MessageSquare className="h-3 w-3" /> Chat
                  </Badge>
                )}
                {lawyer.isAvailableForCall && (
                  <Badge variant="outline" className="gap-1">
                    <Phone className="h-3 w-3" /> Call
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/lawyers/${lawyer.id}`}>
      <Card className="p-6 h-full hover:shadow-lg transition-all hover:border-primary/50 hover:-translate-y-1">
        <div className="flex items-start gap-4 mb-4">
          <Avatar
            size="lg"
            src={lawyer.profilePhoto || undefined}
            fallback={initials}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              Adv. {lawyer.firstName} {lawyer.lastName}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {lawyer.practiceAreas?.[0]}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{lawyer.rating?.toFixed(1) || 'N/A'}</span>
              <span className="text-muted-foreground text-sm">
                ({lawyer.totalReviews || 0})
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{lawyer.yearsOfExperience} years experience</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{lawyer.city}, {lawyer.state}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {lawyer.practiceAreas?.slice(0, 2).map((area) => (
            <Badge key={area} variant="secondary" size="sm">
              {area}
            </Badge>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-primary">₹{lawyer.consultationFee}</p>
            <p className="text-xs text-muted-foreground">per consultation</p>
          </div>
          <div className="flex gap-1">
            {lawyer.isAvailableForVideo && <Video className="h-4 w-4 text-muted-foreground" />}
            {lawyer.isAvailableForChat && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
            {lawyer.isAvailableForCall && <Phone className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ============================================
// Lawyer Card Skeleton
// ============================================

function LawyerCardSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <Card className="p-6">
        <div className="flex gap-6">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex gap-4 mb-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-10 w-full" />
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

const defaultFilters: FiltersState = {
  search: '',
  practiceAreas: [],
  location: '',
  minRating: 0,
  maxFee: 10000,
  languages: [],
  availability: '',
  sortBy: 'rating',
  consultationType: [],
};

export function LawyersListPage() {
  const searchParams = useSearchParams();
  const initialArea = searchParams.get('area');
  
  const [filters, setFilters] = useState<FiltersState>({
    ...defaultFilters,
    practiceAreas: initialArea ? [initialArea] : [],
    search: searchParams.get('search') || '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Query lawyers
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.lawyers.list(filters),
    queryFn: async () => {
      const response = await lawyerApi.list({
        practiceArea: filters.practiceAreas?.[0],
        location: filters.location,
        minRating: filters.minRating,
        maxFee: filters.maxFee,
        language: filters.languages?.[0],
        sortBy: filters.sortBy,
        page: 1,
        limit: 20,
      });
      return response.data;
    },
  });

  const handleFilterChange = useCallback((key: keyof FiltersState, value: FiltersState[keyof FiltersState]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const lawyers = data?.lawyers || [];
  const totalCount = data?.pagination?.total || 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find a Lawyer</h1>
          <p className="text-muted-foreground">
            Browse verified lawyers across various practice areas
          </p>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, practice area, or location..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setFilterSidebarOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <Select
              value={filters.sortBy}
              onValueChange={(value) => handleFilterChange('sortBy', value)}
              options={[
                { value: 'rating', label: 'Top Rated' },
                { value: 'experience', label: 'Most Experienced' },
                { value: 'fee_low', label: 'Fee: Low to High' },
                { value: 'fee_high', label: 'Fee: High to Low' },
                { value: 'reviews', label: 'Most Reviews' },
              ]}
              className="w-[180px]"
            />

            <div className="hidden sm:flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.practiceAreas.length > 0 || filters.location || filters.languages.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.practiceAreas.map((area) => (
              <Badge key={area} variant="secondary" className="gap-1">
                {area}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('practiceAreas', filters.practiceAreas.filter((a) => a !== area))}
                />
              </Badge>
            ))}
            {filters.location && (
              <Badge variant="secondary" className="gap-1">
                {filters.location}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('location', '')}
                />
              </Badge>
            )}
            {filters.languages.map((lang) => (
              <Badge key={lang} variant="secondary" className="gap-1">
                {lang}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('languages', filters.languages.filter((l) => l !== lang))}
                />
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            isOpen={filterSidebarOpen}
            onClose={() => setFilterSidebarOpen(false)}
          />

          {/* Results */}
          <div className="flex-1">
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  `${totalCount} lawyers found`
                )}
              </p>
            </div>

            {/* Error State */}
            {error && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  Failed to load lawyers. Please try again.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </Card>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className={cn(
                'gap-6',
                viewMode === 'grid' 
                  ? 'grid md:grid-cols-2 xl:grid-cols-3' 
                  : 'flex flex-col'
              )}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <LawyerCardSkeleton key={i} viewMode={viewMode} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && lawyers.length === 0 && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No lawyers found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search terms
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </Card>
            )}

            {/* Lawyers Grid/List */}
            {!isLoading && lawyers.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'gap-6',
                  viewMode === 'grid' 
                    ? 'grid md:grid-cols-2 xl:grid-cols-3' 
                    : 'flex flex-col'
                )}
              >
                {lawyers.map((lawyer) => (
                  <LawyerCard key={lawyer.id} lawyer={lawyer} viewMode={viewMode} />
                ))}
              </motion.div>
            )}

            {/* Load More */}
            {!isLoading && lawyers.length > 0 && lawyers.length < totalCount && (
              <div className="text-center mt-8">
                <Button variant="outline">
                  Load More
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LawyersListPage;
