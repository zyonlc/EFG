import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToB2 } from '../lib/b2Upload';
import { AlertCircle, CheckCircle, Loader, Upload, File, X } from 'lucide-react';

interface ContractFormProps {
  contractorId: string;
  onSuccess?: (contractId: string) => void;
}

export default function ContractCreationForm({ contractorId, onSuccess }: ContractFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractDocumentUrl, setContractDocumentUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    contract_number: '',
    client_name: '',
    client_contact_person: '',
    client_email: '',
    contract_amount: '',
    currency_code: 'UGX',
    contract_start_date: '',
    contract_end_date: '',
    status: 'active',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setContractFile(file);
      setError(null);
    }
  };

  const uploadContractDocument = async () => {
    if (!contractFile) return;

    setUploading(true);
    setError(null);

    try {
      const fileName = `contracts/${contractorId}`;
      const { publicUrl, error: uploadError } = await uploadToB2(contractFile, fileName);

      if (uploadError) {
        setError(`Failed to upload document: ${uploadError}`);
        setUploading(false);
        return;
      }

      if (!publicUrl) {
        setError('No URL returned from upload. Please try again.');
        setUploading(false);
        return;
      }

      // Store only the publicUrl string, not the entire response object
      setContractDocumentUrl(publicUrl);
      setUploadProgress(0);
    } catch (err: any) {
      setError(`Failed to upload document: ${err.message}`);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const removeContractDocument = () => {
    setContractFile(null);
    setContractDocumentUrl(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.contract_number || !formData.client_name || !formData.contract_amount) {
        throw new Error('Please fill in all required fields');
      }

      // Calculate retention (5% of contract)
      const amount = parseFloat(formData.contract_amount);
      const retentionAmount = amount * 0.05;

      const { data, error: insertError } = await supabase
        .from('contracts')
        .insert({
          contractor_id: contractorId,
          contract_number: formData.contract_number,
          client_name: formData.client_name,
          client_contact_person: formData.client_contact_person,
          client_email: formData.client_email,
          contract_amount: amount,
          currency_code: formData.currency_code,
          contract_start_date: formData.contract_start_date,
          contract_end_date: formData.contract_end_date,
          retention_amount: retentionAmount,
          contract_document_url: contractDocumentUrl || null,
          status: formData.status,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      if (onSuccess && data) {
        setTimeout(() => onSuccess(data.id), 1500);
      }

      // Reset form
      setFormData({
        contract_number: '',
        client_name: '',
        client_contact_person: '',
        client_email: '',
        contract_amount: '',
        currency_code: 'UGX',
        contract_start_date: '',
        contract_end_date: '',
        status: 'active',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Contract</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 font-semibold">Contract created successfully!</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number *</label>
            <input
              type="text"
              name="contract_number"
              value={formData.contract_number}
              onChange={handleChange}
              required
              placeholder="CTR-2024-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input
              type="text"
              name="client_name"
              value={formData.client_name}
              onChange={handleChange}
              required
              placeholder="KCCA - Waste Management"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input
              type="text"
              name="client_contact_person"
              value={formData.client_contact_person}
              onChange={handleChange}
              placeholder="Ms. Sarah Nakayaga"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
            <input
              type="email"
              name="client_email"
              value={formData.client_email}
              onChange={handleChange}
              placeholder="sarah@kcca.go.ug"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Amount *</label>
            <input
              type="number"
              name="contract_amount"
              value={formData.contract_amount}
              onChange={handleChange}
              required
              placeholder="100000000"
              min="0"
              step="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              name="currency_code"
              value={formData.currency_code}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="UGX">Uganda (UGX)</option>
              <option value="KES">Kenya (KES)</option>
              <option value="NGN">Nigeria (NGN)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              name="contract_start_date"
              value={formData.contract_start_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
            <input
              type="date"
              name="contract_end_date"
              value={formData.contract_end_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Contract Document Upload Section */}
        <div className="border-t pt-4 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Contract Document (Optional)</label>
          <p className="text-xs text-gray-500 mb-3">Upload a signed/scanned copy of the contract for reference. You can also upload it later.</p>

          {!contractDocumentUrl ? (
            <div>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.png"
                className="hidden"
                id="contract-file-input"
              />
              <label
                htmlFor="contract-file-input"
                className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {contractFile ? contractFile.name : 'Drag contract here or click to select'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG up to 50MB</p>
                </div>
              </label>

              {contractFile && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={uploadContractDocument}
                    disabled={uploading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Uploading... {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Document
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractFile(null)}
                    className="px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {uploading && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Contract document uploaded</p>
                  <p className="text-xs text-green-700">{contractFile?.name || 'Document'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeContractDocument}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Contract'
          )}
        </button>
      </div>
    </form>
  );
}
