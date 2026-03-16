import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
  Shield,
  Users,
  Calendar,
  BarChart3,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { ComplianceStatus, ContractStatus, FinancialSummary } from '../types/empowise';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceStatus[]>([]);
  const [activeContracts, setActiveContracts] = useState<ContractStatus[]>([]);
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState('pro');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get contractor profile
      const { data: profileData, error: profileError } = await supabase
        .from('contractor_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Load compliance alerts (tax reminders)
      const { data: reminders } = await supabase
        .from('tax_reminders')
        .select('*')
        .eq('contractor_id', profileData.id)
        .order('expiry_date', { ascending: true })
        .limit(5);

      if (reminders) {
        const alerts = reminders.map(reminder => {
          const expiryDate = new Date(reminder.expiry_date);
          const today = new Date();
          const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return {
            reminder_type: reminder.reminder_type,
            document_name: reminder.document_name,
            expiry_date: reminder.expiry_date,
            status: daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'warning' : 'ok',
            days_until_expiry: daysLeft
          } as ComplianceStatus;
        });
        setComplianceAlerts(alerts);
      }

      // Load active contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          client_name,
          contract_amount,
          status,
          contract_milestones (
            id,
            status
          )
        `)
        .eq('contractor_id', profileData.id)
        .eq('status', 'active')
        .limit(5);

      if (contracts) {
        const contractsData = contracts.map(contract => {
          const milestones = (contract.contract_milestones || []) as any[];
          const totalMilestones = milestones.length;
          const completedMilestones = milestones.filter(m => m.status === 'paid').length;
          const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

          return {
            contract_id: contract.id,
            contract_number: contract.contract_number,
            client_name: contract.client_name,
            total_amount: contract.contract_amount,
            progress_percentage: progress,
            active_milestones_count: totalMilestones - completedMilestones
          } as ContractStatus;
        });
        setActiveContracts(contractsData);
      }

      // Mock financial data (will be replaced by Zoho Books integration)
      setFinancialData({
        current_month_income: 45000000, // UGX
        current_month_expenses: 28000000,
        net_profit: 17000000,
        tax_owed: 2700000, // 6% withholding on income
        net_payable: 14300000,
        tax_filing_ready: true
      });

      // Load subscription tier
      const { data: subscription } = await supabase
        .from('contractor_subscriptions')
        .select('tier')
        .eq('contractor_id', user?.id)
        .single();

      if (subscription) {
        setSubscriptionTier(subscription.tier);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-400 bg-red-950/30 border-red-500/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-500/20';
      case 'ok':
        return 'text-green-400 bg-green-950/30 border-green-500/20';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <Clock className="w-5 h-5" />;
      case 'ok':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-playfair font-bold text-white mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">{user?.name}</span>
          </h1>
          <p className="text-gray-300">Operations center for {subscriptionTier.toUpperCase()} contractors</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Upload Doc', icon: <FileText className="w-5 h-5" />, to: '/compliance' },
            { label: 'New Contract', icon: <Plus className="w-5 h-5" />, to: '/contracts' },
            { label: 'Verify Work', icon: <CheckCircle className="w-5 h-5" />, to: '/contracts' },
            { label: 'View Reports', icon: <BarChart3 className="w-5 h-5" />, to: '/books' },
            { label: 'Browse Tenders', icon: <Eye className="w-5 h-5" />, to: '/tenders' }
          ].map((action, index) => (
            <Link
              key={index}
              to={action.to}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-950/40 to-cyan-950/20 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-all group"
            >
              <div className="text-blue-400 mb-2 group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <span className="text-white text-xs font-medium text-center">{action.label}</span>
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-blue-950/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-8">
              {/* Compliance Alerts - CRITICAL */}
              <div className="bg-gradient-to-br from-blue-950/40 to-cyan-950/20 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <span>Compliance Status</span>
                  </h2>
                  <Link
                    to="/compliance"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {complianceAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {complianceAlerts.slice(0, 3).map((alert, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-4 p-4 rounded-lg border ${getStatusColor(alert.status)}`}
                      >
                        <div className="flex-shrink-0">
                          {getStatusIcon(alert.status)}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{alert.document_name}</div>
                          <div className="text-sm opacity-90">
                            Expires: {new Date(alert.expiry_date).toLocaleDateString()}
                            {alert.days_until_expiry <= 30 && (
                              <span className="ml-2 font-bold">({alert.days_until_expiry} days left)</span>
                            )}
                          </div>
                        </div>
                        {alert.status === 'critical' && subscriptionTier === 'elite' && (
                          <Link
                            to="/compliance/renewals"
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors"
                          >
                            Renew
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-semibold">All compliance documents valid</p>
                    <p className="text-gray-400 text-sm mt-1">You're audit-ready</p>
                  </div>
                )}
              </div>

              {/* Active Contracts */}
              <div className="bg-gradient-to-br from-blue-950/40 to-cyan-950/20 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <span>Active Contracts</span>
                  </h2>
                  <Link
                    to="/contracts"
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {activeContracts.length > 0 ? (
                  <div className="space-y-4">
                    {activeContracts.slice(0, 3).map((contract, index) => (
                      <div key={index} className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-semibold text-white">{contract.contract_number}</div>
                            <div className="text-gray-400 text-sm">{contract.client_name}</div>
                          </div>
                          <Link
                            to={`/contracts/${contract.contract_id}`}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </Link>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300 text-sm">Progress</span>
                          <span className="text-cyan-400 font-semibold">{contract.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${contract.progress_percentage}%` }}
                          />
                        </div>
                        <div className="text-gray-400 text-xs mt-2">
                          {contract.active_milestones_count} milestones remaining
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No active contracts</p>
                    <Link
                      to="/tenders"
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mt-3 inline-flex items-center space-x-1"
                    >
                      <span>Browse tenders</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-8">
              {/* Financial Health */}
              {financialData && (
                <div className="bg-gradient-to-br from-blue-950/40 to-cyan-950/20 border border-blue-500/20 rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span>Financial Health</span>
                  </h2>

                  <div className="space-y-4">
                    {/* This Month */}
                    <div>
                      <div className="text-gray-400 text-sm mb-1">This Month Income</div>
                      <div className="text-2xl font-bold text-green-400">
                        UGX {(financialData.current_month_income / 1000000).toFixed(1)}M
                      </div>
                    </div>

                    <div className="border-t border-blue-500/20 pt-4">
                      <div className="text-gray-400 text-sm mb-1">Expenses</div>
                      <div className="text-2xl font-bold text-orange-400">
                        UGX {(financialData.current_month_expenses / 1000000).toFixed(1)}M
                      </div>
                    </div>

                    <div className="border-t border-blue-500/20 pt-4 bg-blue-900/30 -mx-6 px-6 py-4 rounded-lg">
                      <div className="text-gray-400 text-sm mb-1">Net Profit</div>
                      <div className="text-3xl font-bold text-cyan-400 mb-3">
                        UGX {(financialData.net_profit / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-gray-400">
                        Margin: {((financialData.net_profit / financialData.current_month_income) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/books"
                    className="mt-6 w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all text-center flex items-center justify-center space-x-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Full Reports</span>
                  </Link>
                </div>
              )}

              {/* Tax Liability */}
              {financialData && (
                <div className="bg-gradient-to-br from-red-950/40 to-orange-950/20 border border-red-500/20 rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span>Tax Overview</span>
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Withholding Tax (6%)</div>
                      <div className="text-2xl font-bold text-red-400">
                        UGX {(financialData.tax_owed / 1000000).toFixed(1)}M
                      </div>
                    </div>

                    <div className="border-t border-red-500/20 pt-4">
                      <div className="text-gray-400 text-sm mb-1">Net Payable</div>
                      <div className="text-2xl font-bold text-green-400">
                        UGX {(financialData.net_payable / 1000000).toFixed(1)}M
                      </div>
                    </div>

                    {financialData.tax_filing_ready && (
                      <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3 mt-4">
                        <div className="flex items-center space-x-2 text-green-400 font-semibold text-sm">
                          <CheckCircle className="w-5 h-5" />
                          <span>Filing Ready</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/books"
                    className="mt-6 w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold rounded-lg transition-all text-center"
                  >
                    Generate Tax Report
                  </Link>
                </div>
              )}

              {/* Subscription Status */}
              <div className="bg-gradient-to-br from-purple-950/40 to-pink-950/20 border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Plan Status</h2>
                <div className="text-center">
                  <div className="inline-block px-4 py-2 bg-purple-600 rounded-full text-white font-semibold mb-3 capitalize">
                    {subscriptionTier} Plan
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    {subscriptionTier === 'starter' && '1 contract, basic features'}
                    {subscriptionTier === 'pro' && '5 contracts, all core features'}
                    {subscriptionTier === 'elite' && 'Unlimited contracts, renewal service'}
                  </p>
                  {subscriptionTier !== 'elite' && (
                    <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                      Upgrade Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
