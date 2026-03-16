import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader, Plus, FileText, DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import ContractCreationForm from '../components/ContractCreationForm';
import MilestoneCreationForm from '../components/MilestoneCreationForm';
import PhotoLockUploadForm from '../components/PhotoLockUploadForm';

interface Contract {
  id: string;
  contract_number: string;
  client_name: string;
  contract_amount: number;
  currency_code: string;
  contract_start_date: string;
  contract_end_date: string;
  status: string;
  milestones?: any[];
}

export default function Contracts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchContractorAndContracts();
    }
  }, [user]);

  const fetchContractorAndContracts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get contractor ID
      const { data: profileData, error: profileError } = await supabase
        .from('contractor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      setContractorId(profileData.id);

      // Get contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('contractor_id', profileData.id)
        .order('contract_start_date', { ascending: false });

      if (contractsError) throw contractsError;

      // Fetch milestones and their verifications for each contract
      const contractsWithMilestones = await Promise.all(
        (contractsData || []).map(async (contract) => {
          const { data: milestonesData } = await supabase
            .from('contract_milestones')
            .select('*')
            .eq('contract_id', contract.id)
            .order('milestone_number', { ascending: true });

          // For each milestone, fetch its field verifications
          const milestonesWithVerifications = await Promise.all(
            (milestonesData || []).map(async (milestone) => {
              const { data: verificationsData } = await supabase
                .from('field_verification')
                .select('*')
                .eq('milestone_id', milestone.id)
                .order('photo_upload_timestamp', { ascending: false })
                .limit(1);

              return {
                ...milestone,
                field_verification: verificationsData?.[0] || null,
              };
            })
          );

          return {
            ...contract,
            milestones: milestonesWithVerifications,
          };
        })
      );

      setContracts(contractsWithMilestones);
    } catch (err: any) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'invoiced':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'photo_verified':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const calculateContractProgress = (milestones: any[]) => {
    if (!milestones.length) return 0;
    const paid = milestones.filter(m => m.status === 'paid').length;
    return (paid / milestones.length) * 100;
  };

  // Show photo upload form FIRST - don't block with loading spinner
  if (showPhotoUpload && selectedMilestone && contractorId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowPhotoUpload(false)}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            ← Back
          </button>
          <PhotoLockUploadForm
            milestoneId={selectedMilestone.id}
            contractorId={contractorId}
            onSuccess={() => {
              // Refresh all contracts and milestones to reflect the field verification
              // This will update the milestone status and show the verification details
              fetchContractorAndContracts().then(() => {
                // After refresh, close the upload form and return to contract details
                setShowPhotoUpload(false);
              });
            }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your contracts...</p>
        </div>
      </div>
    );
  }

  if (showCreateForm && contractorId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowCreateForm(false)}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            ← Back to Contracts
          </button>
          <ContractCreationForm
            contractorId={contractorId}
            onSuccess={() => {
              setShowCreateForm(false);
              fetchContractorAndContracts();
            }}
          />
        </div>
      </div>
    );
  }

  if (selectedContract && !showMilestoneForm && !showPhotoUpload) {
    const progress = calculateContractProgress(selectedContract.milestones || []);
    const totalPaid = (selectedContract.milestones || [])
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + (m.amount_ugx || 0), 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setSelectedContract(null)}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            ← Back to Contracts
          </button>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedContract.contract_number}</h1>
                <p className="text-gray-600">{selectedContract.client_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Contract Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedContract.currency_code} {selectedContract.contract_amount.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full font-semibold ${getStatusColor(selectedContract.status)}`}>
                  {selectedContract.status.charAt(0).toUpperCase() + selectedContract.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Contract Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">Contract Progress</h3>
                <span className="text-sm font-bold text-blue-600">{progress.toFixed(0)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Amount Paid: {selectedContract.currency_code} {totalPaid.toLocaleString()}
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Start Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(selectedContract.contract_start_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">End Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(selectedContract.contract_end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Milestones</h2>
              <button
                onClick={() => setShowMilestoneForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>

            {(selectedContract.milestones || []).length > 0 ? (
              <div className="space-y-4">
                {selectedContract.milestones?.map((milestone, idx) => (
                  <div key={milestone.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        {getMilestoneStatusIcon(milestone.status)}
                        <div>
                          <h4 className="font-semibold text-gray-800">{milestone.milestone_name}</h4>
                          <p className="text-sm text-gray-600">{milestone.description}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold px-3 py-1 rounded ${
                        milestone.status === 'paid' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                        milestone.status === 'photo_verified' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {milestone.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Amount</p>
                        <p className="font-semibold text-gray-800">
                          {milestone.currency_code} {milestone.amount_ugx?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Percentage</p>
                        <p className="font-semibold text-gray-800">{milestone.percentage_of_contract}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Due Date</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(milestone.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Field Verification Status */}
                    {milestone.field_verification && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-2">✓ Proof of Work Submitted</p>
                        <div className="space-y-1 text-xs text-blue-800">
                          <p><strong>Task:</strong> {milestone.field_verification.task_name}</p>
                          <p><strong>Status:</strong> <span className="capitalize">{milestone.field_verification.verification_status}</span></p>
                          <p><strong>Submitted:</strong> {new Date(milestone.field_verification.photo_upload_timestamp).toLocaleString()}</p>
                          {milestone.field_verification.photo_url && (
                            <a
                              href={milestone.field_verification.photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              📸 View uploaded photo
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upload Button - Show if no verification or if status is pending/rejected */}
                    {(!milestone.field_verification || milestone.field_verification.verification_status === 'rejected') && (
                      <button
                        onClick={() => {
                          setSelectedMilestone(milestone);
                          setShowPhotoUpload(true);
                        }}
                        className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        {milestone.field_verification ? '📤 Resubmit Proof of Work' : '📤 Upload Proof of Work'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No milestones yet. Add one to get started.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showMilestoneForm && selectedContract && contractorId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowMilestoneForm(false)}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            ← Back
          </button>
          <MilestoneCreationForm
            contractId={selectedContract.id}
            contractAmount={selectedContract.contract_amount}
            onSuccess={() => {
              setShowMilestoneForm(false);
              fetchContractorAndContracts();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">My Contracts</h1>
            <p className="text-gray-600 mt-2">Manage all your active and completed contracts</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg text-white rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            New Contract
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Contracts Grid */}
        {contracts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contracts.map((contract) => {
              const progress = calculateContractProgress(contract.milestones || []);
              return (
                <div
                  key={contract.id}
                  onClick={() => setSelectedContract(contract)}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition cursor-pointer p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800">{contract.contract_number}</h3>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4">{contract.client_name}</p>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {contract.currency_code} {contract.contract_amount.toLocaleString()}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-1">Progress</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}% • {contract.milestones?.length || 0} milestones</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(contract.contract_start_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {contract.milestones?.filter(m => m.status === 'paid').length || 0}/{contract.milestones?.length || 0} paid
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 bg-white rounded-lg border-2 border-dashed border-gray-300 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Contracts Yet</h3>
            <p className="text-gray-600 mb-6">Create your first contract to start tracking work</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Create Contract
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
