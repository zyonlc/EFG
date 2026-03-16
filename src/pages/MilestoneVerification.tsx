import React, { useState, useEffect } from 'react';
import { AlertCircle, Camera, CheckCircle, Clock, MapPin, FileCheck, AlertTriangle, Loader } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGPS } from '../hooks/useGPS';
import { uploadToB2 } from '../lib/b2Upload';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Milestone {
  id: string;
  contract_id: string;
  milestone_name: string;
  percentage: number;
  amount_ugx: number;
  status: 'pending' | 'verified' | 'paid';
  due_date: string;
  zoho_invoice_id: string | null;
}

interface FieldVerification {
  id: string;
  milestone_id: string;
  task_name: string;
  photo_url: string;
  photo_timestamp: string;
  gps_coords: { latitude: number; longitude: number };
  gps_accuracy: number;
  verified_by: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  zoho_invoice_trigger: boolean;
}

interface Contract {
  id: string;
  client_name: string;
  total_amount: number;
  currency: string;
  status: string;
  site_location: { latitude: number; longitude: number };
}

export default function MilestoneVerification() {
  const { contractId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [verifications, setVerifications] = useState<FieldVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Mock data for demo
  useEffect(() => {
    setLoading(false);
    setContract({
      id: contractId || '1',
      client_name: 'Ministry of Health Uganda',
      total_amount: 500000000,
      currency: 'UGX',
      status: 'active',
      site_location: { latitude: 0.3476, longitude: 32.5825 }, // Kampala, Uganda
    });

    setMilestones([
      {
        id: '1',
        contract_id: contractId || '1',
        milestone_name: 'Materials Procurement & Delivery',
        percentage: 40,
        amount_ugx: 200000000,
        status: 'verified',
        due_date: '2024-09-15',
        zoho_invoice_id: 'INV-2024-001',
      },
      {
        id: '2',
        contract_id: contractId || '1',
        milestone_name: 'Installation Complete',
        percentage: 50,
        amount_ugx: 250000000,
        status: 'pending',
        due_date: '2024-10-15',
        zoho_invoice_id: null,
      },
      {
        id: '3',
        contract_id: contractId || '1',
        milestone_name: 'Final Inspection & Handover',
        percentage: 10,
        amount_ugx: 50000000,
        status: 'pending',
        due_date: '2024-11-15',
        zoho_invoice_id: null,
      },
    ]);

    setVerifications([
      {
        id: '1',
        milestone_id: '1',
        task_name: 'Delivery Note Signed',
        photo_url: 'https://via.placeholder.com/400x300',
        photo_timestamp: '2024-09-15T10:30:00Z',
        gps_coords: { latitude: 0.3476, longitude: 32.5825 },
        gps_accuracy: 15,
        verified_by: 'manager_1',
        verification_status: 'approved',
        rejection_reason: null,
        zoho_invoice_trigger: true,
      },
    ]);
  }, [contractId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      verified: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bg} ${config.text} text-sm font-semibold`}>
        <Icon className="w-4 h-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const calculateDaysLeft = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const daysLeft = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const calculateGPSDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  };

  const handlePhotoUpload = async (file: File, gpsCoords: { latitude: number; longitude: number }) => {
    if (!selectedMilestone || !contract) return;

    try {
      // Calculate distance from contract site
      const distance = calculateGPSDistance(
        contract.site_location.latitude,
        contract.site_location.longitude,
        gpsCoords.latitude,
        gpsCoords.longitude
      );

      const isValidLocation = distance < 100; // Must be within 100m of site

      // Create verification record
      const newVerification: FieldVerification = {
        id: `ver_${Date.now()}`,
        milestone_id: selectedMilestone.id,
        task_name: `Photo Evidence - ${selectedMilestone.milestone_name}`,
        photo_url: URL.createObjectURL(file),
        photo_timestamp: new Date().toISOString(),
        gps_coords: gpsCoords,
        gps_accuracy: 10,
        verified_by: null,
        verification_status: isValidLocation ? 'approved' : 'rejected',
        rejection_reason: isValidLocation ? null : 'GPS location outside contract site area',
        zoho_invoice_trigger: isValidLocation,
      };

      setVerifications([...verifications, newVerification]);

      // Auto-update milestone if approved
      if (isValidLocation && newVerification.verification_status === 'approved') {
        const updatedMilestones = milestones.map((m) =>
          m.id === selectedMilestone.id
            ? { ...m, status: 'verified' as const, zoho_invoice_id: `INV-2024-${Date.now()}` }
            : m
        );
        setMilestones(updatedMilestones);

        // Show success message
        alert('✅ Milestone Verified!\nInvoice auto-generated in Zoho Books.\nPayment request sent.');
      } else {
        alert('❌ Photo rejected.\n' + (newVerification.rejection_reason || 'Please upload from contract site.'));
      }

      // Close form immediately without spinner
      setShowUploadForm(false);
    } catch (error) {
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading milestones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Milestone Verification - {contract?.client_name}
          </h1>
          <p className="text-lg text-slate-600">
            Complete milestones with photo-locked proof of work. GPS verification required.
          </p>
        </div>

        {/* Contract Summary */}
        {contract && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Total Contract Value</p>
              <p className="text-2xl font-bold text-slate-900">
                UGX {(contract.total_amount / 1000000).toFixed(0)}M
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Contract Status</p>
              <p className="text-2xl font-bold text-green-600">Active</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Milestones Completed</p>
              <p className="text-2xl font-bold text-blue-600">{milestones.filter((m) => m.status !== 'pending').length}/{milestones.length}</p>
            </div>
          </div>
        )}

        {/* Milestones List */}
        <div className="space-y-6">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 transition"
            >
              {/* Milestone Header */}
              <div
                className="p-6 cursor-pointer hover:bg-slate-50"
                onClick={() =>
                  setSelectedMilestone(selectedMilestone?.id === milestone.id ? null : milestone)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{milestone.milestone_name}</h3>
                      {getStatusBadge(milestone.status)}
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold">{milestone.percentage}%</span> of contract
                      </div>
                      <div className="text-sm text-slate-600">
                        UGX <span className="font-semibold">{(milestone.amount_ugx / 1000000).toFixed(0)}M</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        Due:{' '}
                        <span className="font-semibold">
                          {new Date(milestone.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {milestone.status === 'verified' && (
                      <div className="text-green-600 font-semibold">
                        ✅ Invoice Generated<br />
                        <span className="text-sm">{milestone.zoho_invoice_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Milestone Details (Expanded) */}
              {selectedMilestone?.id === milestone.id && (
                <div className="border-t border-slate-200 p-6 bg-slate-50">
                  {/* Photo Verification */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">Photo Evidence</h4>

                    {verifications
                      .filter((v) => v.milestone_id === milestone.id)
                      .map((verification) => (
                        <div
                          key={verification.id}
                          className={`p-4 rounded-lg border-2 mb-4 ${
                            verification.verification_status === 'approved'
                              ? 'bg-green-50 border-green-300'
                              : 'bg-red-50 border-red-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {verification.verification_status === 'approved' ? (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              ) : (
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                              )}
                              <div>
                                <h5 className="font-semibold text-slate-900">{verification.task_name}</h5>
                                <p className="text-sm text-slate-600">
                                  {new Date(verification.photo_timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                verification.verification_status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {verification.verification_status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <MapPin className="w-4 h-4" />
                              <span>
                                GPS: {verification.gps_coords.latitude.toFixed(4)},
                                {verification.gps_coords.longitude.toFixed(4)}
                              </span>
                            </div>
                            {verification.rejection_reason && (
                              <div className="flex items-center gap-2 text-sm text-red-700 font-semibold">
                                <AlertCircle className="w-4 h-4" />
                                {verification.rejection_reason}
                              </div>
                            )}
                          </div>

                          {verification.photo_url && (
                            <img
                              src={verification.photo_url}
                              alt="Milestone proof"
                              className="mt-3 rounded-lg max-w-sm max-h-64 object-cover"
                            />
                          )}
                        </div>
                      ))}

                    {milestone.status !== 'verified' && !showUploadForm && (
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        Upload Photo Proof
                      </button>
                    )}

                    {/* Upload Form */}
                    {showUploadForm && selectedMilestone?.id === milestone.id && (
                      <PhotoLockUploadForm
                        onSubmit={handlePhotoUpload}
                        onCancel={() => setShowUploadForm(false)}
                      />
                    )}
                  </div>

                  {/* Payment Status */}
                  {milestone.status === 'verified' && (
                    <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        <div>
                          <h5 className="font-semibold text-green-900 mb-2">Milestone Verified ✅</h5>
                          <ul className="text-sm text-green-800 space-y-1">
                            <li>✅ Invoice generated in Zoho Books ({milestone.zoho_invoice_id})</li>
                            <li>✅ Payment request sent to client</li>
                            <li>
                              ✅ Estimated payment: UGX {(milestone.amount_ugx / 1000000).toFixed(0)}M
                            </li>
                            <li>⏱️ Estimated receipt: 3-5 business days</li>
                          </ul>
                          <button className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition">
                            View Invoice in Zoho
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Photo Upload Form Component
function PhotoLockUploadForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (file: File, gpsCoords: { latitude: number; longitude: number }) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { loading: gpsLoading, error: gpsError, coordinates, getCurrentLocation } = useGPS();
  const [file, setFile] = useState<File | null>(null);
  const [gpsCoords, setGpsCoords] = useState({ latitude: 0.3476, longitude: 32.5825 });
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGetLocation = async () => {
    const coords = await getCurrentLocation();
    if (coords) {
      setGpsCoords({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setLocalError(null);
    } else if (gpsError) {
      setLocalError(gpsError.message);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setLocalError('Please select a file');
      return;
    }

    setLocalError(null);

    try {
      // Upload file to B2
      const { publicUrl, error: uploadError } = await uploadToB2(
        file,
        `milestone-verification/${user?.id}`
      );

      if (uploadError) throw new Error(uploadError);

      // Save verification record to database
      const { error: dbError } = await supabase
        .from('field_verification')
        .insert([
          {
            task_name: `Photo Evidence - ${new Date().toLocaleDateString()}`,
            photo_url: publicUrl,
            photo_upload_timestamp: new Date().toISOString(),
            gps_latitude: gpsCoords.latitude,
            gps_longitude: gpsCoords.longitude,
            gps_accuracy_meters: 10,
            verification_status: 'pending',
          },
        ]);

      if (dbError) throw new Error(dbError.message);

      // Success - submit the form
      onSubmit(file, gpsCoords);
      setFile(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setLocalError(errorMsg);
    }
  };

  return (
    <div className="bg-white border-2 border-blue-300 rounded-lg p-6 mt-4">
      <h5 className="text-lg font-semibold text-slate-900 mb-4">Upload Photo Proof</h5>

      <div className="space-y-4">
        {/* Error Messages */}
        {(localError || gpsError) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{localError || gpsError?.message}</p>
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Photo File</label>
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="photo-input"
            />
            <label htmlFor="photo-input" className="cursor-pointer">
              <Camera className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
            </label>
          </div>
        </div>

        {/* GPS Coordinates */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">GPS Location</label>
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              placeholder="Latitude"
              value={gpsCoords.latitude}
              onChange={(e) => setGpsCoords({ ...gpsCoords, latitude: parseFloat(e.target.value) })}
              step="0.0001"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={gpsCoords.longitude}
              onChange={(e) => setGpsCoords({ ...gpsCoords, longitude: parseFloat(e.target.value) })}
              step="0.0001"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleGetLocation}
            disabled={gpsLoading}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gpsLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                📍 Get Current Location
              </>
            )}
          </button>
          {coordinates && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Location captured - Accuracy: {Math.round(coordinates.accuracy)}m
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || gpsCoords.latitude === 0}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            Verify & Upload
          </button>
        </div>
      </div>
    </div>
  );
}
