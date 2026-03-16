import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface ContractorFormData {
  company_name: string;
  registration_number: string;
  company_type: string;
  industry_category: string;
  contact_person: string;
  phone: string;
  email: string;
  company_description: string;
  years_in_business: number;
  market_code: string;
}

export default function ContractorOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<ContractorFormData>({
    company_name: '',
    registration_number: '',
    company_type: 'services',
    industry_category: 'project_management',
    contact_person: '',
    phone: '',
    email: user?.email || '',
    company_description: '',
    years_in_business: 1,
    market_code: 'UGX',
  });

  useEffect(() => {
    // Check if contractor profile already exists
    if (user) {
      checkExistingProfile();
    }
  }, [user]);

  const checkExistingProfile = async () => {
    try {
      const { data } = await supabase
        .from('contractor_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      setProfileExists(!!data);

      // If profile already exists, redirect to dashboard
      if (data) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Error checking profile:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'years_in_business' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('contractor_profiles')
        .upsert(
          {
            user_id: user.id,
            ...formData,
            is_verified: false,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (insertError) throw insertError;

      // Show success message only for new profiles
      if (!profileExists) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Created!</h2>
          <p className="text-gray-600 mb-6">Your contractor profile is ready. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Setup Your Contractor Profile</h1>
          <p className="text-gray-600 mb-8">Complete your company information to start bidding on tenders</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pro Empo Consults Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                <input
                  type="text"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="REG-2024-001"
                />
              </div>
            </div>

            {/* Company Type & Industry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Type *</label>
                <select
                  name="company_type"
                  value={formData.company_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="works">Infrastructure/Construction (Works)</option>
                  <option value="services">Professional Services</option>
                  <option value="supplies">Supplies/Products</option>
                  <option value="mixed">Mixed Services</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry Category *</label>
                <select
                  name="industry_category"
                  value={formData.industry_category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="project_management">Project Management</option>
                  <option value="construction">Construction</option>
                  <option value="logistics">Logistics</option>
                  <option value="it_services">IT Services</option>
                  <option value="medical_supplies">Medical Supplies</option>
                  <option value="equipment_rental">Equipment Rental</option>
                  <option value="consulting">Consulting</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Contact Person & Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Mukasa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+256 701 234567"
                />
              </div>
            </div>

            {/* Years in Business & Market */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business *</label>
                <input
                  type="number"
                  name="years_in_business"
                  value={formData.years_in_business}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market *</label>
                <select
                  name="market_code"
                  value={formData.market_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UGX">Uganda (UGX)</option>
                  <option value="KES">Kenya (KES)</option>
                  <option value="NGN">Nigeria (NGN)</option>
                </select>
              </div>
            </div>

            {/* Company Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
              <textarea
                name="company_description"
                value={formData.company_description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about your company and expertise..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Create Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
