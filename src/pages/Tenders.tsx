import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, MapPin, Calendar, DollarSign, ChevronRight, Loader } from 'lucide-react';

interface Tender {
  id: string;
  client_name: string;
  client_type: 'government' | 'ngo' | 'private';
  description: string;
  budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  document_url: string;
  created_at: string;
}

export default function Tenders() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [filteredTenders, setFilteredTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBudgetRange, setSelectedBudgetRange] = useState<string>('all');

  useEffect(() => {
    fetchTenders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tenders, searchQuery, selectedType, selectedBudgetRange]);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenders(data || []);
    } catch (error) {
      console.error('Error fetching tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tenders];

    // Search by client name or description
    if (searchQuery) {
      filtered = filtered.filter(
        (tender) =>
          tender.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tender.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by client type
    if (selectedType !== 'all') {
      filtered = filtered.filter((tender) => tender.client_type === selectedType);
    }

    // Filter by budget range
    if (selectedBudgetRange !== 'all') {
      const [min, max] = selectedBudgetRange.split('-').map((v) => parseInt(v));
      filtered = filtered.filter((tender) =>
        max ? tender.budget >= min && tender.budget <= max : tender.budget >= min
      );
    }

    setFilteredTenders(filtered);
  };

  const formatCurrency = (amount: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getClientTypeBadge = (type: string) => {
    const styles = {
      government: 'bg-blue-100 text-blue-800',
      ngo: 'bg-green-100 text-green-800',
      private: 'bg-purple-100 text-purple-800',
    };
    return styles[type as keyof typeof styles] || styles.private;
  };

  const getDaysUntilDeadline = (endDate: string) => {
    const now = new Date();
    const deadline = new Date(endDate);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tender Opportunities</h1>
          <p className="text-slate-600">
            Browse and bid on government, NGO, and private sector contracts
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Tenders
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by client name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Client Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="government">Government</option>
                <option value="ngo">NGO</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Budget Range Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Budget Range
              </label>
              <select
                value={selectedBudgetRange}
                onChange={(e) => setSelectedBudgetRange(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Budgets</option>
                <option value="0-50000000">UGX 0 - 50M</option>
                <option value="50000000-100000000">UGX 50M - 100M</option>
                <option value="100000000-500000000">UGX 100M - 500M</option>
                <option value="500000000-9999999999">UGX 500M+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tenders List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading tenders...</p>
            </div>
          ) : filteredTenders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Filter className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">No tenders found matching your filters</p>
              <p className="text-slate-500 mt-2">Try adjusting your search criteria</p>
            </div>
          ) : (
            filteredTenders.map((tender) => {
              const daysLeft = getDaysUntilDeadline(tender.end_date);
              const isUrgent = daysLeft <= 7 && daysLeft > 0;
              const isExpired = daysLeft <= 0;

              return (
                <div
                  key={tender.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-500"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Main Info */}
                    <div className="md:col-span-2">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{tender.client_name}</h3>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${getClientTypeBadge(tender.client_type)}`}>
                            {tender.client_type.charAt(0).toUpperCase() + tender.client_type.slice(1)}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-sm mb-4">{tender.description}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-slate-600">
                          <Calendar size={16} className="mr-2 text-slate-400" />
                          <span>Start: {new Date(tender.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-slate-600">
                          <Calendar size={16} className="mr-2 text-slate-400" />
                          <span>End: {new Date(tender.end_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Budget and Action */}
                    <div className="md:col-span-1 flex flex-col justify-between">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Budget</p>
                        <p className="text-2xl font-bold text-blue-600 mb-3">
                          {formatCurrency(tender.budget, tender.currency)}
                        </p>

                        {/* Deadline Status */}
                        <div className="mb-4">
                          {isExpired ? (
                            <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                              Expired
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                              {daysLeft} days left
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                              {daysLeft} days left
                            </span>
                          )}
                        </div>
                      </div>

                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isExpired}
                      >
                        Submit Bid
                        <ChevronRight size={16} className="ml-2" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{filteredTenders.length}</p>
              <p className="text-slate-600 text-sm">Tenders Available</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(filteredTenders.reduce((sum, t) => sum + t.budget, 0))}
              </p>
              <p className="text-slate-600 text-sm">Total Opportunity Value</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-600">
                {filteredTenders.filter((t) => getDaysUntilDeadline(t.end_date) <= 7 && getDaysUntilDeadline(t.end_date) > 0).length}
              </p>
              <p className="text-slate-600 text-sm">Closing Soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
