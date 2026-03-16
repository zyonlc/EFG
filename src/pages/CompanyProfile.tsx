import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Loader, Edit2, Save, X } from 'lucide-react';

interface ContractorProfile {
  id: string;
  user_id: string;
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
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export default function CompanyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<Partial<ContractorProfile>>({});

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('contractor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setProfile(data);
      setFormData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'years_in_business' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: updateError } = await supabase
        .from('contractor_profiles')
        .update({
          company_name: formData.company_name,
          registration_number: formData.registration_number,
          company_type: formData.company_type,
          industry_category: formData.industry_category,
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email,
          company_description: formData.company_description,
          years_in_business: formData.years_in_business,
          market_code: formData.market_code,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile || {});
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center pt-20 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Profile Not Found</h2>
          <p className="text-gray-600">Please complete your contractor onboarding first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Company Profile</h1>
              <p className="text-gray-600">Manage your contractor profile and company information</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">Profile updated successfully</p>
              <p className="text-green-700 text-sm">Your changes have been saved</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Verification Status Banner */}
          <div
            className={`px-6 py-4 border-b ${
              profile.is_verified
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {profile.is_verified ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">Profile Verified</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800 font-medium">
                    Pending Verification - Your profile is under review
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="p-8">
            {editing ? (
              <form className="space-y-8">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Number *
                      </label>
                      <input
                        type="text"
                        name="registration_number"
                        value={formData.registration_number || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Type *
                      </label>
                      <select
                        name="company_type"
                        value={formData.company_type || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="works">Infrastructure/Construction (Works)</option>
                        <option value="services">Professional Services</option>
                        <option value="supplies">Supplies/Products</option>
                        <option value="mixed">Mixed Services</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industry Category *
                      </label>
                      <select
                        name="industry_category"
                        value={formData.industry_category || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        name="contact_person"
                        value={formData.contact_person || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Years in Business *
                      </label>
                      <input
                        type="number"
                        name="years_in_business"
                        value={formData.years_in_business || 0}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Market *</label>
                      <select
                        name="market_code"
                        value={formData.market_code || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UGX">Uganda (UGX)</option>
                        <option value="KES">Kenya (KES)</option>
                        <option value="NGN">Nigeria (NGN)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Description
                    </label>
                    <textarea
                      name="company_description"
                      value={formData.company_description || ''}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about your company and expertise..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-8">
                {/* Company Information View */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Company Name</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{profile.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Registration Number</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{profile.registration_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Company Type</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                        {profile.company_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Industry Category</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                        {profile.industry_category.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information View */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Contact Person</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{profile.contact_person}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Phone Number</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{profile.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Years in Business</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{profile.years_in_business}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information View */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Additional Information</h3>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Market</p>
                    <p className="text-lg font-semibold text-gray-900 mb-6">{profile.market_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Company Description</p>
                    <p className="text-gray-700 mt-2 leading-relaxed">
                      {profile.company_description || 'No description provided'}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Profile Created</p>
                      <p className="text-gray-700 mt-1">
                        {new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Last Updated</p>
                      <p className="text-gray-700 mt-1">
                        {new Date(profile.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
