import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { zohoBooksService } from '../lib/zohoBooksService';

export interface FieldVerificationData {
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
  zoho_invoice_id: string | null;
}

interface Contract {
  site_location: { latitude: number; longitude: number };
}

export function usePhotoLockVerification() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance between two GPS coordinates
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
    },
    []
  );

  // Upload photo to Supabase Storage
  const uploadPhoto = useCallback(
    async (file: File, milestoneId: string): Promise<string> => {
      try {
        const fileName = `${user?.id}/${milestoneId}/${Date.now()}-${file.name}`;

        const { data, error: uploadError } = await supabase.storage
          .from('field-verification-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('field-verification-photos')
          .getPublicUrl(fileName);

        return urlData.publicUrl;
      } catch (err) {
        throw new Error(`Photo upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },
    [user]
  );

  // Create field verification record
  const createFieldVerification = useCallback(
    async (
      milestoneId: string,
      photoUrl: string,
      gpsCoords: { latitude: number; longitude: number },
      taskName: string,
      contractSiteLocation: { latitude: number; longitude: number }
    ): Promise<FieldVerificationData> => {
      try {
        if (!user) throw new Error('User not authenticated');

        // Validate GPS location (must be within 100m of contract site)
        const distance = calculateDistance(
          contractSiteLocation.latitude,
          contractSiteLocation.longitude,
          gpsCoords.latitude,
          gpsCoords.longitude
        );

        const isValidLocation = distance < 100;
        const status = isValidLocation ? 'approved' : 'rejected';
        const rejectionReason = isValidLocation
          ? null
          : `GPS location ${Math.round(distance)}m away from contract site (max: 100m)`;

        // Create verification record
        const { data, error } = await supabase
          .from('field_verification')
          .insert({
            milestone_id: milestoneId,
            task_name: taskName,
            evidence_url: photoUrl,
            gps_coords: gpsCoords,
            gps_accuracy: 10,
            timestamp: new Date().toISOString(),
            is_verified: isValidLocation,
            verification_status: status,
            rejection_reason: rejectionReason,
            auto_invoice_trigger: isValidLocation,
          })
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          milestone_id: data.milestone_id,
          task_name: data.task_name,
          photo_url: data.evidence_url,
          photo_timestamp: data.timestamp,
          gps_coords: data.gps_coords,
          gps_accuracy: data.gps_accuracy,
          verified_by: null,
          verification_status: status,
          rejection_reason: rejectionReason,
          zoho_invoice_trigger: isValidLocation,
          zoho_invoice_id: null,
        };
      } catch (err) {
        throw new Error(
          `Verification creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [user, calculateDistance]
  );

  // Trigger Zoho Books invoice creation (called when milestone is verified)
  const triggerZohoInvoice = useCallback(
    async (
      milestoneId: string,
      contractData: {
        id: string;
        client_name: string;
        total_amount: number;
        currency: string;
      },
      milestoneData: {
        milestone_name: string;
        percentage: number;
        amount_ugx: number;
      }
    ): Promise<string> => {
      try {
        if (!user) throw new Error('User not authenticated');

        // Create invoice in Zoho Books
        const invoiceResponse = await zohoBooksService.createInvoice({
          customer_name: contractData.client_name,
          invoice_number: `INVOICE-${milestoneId}-${Date.now()}`,
          reference_number: contractData.id,
          date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          line_items: [
            {
              description: `${milestoneData.milestone_name} (${milestoneData.percentage}%)`,
              quantity: 1,
              unit: milestoneData.amount_ugx.toString(),
              account_id: 'contract-milestone',
            },
          ],
          notes: `Milestone verification completed via Empowise Photo-Lock System\nPhoto evidence verified with GPS coordinates`,
          tax_treatment: 'subject_to_tax',
        });

        // Update field_verification record with invoice ID
        const { error: updateError } = await supabase
          .from('field_verification')
          .update({ linked_invoice_id: invoiceResponse.invoice_id })
          .eq('milestone_id', milestoneId);

        if (updateError) throw updateError;

        // Update milestone status
        const { error: milestoneError } = await supabase
          .from('contract_milestones')
          .update({ status: 'verified', zoho_invoice_id: invoiceResponse.invoice_id })
          .eq('id', milestoneId);

        if (milestoneError) throw milestoneError;

        return invoiceResponse.invoice_id;
      } catch (err) {
        throw new Error(
          `Zoho invoice creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [user]
  );

  // Complete workflow: Upload photo → Verify → Create invoice
  const processFieldVerification = useCallback(
    async (
      file: File,
      milestoneId: string,
      taskName: string,
      gpsCoords: { latitude: number; longitude: number },
      contractData: {
        id: string;
        client_name: string;
        total_amount: number;
        currency: string;
        site_location: { latitude: number; longitude: number };
      },
      milestoneData: {
        milestone_name: string;
        percentage: number;
        amount_ugx: number;
      }
    ): Promise<{ verification: FieldVerificationData; invoiceId?: string }> => {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Upload photo
        const photoUrl = await uploadPhoto(file, milestoneId);

        // Step 2: Create verification record
        const verification = await createFieldVerification(
          milestoneId,
          photoUrl,
          gpsCoords,
          taskName,
          contractData.site_location
        );

        // Step 3: If verification approved, create Zoho invoice
        let invoiceId: string | undefined;
        if (verification.zoho_invoice_trigger) {
          invoiceId = await triggerZohoInvoice(milestoneId, contractData, milestoneData);
        }

        return {
          verification,
          invoiceId,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [uploadPhoto, createFieldVerification, triggerZohoInvoice]
  );

  // Reject verification (if manager finds issues)
  const rejectVerification = useCallback(
    async (verificationId: string, rejectionReason: string): Promise<void> => {
      try {
        setLoading(true);

        const { error } = await supabase
          .from('field_verification')
          .update({ verification_status: 'rejected', rejection_reason: rejectionReason })
          .eq('id', verificationId);

        if (error) throw error;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    uploadPhoto,
    createFieldVerification,
    triggerZohoInvoice,
    processFieldVerification,
    rejectVerification,
    calculateDistance,
  };
}
