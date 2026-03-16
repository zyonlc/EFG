import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ComplianceStatus } from '../types/empowise';

interface UseComplianceTrackingReturn {
  complianceAlerts: ComplianceStatus[];
  criticalCount: number;
  warningCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and track contractor compliance alerts
 * Monitors tax clearance, NSSF, trading license, insurance expiry
 */
export function useComplianceTracking(contractorId: string | undefined): UseComplianceTrackingReturn {
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplianceAlerts = async () => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: reminders, error: fetchError } = await supabase
        .from('tax_reminders')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('expiry_date', { ascending: true });

      if (fetchError) throw fetchError;

      const alerts: ComplianceStatus[] = (reminders || []).map(reminder => {
        const expiryDate = new Date(reminder.expiry_date);
        const today = new Date();
        const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          reminder_type: reminder.reminder_type,
          document_name: reminder.document_name,
          expiry_date: reminder.expiry_date,
          status: daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'warning' : 'ok',
          days_until_expiry: daysLeft
        };
      });

      setComplianceAlerts(alerts);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch compliance alerts';
      setError(errorMsg);
      console.error('Compliance tracking error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceAlerts();
  }, [contractorId]);

  const criticalCount = complianceAlerts.filter(a => a.status === 'critical').length;
  const warningCount = complianceAlerts.filter(a => a.status === 'warning').length;

  return {
    complianceAlerts,
    criticalCount,
    warningCount,
    loading,
    error,
    refetch: fetchComplianceAlerts
  };
}

/**
 * Hook to check if a contractor is "Bid-Ready"
 * Returns false if any critical compliance item is expired
 */
export function useBidReadinessCheck(contractorId: string | undefined): {
  isBidReady: boolean;
  failedRequirements: string[];
  loading: boolean;
} {
  const { complianceAlerts, loading } = useComplianceTracking(contractorId);

  const failedRequirements = complianceAlerts
    .filter(alert => alert.status === 'critical')
    .map(alert => alert.document_name);

  return {
    isBidReady: failedRequirements.length === 0,
    failedRequirements,
    loading
  };
}
