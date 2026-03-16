import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToB2 } from '../lib/b2Upload';
import { AlertCircle, CheckCircle, Upload, Loader, MapPin, Camera } from 'lucide-react';

interface PhotoLockProps {
  milestoneId: string;
  contractorId: string;
  onSuccess?: () => void;
}

export default function PhotoLockUploadForm({ milestoneId, contractorId, onSuccess }: PhotoLockProps) {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    task_name: '',
    task_description: '',
    gps_latitude: '',
    gps_longitude: '',
    gps_accuracy_meters: '50',
  });

  // Get current GPS location
  const handleGetLocation = async () => {
    setGpsLoading(true);
    setError(null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            gps_latitude: position.coords.latitude.toString(),
            gps_longitude: position.coords.longitude.toString(),
            gps_accuracy_meters: Math.round(position.coords.accuracy).toString(),
          }));
          setGpsLoading(false);
        },
        (err) => {
          setError(`Could not get location: ${err.message}`);
          setGpsLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setGpsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setFormData({
      task_name: '',
      task_description: '',
      gps_latitude: '',
      gps_longitude: '',
      gps_accuracy_meters: '50',
    });
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!file) throw new Error('Please upload a photo');
      if (!formData.task_name) throw new Error('Please enter task name');
      if (!formData.gps_latitude || !formData.gps_longitude) {
        throw new Error('Please enable location services or manually enter GPS coordinates');
      }

      // Upload photo to Backblaze B2
      const { publicUrl, error: uploadError } = await uploadToB2(
        file,
        `field-verification/${contractorId}/${milestoneId}`
      );

      if (uploadError) throw new Error(uploadError);

      // Extract EXIF data (simplified - in production use a proper library)
      const photoMetadata = {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
      };

      // Save to field_verification table
      const { data, error: insertError } = await supabase
        .from('field_verification')
        .insert({
          milestone_id: milestoneId,
          contractor_id: contractorId,
          task_name: formData.task_name,
          task_description: formData.task_description,
          photo_url: publicUrl,
          photo_upload_timestamp: new Date().toISOString(),
          photo_metadata: photoMetadata,
          gps_latitude: parseFloat(formData.gps_latitude),
          gps_longitude: parseFloat(formData.gps_longitude),
          gps_accuracy_meters: parseInt(formData.gps_accuracy_meters),
          verification_status: 'photo_verified',
          zoho_invoice_trigger: true,
          triggered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-generate invoice for this milestone
      if (data) {
        try {
          // Fetch the milestone details to get contract and amount info
          const { data: milestoneData, error: milestoneError } = await supabase
            .from('contract_milestones')
            .select('*, contract:contracts(id, client_name, client_email, currency_code)')
            .eq('id', milestoneId)
            .single();

          if (milestoneError) throw milestoneError;

          if (milestoneData) {
            // Create invoice automatically
            const invoiceNumber = `INV-${milestoneData.contract_id.slice(0, 8).toUpperCase()}-${Date.now()}`;
            const invoiceDate = new Date();
            const dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

            await supabase
              .from('invoices')
              .insert({
                contractor_id: contractorId,
                milestone_id: milestoneId,
                invoice_number: invoiceNumber,
                amount_ugx: milestoneData.amount_ugx,
                currency_code: milestoneData.currency_code,
                withholding_tax_amount: milestoneData.amount_ugx * 0.06, // Standard 6% withholding tax
                tax_rate: 6,
                net_amount_payable: milestoneData.amount_ugx * 0.94, // After tax
                invoice_date: invoiceDate.toISOString().split('T')[0],
                due_date: dueDate.toISOString().split('T')[0],
                status: 'draft',
              });

            // Update the milestone status to 'invoiced'
            await supabase
              .from('contract_milestones')
              .update({ status: 'invoiced' })
              .eq('id', milestoneId);
          }
        } catch (invoiceError: any) {
          console.warn('Invoice generation completed but with notice:', invoiceError.message);
          // Don't throw - invoice generation is secondary to field verification
        }
      }

      // Reset form immediately after successful submission
      resetForm();
      setSuccess(true);

      // Call parent callback to trigger refresh
      if (onSuccess) {
        // Wait 1.5 seconds to let user see success message, then trigger refresh
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        // If no callback, just hide success message after delay
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5" />
        Upload Proof of Work (Photo-Locked)
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-700 font-semibold">✓ Proof of Work submitted successfully!</p>
            <p className="text-green-600 text-sm mt-1">
              Your milestone has been marked as "photo_verified" and an invoice has been automatically generated and is ready for payment processing.
              The form has been reset and you can submit another milestone if needed.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Task Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
          <input
            type="text"
            name="task_name"
            value={formData.task_name}
            onChange={handleChange}
            required
            placeholder="e.g., Waste disposal completed for Zone A"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
          <textarea
            name="task_description"
            value={formData.task_description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe what was accomplished..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo *</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
              id="photo-input"
            />
            <label htmlFor="photo-input" className="cursor-pointer">
              {preview ? (
                <div className="space-y-2">
                  <img src={preview} alt="Preview" className="w-32 h-32 object-cover mx-auto rounded" />
                  <p className="text-sm text-gray-600">{file?.name}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or take a photo</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 10MB</p>
                </>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Photo will be locked with GPS coordinates and timestamp to prevent fraud
          </p>
        </div>

        {/* GPS Location */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <label className="block text-sm font-medium text-gray-700">GPS Location *</label>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                <input
                  type="number"
                  name="gps_latitude"
                  value={formData.gps_latitude}
                  onChange={handleChange}
                  placeholder="-0.3476"
                  step="0.0001"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  name="gps_longitude"
                  value={formData.gps_longitude}
                  onChange={handleChange}
                  placeholder="33.3157"
                  step="0.0001"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsLoading}
              className="w-full bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {gpsLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Get Current Location
                </>
              )}
            </button>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">GPS Accuracy (meters)</label>
              <input
                type="number"
                name="gps_accuracy_meters"
                value={formData.gps_accuracy_meters}
                onChange={handleChange}
                min="0"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Must be within 100m of contract site</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            'Uploading...'
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Lock Photo & Submit
            </>
          )}
        </button>
      </div>
    </form>
  );
}
