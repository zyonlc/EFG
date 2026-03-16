import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ComplianceDocument {
  id: string;
  contractor_id: string;
  reminder_type: 'tax_clearance' | 'nssf' | 'trading_license' | 'insurance' | 'business_registration';
  document_name: string;
  document_url: string;
  upload_date: string;
  expiry_date: string;
  status: 'ok' | 'warning' | 'critical' | 'expired';
  auto_reminder_sent: boolean;
  renewal_available: boolean;
  renewal_fee: number | null;
}

export function useComplianceDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all documents for current contractor
  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tax_reminders')
        .select('*')
        .eq('contractor_id', user.id)
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      // Calculate status based on expiry date
      const documentsWithStatus = (data || []).map((doc) => {
        const today = new Date();
        const expiry = new Date(doc.expiry_date);
        const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'ok' | 'warning' | 'critical' | 'expired' = 'ok';
        if (daysLeft < 0) {
          status = 'expired';
        } else if (daysLeft <= 7) {
          status = 'critical';
        } else if (daysLeft <= 30) {
          status = 'warning';
        }

        return {
          ...doc,
          status,
          document_name: doc.reminder_type
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
        };
      });

      setDocuments(documentsWithStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Upload new document
  const uploadDocument = useCallback(
    async (
      file: File,
      reminderType: 'tax_clearance' | 'nssf' | 'trading_license' | 'insurance' | 'business_registration',
      expiryDate: string
    ) => {
      if (!user) throw new Error('User not authenticated');

      try {
        setLoading(true);

        // Upload file to Supabase Storage
        const fileName = `${user.id}/${reminderType}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('compliance-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('compliance-documents')
          .getPublicUrl(fileName);

        // Insert document record
        const { data: docData, error: insertError } = await supabase
          .from('tax_reminders')
          .insert({
            contractor_id: user.id,
            reminder_type: reminderType,
            expiry_date: expiryDate,
            document_url: urlData.publicUrl,
            status: 'ok',
            auto_reminder_sent: false,
            renewal_available: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Refresh documents list
        await fetchDocuments();

        return docData;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload document';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, fetchDocuments]
  );

  // Initiate document renewal (premium service)
  const initiateRenewal = useCallback(
    async (documentId: string, paymentAmount: number) => {
      if (!user) throw new Error('User not authenticated');

      try {
        setLoading(true);

        // Create renewal request record
        const { data: renewalData, error: renewalError } = await supabase
          .from('document_renewals')
          .insert({
            contractor_id: user.id,
            document_id: documentId,
            status: 'pending',
            payment_amount: paymentAmount,
            requested_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (renewalError) throw renewalError;

        return renewalData;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initiate renewal';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Delete document
  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!user) throw new Error('User not authenticated');

      try {
        setLoading(true);

        const { error } = await supabase.from('tax_reminders').delete().eq('id', documentId);

        if (error) throw error;

        await fetchDocuments();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete document';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, fetchDocuments]
  );

  // Get critical alerts (documents expiring soon)
  const getCriticalAlerts = useCallback(() => {
    return documents.filter((doc) => doc.status === 'critical' || doc.status === 'expired');
  }, [documents]);

  // Get days until expiry
  const getDaysUntilExpiry = useCallback((expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    initiateRenewal,
    deleteDocument,
    getCriticalAlerts,
    getDaysUntilExpiry,
  };
}
