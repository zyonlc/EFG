import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToB2 } from '../lib/b2Upload';
import { AlertCircle, CheckCircle, Upload, Loader } from 'lucide-react';

interface DocumentUploadProps {
  contractorId: string;
  onSuccess?: () => void;
}

export default function ComplianceDocumentUpload({ contractorId, onSuccess }: DocumentUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    reminder_type: 'tax_clearance',
    document_name: 'Tax Clearance Certificate',
    expiry_date: '',
    market_code: 'UGX',
  });
  const [file, setFile] = useState<File | null>(null);

  const documentTypes = [
    { value: 'tax_clearance', label: 'Tax Clearance Certificate', expires: 12 },
    { value: 'nssf', label: 'NSSF Clearance', expires: 1 },
    { value: 'trading_license', label: 'Trading License', expires: 12 },
    { value: 'business_registration', label: 'Business Registration', expires: 36 },
    { value: 'insurance', label: 'Insurance Certificate', expires: 12 },
    { value: 'audit_report', label: 'Audit Report', expires: 12 },
  ];

  const handleDocTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = documentTypes.find(d => d.value === e.target.value);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        reminder_type: selected.value,
        document_name: selected.label,
      }));
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, expiry_date: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expiry_date) {
      setError('Please select expiry date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let documentUrl = null;

      // Upload file to Backblaze B2 if provided
      if (file) {
        const { publicUrl, error: uploadError } = await uploadToB2(
          file,
          `compliance-documents/${contractorId}`
        );

        if (uploadError) throw new Error(uploadError);
        documentUrl = publicUrl;
      }

      // Save to tax_reminders table
      const { error: insertError } = await supabase
        .from('tax_reminders')
        .insert({
          contractor_id: contractorId,
          market_code: formData.market_code,
          reminder_type: formData.reminder_type,
          document_name: formData.document_name,
          expiry_date: formData.expiry_date,
          document_url: documentUrl,
          status: 'ok',
          auto_reminder_enabled: true,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        reminder_type: 'tax_clearance',
        document_name: 'Tax Clearance Certificate',
        expiry_date: '',
        market_code: 'UGX',
      });
      setFile(null);

      if (onSuccess) onSuccess();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Compliance Document</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 font-semibold">Document uploaded successfully!</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Document Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
          <select
            value={formData.reminder_type}
            onChange={handleDocTypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {documentTypes.map(doc => (
              <option key={doc.value} value={doc.value}>{doc.label}</option>
            ))}
          </select>
        </div>

        {/* Expiry Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
          <input
            type="date"
            value={formData.expiry_date}
            onChange={handleExpiryChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            You will receive alerts 30 and 7 days before expiry
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Document (PDF/Image)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Add Document'
          )}
        </button>
      </div>
    </form>
  );
}
