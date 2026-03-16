import React, { useState } from 'react';
import { Search, MapPin, Briefcase, Star, Users, MessageCircle, UserCheck, Filter } from 'lucide-react';

interface ContractorProfile {
  id: string;
  company_name: string;
  industry: string;
  location: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  description: string;
  completedProjects: number;
  isFollowing: boolean;
  isConnected: boolean;
  avatarUrl?: string;
}

export default function ProfessionalDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ContractorProfile | null>(null);
  const [messageText, setMessageText] = useState('');

  // Mock contractor data
  const [contractors] = useState<ContractorProfile[]>([
    {
      id: '1',
      company_name: 'BuildTech Solutions',
      industry: 'Construction',
      location: 'Kampala, Uganda',
      rating: 4.8,
      reviewCount: 24,
      specialties: ['Infrastructure', 'Civil Works', 'Project Management'],
      description: 'Leading construction firm with 10+ years experience in government and NGO contracts',
      completedProjects: 47,
      isFollowing: false,
      isConnected: false,
    },
    {
      id: '2',
      company_name: 'MediSupply East Africa',
      industry: 'Healthcare Supplies',
      location: 'Nairobi, Kenya',
      rating: 4.6,
      reviewCount: 18,
      specialties: ['Medical Equipment', 'Pharmaceuticals', 'Logistics'],
      description: 'Certified supplier of medical equipment to hospitals and NGOs across East Africa',
      completedProjects: 32,
      isFollowing: true,
      isConnected: true,
    },
    {
      id: '3',
      company_name: 'ProEngineering Consultants',
      industry: 'Engineering',
      location: 'Lagos, Nigeria',
      rating: 4.9,
      reviewCount: 31,
      specialties: ['Electrical', 'Mechanical', 'Quality Assurance'],
      description: 'Professional engineering services for industrial and commercial projects',
      completedProjects: 56,
      isFollowing: false,
      isConnected: false,
    },
    {
      id: '4',
      company_name: 'Urban Logistics Corp',
      industry: 'Logistics',
      location: 'Kampala, Uganda',
      rating: 4.5,
      reviewCount: 15,
      specialties: ['Freight', 'Warehousing', 'Distribution'],
      description: 'Complete logistics solutions with real-time tracking and professional drivers',
      completedProjects: 38,
      isFollowing: false,
      isConnected: false,
    },
  ]);

  const INDUSTRIES = ['All', 'Construction', 'Healthcare Supplies', 'Engineering', 'Logistics', 'IT Services'];
  const LOCATIONS = ['All', 'Kampala, Uganda', 'Nairobi, Kenya', 'Lagos, Nigeria', 'Accra, Ghana'];

  const filteredContractors = contractors.filter((contractor) => {
    const matchesSearch =
      contractor.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesIndustry = selectedIndustry === '' || selectedIndustry === 'All' || contractor.industry === selectedIndustry;
    const matchesLocation = selectedLocation === '' || selectedLocation === 'All' || contractor.location === selectedLocation;

    return matchesSearch && matchesIndustry && matchesLocation;
  });

  const handleSendMessage = (contractor: ContractorProfile) => {
    setSelectedProfile(contractor);
    setShowMessageModal(true);
  };

  const handleSubmitMessage = () => {
    if (messageText.trim()) {
      alert(`Message sent to ${selectedProfile?.company_name}:\n"${messageText}"`);
      setMessageText('');
      setShowMessageModal(false);
    }
  };

  const handleConnect = (contractor: ContractorProfile) => {
    alert(`Connection request sent to ${contractor.company_name}`);
  };

  const handleFollow = (contractor: ContractorProfile) => {
    alert(`Now following ${contractor.company_name}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Professional Directory</h1>
          <p className="text-lg text-slate-600">
            Connect with verified contractors, suppliers, and service providers across East Africa
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by company name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Industry
              </label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry === 'All' ? '' : industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LOCATIONS.map((location) => (
                  <option key={location} value={location === 'All' ? '' : location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">View</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Showing {filteredContractors.length} result{filteredContractors.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContractors.map((contractor) => (
              <div key={contractor.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-24" />

                {/* Content */}
                <div className="p-6">
                  {/* Company Name */}
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{contractor.company_name}</h3>
                  <p className="text-sm text-slate-600 mb-3">{contractor.industry}</p>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {contractor.location}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(contractor.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {contractor.rating} ({contractor.reviewCount} reviews)
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 py-3 border-t border-b border-slate-200">
                    <div className="text-center flex-1">
                      <p className="text-sm text-slate-600">Completed</p>
                      <p className="text-lg font-bold text-slate-900">{contractor.completedProjects}</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-sm text-slate-600">Specialties</p>
                      <p className="text-lg font-bold text-slate-900">{contractor.specialties.length}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 my-3">{contractor.description}</p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {contractor.specialties.slice(0, 2).map((specialty) => (
                      <span key={specialty} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                        {specialty}
                      </span>
                    ))}
                    {contractor.specialties.length > 2 && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                        +{contractor.specialties.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSendMessage(contractor)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={() => handleConnect(contractor)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      Connect
                    </button>
                  </div>

                  {/* Follow Button */}
                  <button
                    onClick={() => handleFollow(contractor)}
                    className="w-full mt-2 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:border-slate-400 transition"
                  >
                    {contractor.isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredContractors.map((contractor) => (
              <div key={contractor.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{contractor.company_name}</h3>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                        {contractor.industry}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {contractor.location}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(contractor.rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {contractor.rating} ({contractor.reviewCount} reviews)
                      </span>
                      <span className="text-sm text-slate-600">•</span>
                      <span className="text-sm text-slate-600">{contractor.completedProjects} projects completed</span>
                    </div>

                    <p className="text-sm text-slate-600 mb-2">{contractor.description}</p>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-2">
                      {contractor.specialties.map((specialty) => (
                        <span key={specialty} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleSendMessage(contractor)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={() => handleConnect(contractor)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap"
                    >
                      <UserCheck className="w-4 h-4" />
                      Connect
                    </button>
                    <button className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:border-slate-400 transition whitespace-nowrap">
                      {contractor.isFollowing ? '✓ Following' : '+ Follow'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredContractors.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No contractors found</h3>
            <p className="text-slate-600">Try adjusting your search filters</p>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Send Message</h3>
            <p className="text-slate-600 mb-6">
              Message to <span className="font-semibold">{selectedProfile.company_name}</span>
            </p>

            <textarea
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMessage}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
