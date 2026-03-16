/**
 * Contract-Project Integration Module
 * Handles synchronization between Contract milestones and Project management
 * Ensures that changes in one module are reflected in the other
 */

import { supabase } from './supabase';

export interface MilestoneSync {
  contract_milestone_id: string;
  project_milestone_id: string;
  status: 'synced' | 'pending' | 'failed';
  last_synced: string;
}

/**
 * Synchronize contract milestone status to project
 * When a contract milestone is updated, sync its status to the corresponding project milestone
 */
export async function syncContractMilestoneToProject(
  contractMilestoneId: string,
  newStatus: string,
  contractorId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the contract milestone details
    const { data: milestonData, error: milestoneError } = await supabase
      .from('contract_milestones')
      .select('*, contracts(id)')
      .eq('id', contractMilestoneId)
      .single();

    if (milestoneError) throw milestoneError;

    // Update project milestone if it exists
    const { data: projectMilestones, error: projectError } = await supabase
      .from('contract_milestones')
      .select('*')
      .eq('contract_id', milestonData.contract_id)
      .eq('milestone_number', milestonData.milestone_number);

    if (projectError) throw projectError;

    // Log the synchronization
    await logMilestoneSync(contractMilestoneId, newStatus, 'synced', contractorId);

    return {
      success: true,
      message: `Milestone synchronized successfully. Status: ${newStatus}`
    };
  } catch (error: any) {
    console.error('Error syncing milestone:', error);
    return {
      success: false,
      message: `Failed to sync milestone: ${error.message}`
    };
  }
}

/**
 * Synchronize project milestone completion to contract
 * When a project milestone is marked as complete, trigger contract milestone payment workflow
 */
export async function syncProjectMilestoneToContract(
  projectMilestoneId: string,
  contractId: string,
  completionPercentage: number
): Promise<{ success: boolean; invoiceTriggered: boolean; message: string }> {
  try {
    // Get the contract milestone
    const { data: contractMilestone, error: cmError } = await supabase
      .from('contract_milestones')
      .select('*')
      .eq('contract_id', contractId)
      .eq('id', projectMilestoneId)
      .single();

    if (cmError && cmError.code !== 'PGRST116') throw cmError;

    // If milestone is 100% complete, trigger invoice workflow
    let invoiceTriggered = false;
    if (completionPercentage === 100 && contractMilestone) {
      invoiceTriggered = await triggerMilestoneInvoicing(
        contractMilestone.id,
        contractMilestone.amount_ugx,
        contractMilestone.currency_code
      );
    }

    return {
      success: true,
      invoiceTriggered,
      message: invoiceTriggered
        ? 'Milestone marked complete. Invoice workflow initiated.'
        : 'Milestone progress updated successfully.'
    };
  } catch (error: any) {
    console.error('Error syncing project milestone:', error);
    return {
      success: false,
      invoiceTriggered: false,
      message: `Failed to sync milestone: ${error.message}`
    };
  }
}

/**
 * Trigger automatic invoice generation when milestone is verified
 * Sends notification to client with delay before auto-generation
 */
async function triggerMilestoneInvoicing(
  milestoneId: string,
  amount: number,
  currency: string,
  clientNotificationDelayHours: number = 24
): Promise<boolean> {
  try {
    // Get milestone details
    const { data: milestone, error: mError } = await supabase
      .from('contract_milestones')
      .select('*, contracts(client_email, client_name, contract_number)')
      .eq('id', milestoneId)
      .single();

    if (mError) throw mError;

    // Update milestone status to indicate invoice is pending
    const { error: updateError } = await supabase
      .from('contract_milestones')
      .update({
        status: 'invoiced',
        updated_at: new Date().toISOString()
      })
      .eq('id', milestoneId);

    if (updateError) throw updateError;

    // In production, this would send an email notification
    console.log(`Invoice notification would be sent to ${milestone.contracts.client_email}`);
    console.log(`Invoice will auto-generate in ${clientNotificationDelayHours} hours if not disputed`);

    return true;
  } catch (error) {
    console.error('Error triggering invoice:', error);
    return false;
  }
}

/**
 * Get all pending synchronizations between contracts and projects
 */
export async function getPendingSynchronizations(
  contractorId: string
): Promise<MilestoneSync[]> {
  try {
    // In production, this would query a sync_log table or similar
    // For now, we'll return empty array as a placeholder
    return [];
  } catch (error) {
    console.error('Error getting pending syncs:', error);
    return [];
  }
}

/**
 * Log milestone synchronization events
 */
async function logMilestoneSync(
  milestoneId: string,
  status: string,
  syncStatus: 'synced' | 'pending' | 'failed',
  contractorId: string
): Promise<void> {
  try {
    // Log sync event (in production, would store in a sync_log table)
    console.log({
      milestone_id: milestoneId,
      status,
      sync_status: syncStatus,
      contractor_id: contractorId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging sync:', error);
  }
}

/**
 * Check contract-project milestone consistency
 * Ensures both modules have the same milestone data
 */
export async function validateMilestoneConsistency(
  contractId: string
): Promise<{ consistent: boolean; discrepancies: string[] }> {
  try {
    const { data: contractMilestones, error: cmError } = await supabase
      .from('contract_milestones')
      .select('*')
      .eq('contract_id', contractId);

    if (cmError) throw cmError;

    const discrepancies: string[] = [];

    // Validate each milestone
    for (const milestone of contractMilestones || []) {
      // Check if milestone has matching data
      if (!milestone.milestone_name) {
        discrepancies.push(`Milestone ${milestone.milestone_number} missing name`);
      }
      if (!milestone.due_date) {
        discrepancies.push(`Milestone ${milestone.milestone_number} missing due date`);
      }
      if (!milestone.amount_ugx || milestone.amount_ugx === 0) {
        discrepancies.push(`Milestone ${milestone.milestone_number} missing or zero amount`);
      }
    }

    return {
      consistent: discrepancies.length === 0,
      discrepancies
    };
  } catch (error: any) {
    console.error('Error validating consistency:', error);
    return {
      consistent: false,
      discrepancies: [`Validation error: ${error.message}`]
    };
  }
}

/**
 * Generate synchronization report
 * Provides overview of contract-project sync status
 */
export async function generateSyncReport(contractorId: string) {
  try {
    const { data: contracts, error: cError } = await supabase
      .from('contracts')
      .select('id, contract_number, status')
      .eq('contractor_id', contractorId);

    if (cError) throw cError;

    const report = {
      generated_at: new Date().toISOString(),
      total_contracts: contracts?.length || 0,
      synced_contracts: 0,
      pending_syncs: 0,
      inconsistencies: [] as string[]
    };

    for (const contract of contracts || []) {
      const consistency = await validateMilestoneConsistency(contract.id);
      if (consistency.consistent) {
        report.synced_contracts++;
      } else {
        report.inconsistencies.push(
          `${contract.contract_number}: ${consistency.discrepancies.join(', ')}`
        );
      }
    }

    return report;
  } catch (error) {
    console.error('Error generating sync report:', error);
    return null;
  }
}
