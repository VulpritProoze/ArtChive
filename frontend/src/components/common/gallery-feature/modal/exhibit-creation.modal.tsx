import { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, Search, Calendar as CalendarIcon } from 'lucide-react';
import { COUNTRIES, CITIES, type Country } from '@types/location.constants';
import type { Gallery } from '@services/gallery.service';

interface ExhibitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExhibitFormData) => Promise<void>;
  gallery: Gallery;
  hasExistingExhibit: boolean;
}

export interface ExhibitFormData {
  gallery: string;
  organizer_name: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
}

export function ExhibitCreationModal({
  isOpen,
  onClose,
  onSubmit,
  gallery,
  hasExistingExhibit,
}: ExhibitCreationModalProps) {
  const [formData, setFormData] = useState<ExhibitFormData>({
    gallery: gallery.gallery_id,
    organizer_name: '',
    city: '',
    country: '',
    start_date: '',
    end_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const countryInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search
  const filteredCountries = COUNTRIES.filter((country) =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Filter cities based on search and selected country
  const availableCities = formData.country ? (CITIES[formData.country] || []) : [];
  const filteredCities = availableCities.filter((city) =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node) &&
        countryInputRef.current &&
        !countryInputRef.current.contains(event.target as Node)
      ) {
        setShowCountryDropdown(false);
      }
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    };

    if (showCountryDropdown || showCityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown, showCityDropdown]);

  // Reset city when country changes
  useEffect(() => {
    if (formData.country && !CITIES[formData.country]) {
      setFormData((prev) => ({ ...prev, city: '' }));
    }
  }, [formData.country]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizer_name.trim()) {
      newErrors.organizer_name = 'Organizer name is required';
    }

    if (!formData.country) {
      newErrors.country = 'Country is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    } else {
      const startDate = new Date(formData.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        newErrors.start_date = 'Start date cannot be in the past';
      }
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Failed to create exhibit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      gallery: gallery.gallery_id,
      organizer_name: '',
      city: '',
      country: '',
      start_date: '',
      end_date: '',
    });
    setErrors({});
    setCountrySearch('');
    setCitySearch('');
    setShowCountryDropdown(false);
    setShowCityDropdown(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleCountrySelect = (country: Country) => {
    setFormData((prev) => ({ ...prev, country, city: '' }));
    setCountrySearch(country);
    setShowCountryDropdown(false);
    setCitySearch('');
  };

  const handleCitySelect = (city: string) => {
    setFormData((prev) => ({ ...prev, city }));
    setCitySearch(city);
    setShowCityDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary text-primary-content px-6 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-2xl">Exhibit Gallery</h3>
              <p className="text-sm opacity-90 mt-1">Create an exhibit for "{gallery.title}"</p>
            </div>
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost hover:bg-primary-content/20"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {hasExistingExhibit && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-warning mb-1">
                    Existing Exhibit Detected
                  </p>
                  <p className="text-sm text-base-content">
                    You already have an exhibit. Only one exhibit per user is allowed. If you create a new exhibit, you will need to delete the existing one first.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form id="exhibit-form" onSubmit={handleSubmit}>
            {/* Organizer Name */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-base-content">
                Organizer Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter organizer name"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.organizer_name ? 'border-error' : 'border-base-300'
                } bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                value={formData.organizer_name}
                onChange={(e) => {
                  setFormData({ ...formData, organizer_name: e.target.value });
                  if (errors.organizer_name) {
                    setErrors((prev) => ({ ...prev, organizer_name: '' }));
                  }
                }}
                required
              />
              {errors.organizer_name && (
                <p className="text-error text-xs mt-1">{errors.organizer_name}</p>
              )}
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-2">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-base-content">
                    <strong>Temporary field:</strong> Organizer account feature is still not implemented. This field will be replaced with an organizer selection in the future.
                  </p>
                </div>
              </div>
            </div>

            {/* Country */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-base-content">
                Country <span className="text-error">*</span>
              </label>
              <div className="relative" ref={countryDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    ref={countryInputRef}
                    type="text"
                    placeholder="Search or select country"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.country ? 'border-error' : 'border-base-300'
                    } bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                    value={countrySearch || formData.country}
                    onChange={(e) => {
                      setCountrySearch(e.target.value);
                      setShowCountryDropdown(true);
                      if (errors.country) {
                        setErrors((prev) => ({ ...prev, country: '' }));
                      }
                    }}
                    onFocus={() => setShowCountryDropdown(true)}
                    required
                  />
                </div>
                {showCountryDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((country) => (
                        <button
                          key={country}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-base-200 transition-colors"
                          onClick={() => handleCountrySelect(country)}
                        >
                          {country}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-base-content/60 text-center">
                        This country is still not available in ArtChive.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.country && (
                <p className="text-error text-xs mt-1">{errors.country}</p>
              )}
            </div>

            {/* City */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-base-content">
                City <span className="text-error">*</span>
              </label>
              <div className="relative" ref={cityDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    ref={cityInputRef}
                    type="text"
                    placeholder={formData.country ? 'Search or select city' : 'Select country first'}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.city ? 'border-error' : 'border-base-300'
                    } bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                    value={citySearch || formData.city}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setShowCityDropdown(true);
                      if (errors.city) {
                        setErrors((prev) => ({ ...prev, city: '' }));
                      }
                    }}
                    onFocus={() => {
                      if (formData.country) {
                        setShowCityDropdown(true);
                      }
                    }}
                    disabled={!formData.country}
                    required
                  />
                </div>
                {showCityDropdown && formData.country && (
                  <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-base-200 transition-colors"
                          onClick={() => handleCitySelect(city)}
                        >
                          {city}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-base-content/60 text-center">
                        This city is still not available in ArtChive.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.city && (
                <p className="text-error text-xs mt-1">{errors.city}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-base-content">
                Start Date <span className="text-error">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="datetime-local"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.start_date ? 'border-error' : 'border-base-300'
                  } bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                  value={formData.start_date}
                  onChange={(e) => {
                    setFormData({ ...formData, start_date: e.target.value });
                    if (errors.start_date) {
                      setErrors((prev) => ({ ...prev, start_date: '' }));
                    }
                    // Clear end_date if it's before new start_date
                    if (formData.end_date && new Date(e.target.value) >= new Date(formData.end_date)) {
                      setFormData((prev) => ({ ...prev, end_date: '' }));
                    }
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>
              {errors.start_date && (
                <p className="text-error text-xs mt-1">{errors.start_date}</p>
              )}
            </div>

            {/* End Date */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-base-content">
                End Date <span className="text-error">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="datetime-local"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.end_date ? 'border-error' : 'border-base-300'
                  } bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
                  value={formData.end_date}
                  onChange={(e) => {
                    setFormData({ ...formData, end_date: e.target.value });
                    if (errors.end_date) {
                      setErrors((prev) => ({ ...prev, end_date: '' }));
                    }
                  }}
                  min={formData.start_date || new Date().toISOString().slice(0, 16)}
                  disabled={!formData.start_date}
                  required
                />
              </div>
              {errors.end_date && (
                <p className="text-error text-xs mt-1">{errors.end_date}</p>
              )}
            </div>
          </form>
        </div>

        {/* Modal Actions - Fixed at bottom */}
        <div className="px-6 py-4 bg-base-200 border-t border-base-300 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-base-300 bg-base-100 hover:bg-base-200 transition-colors font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="exhibit-form"
            className="px-4 py-2 rounded-lg bg-primary text-primary-content hover:bg-primary/90 transition-colors font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating...
              </>
            ) : (
              'Create Exhibit'
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  );
}

