/**
 * Custom hook for Contract-Project integration
 * Provides easy access to synchronization and validation functions
 */

import { useState } from 'react';
import {
  syncContractMilestoneToProject,
  syncProjectMilestoneToContract,
  validateMilestoneConsistency,
  generateSyncReport,
  getPendingSynchronizations
} from '../lib/contractProjectIntegration';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
}

export function useContractProjectIntegration() {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    syncError: null
  });

  /**
   * Sync contract milestone to project
   */
  const syncContractToProject = async (
    contractMilestoneId: string,
    newStatus: string,
    contractorId: string
  ) => {
    setSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }));
    try {
      const result = await syncContractMilestoneToProject(
        contractMilestoneId,
        newStatus,
        contractorId
      );
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        syncError: result.success ? null : result.message
      }));
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Synchronization failed';
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMsg
      }));
      return { success: false, message: errorMsg };
    }
  };

  /**
   * Sync project milestone to contract
   */
  const syncProjectToContract = async (
    projectMilestoneId: string,
    contractId: string,
    completionPercentage: number
  ) => {
    setSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }));
    try {
      const result = await syncProjectMilestoneToContract(
        projectMilestoneId,
        contractId,
        completionPercentage
      );
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        syncError: result.success ? null : result.message
      }));
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Synchronization failed';
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMsg
      }));
      return { success: false, invoiceTriggered: false, message: errorMsg };
    }
  };

  /**
   * Validate milestone consistency
   */
  const validateConsistency = async (contractId: string) => {
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await validateMilestoneConsistency(contractId);
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      return result;
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error.message
      }));
      return { consistent: false, discrepancies: [error.message] };
    }
  };

  /**
   * Generate sync report
   */
  const getSyncReport = async (contractorId: string) => {
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const report = await generateSyncReport(contractorId);
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      return report;
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error.message
      }));
      return null;
    }
  };

  /**
   * Get pending synchronizations
   */
  const getPendingSyncs = async (contractorId: string) => {
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const syncs = await getPendingSynchronizations(contractorId);
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      return syncs;
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error.message
      }));
      return [];
    }
  };

  return {
    syncState,
    syncContractToProject,
    syncProjectToContract,
    validateConsistency,
    getSyncReport,
    getPendingSyncs
  };
}
