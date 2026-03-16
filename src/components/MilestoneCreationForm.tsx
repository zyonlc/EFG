import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Loader, Edit2, X, Save } from 'lucide-react';

interface MilestoneFormProps {
  contractId: string;
  contractAmount: number;
  onSuccess?: () => void;
}

export default function MilestoneCreationForm({ contractId, contractAmount, onSuccess }: MilestoneFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const [formData, setFormData] = useState({
    milestone_name: '',
    percentage_of_contract: '',
    description: '',
    due_date: '',
    milestone_budget: '',
  });

  const [editFormData, setEditFormData] = useState({
    milestone_name: '',
    description: '',
    due_date: '',
    milestone_budget: '',
  });

  // Fetch existing milestones
  useEffect(() => {
    fetchMilestones();
  }, [contractId]);

  const fetchMilestones = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('contract_milestones')
        .select('*')
        .eq('contract_id', contractId)
        .order('milestone_number', { ascending: true });

      if (fetchError) throw fetchError;

      setMilestones(data || []);
      const total = (data || []).reduce((sum, m) => sum + (m.percentage_of_contract || 0), 0);
      setTotalPercentage(total);
    } catch (err: any) {
      console.error('Error fetching milestones:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'percentage_of_contract' ? parseFloat(value) || '' : value,
    }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const startEdit = (milestone: any) => {
    setEditingId(milestone.id);
    setEditFormData({
      milestone_name: milestone.milestone_name,
      description: milestone.description || '',
      due_date: milestone.due_date,
      milestone_budget: milestone.milestone_budget || '',
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({ milestone_name: '', description: '', due_date: '', milestone_budget: '' });
    setEditError(null);
  };

  const saveEdit = async (milestoneId: string) => {
    setEditError(null);

    try {
      if (!editFormData.milestone_name) {
        throw new Error('Milestone name is required');
      }
      if (!editFormData.due_date) {
        throw new Error('Due date is required');
      }

      const { error: updateError } = await supabase
        .from('contract_milestones')
        .update({
          milestone_name: editFormData.milestone_name,
          description: editFormData.description,
          due_date: editFormData.due_date,
          milestone_budget: editFormData.milestone_budget ? parseFloat(editFormData.milestone_budget) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestoneId);

      if (updateError) throw updateError;

      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setEditingId(null);
        fetchMilestones();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update milestone');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const percentage = parseFloat(formData.percentage_of_contract as any);

      if (totalPercentage + percentage > 100) {
        throw new Error(`Total percentage (${totalPercentage + percentage}%) cannot exceed 100%`);
      }

      const amount = contractAmount * (percentage / 100);

      const { error: insertError } = await supabase
        .from('contract_milestones')
        .insert({
          contract_id: contractId,
          milestone_number: milestones.length + 1,
          milestone_name: formData.milestone_name,
          percentage_of_contract: percentage,
          amount_ugx: amount,
          currency_code: 'UGX',
          description: formData.description,
          due_date: formData.due_date,
          milestone_budget: formData.milestone_budget ? parseFloat(formData.milestone_budget) : null,
          milestone_budget_currency: 'UGX',
          status: 'pending',
          is_editable: true,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        milestone_name: '',
        percentage_of_contract: '',
        description: '',
        due_date: '',
        milestone_budget: '',
      });

      setTimeout(() => {
        setSuccess(false);
        fetchMilestones();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Milestone</h3>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 font-semibold">Milestone created successfully!</p>
          </div>
        )}

        {/* Progress */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">{totalPercentage}%</span> of contract allocated to milestones
          </p>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name *</label>
            <input
              type="text"
              name="milestone_name"
              value={formData.milestone_name}
              onChange={handleChange}
              required
              placeholder="e.g., Mobilization & Setup"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Percentage of Contract * (Remaining: {100 - totalPercentage}%)
              </label>
              <input
                type="number"
                name="percentage_of_contract"
                value={formData.percentage_of_contract}
                onChange={handleChange}
                required
                min="1"
                max={100 - totalPercentage}
                step="0.5"
                placeholder="20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Amount</label>
              <input
                type="text"
                disabled
                value={
                  formData.percentage_of_contract
                    ? `UGX ${(contractAmount * (parseFloat(formData.percentage_of_contract as any) / 100)).toLocaleString()}`
                    : 'UGX 0'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated based on contract percentage</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Budget (Optional)</label>
            <input
              type="number"
              name="milestone_budget"
              value={formData.milestone_budget}
              onChange={handleChange}
              placeholder="How much do you plan to spend executing this milestone?"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">The actual budget for executing this milestone (different from billing amount)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe what needs to be delivered for this milestone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || 100 - totalPercentage <= 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Add Milestone'
            )}
          </button>
        </div>
      </form>

      {/* Milestones List */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Existing Milestones</h4>
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                {editingId === milestone.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    {editError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{editError}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name *</label>
                      <input
                        type="text"
                        name="milestone_name"
                        value={editFormData.milestone_name}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                      <input
                        type="date"
                        name="due_date"
                        value={editFormData.due_date}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Budget (Optional)</label>
                      <input
                        type="number"
                        name="milestone_budget"
                        value={editFormData.milestone_budget}
                        onChange={handleEditChange}
                        placeholder="Actual budget for executing this milestone"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={editFormData.description}
                        onChange={handleEditChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(milestone.id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-gray-800">{milestone.milestone_name}</h5>
                      <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {milestone.percentage_of_contract}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                      <div>
                        <p className="text-gray-500">Contract Amount</p>
                        <p className="font-semibold text-gray-800">UGX {milestone.amount_ugx?.toLocaleString()}</p>
                      </div>
                      {milestone.milestone_budget && (
                        <div>
                          <p className="text-gray-500">Project Budget</p>
                          <p className="font-semibold text-gray-800">UGX {parseFloat(milestone.milestone_budget).toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-semibold text-gray-800">{new Date(milestone.due_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className={`font-medium ${
                          milestone.status === 'pending' ? 'text-yellow-600' :
                          milestone.status === 'paid' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    {milestone.is_editable !== false && (
                      <button
                        onClick={() => startEdit(milestone)}
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Milestone
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
