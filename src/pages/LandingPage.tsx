import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Zap, Shield, TrendingUp, Users, FileText, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Waitlist signup:', email);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
      {/* Hero Section */}
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
            <span className="text-blue-400 text-sm font-medium">✨ Operational Intelligence for Contractors</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-playfair font-bold text-white mb-6">
            Never Miss a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Deadline Again</span>
          </h1>

          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Empowise automates compliance tracking, milestone verification, and payment processing. Spend less time on paperwork. More time winning contracts.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/signup"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              Start Free Trial <ArrowRight className="inline w-5 h-5 ml-2" />
            </Link>
            <button
              onClick={() => navigate('#features')}
              className="px-8 py-4 border border-blue-500/30 text-white font-semibold rounded-xl hover:bg-blue-500/10 transition-all duration-300"
            >
              Learn More
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center text-gray-300 max-w-2xl mx-auto">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span>1000+ Contractors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Section */}
      <div className="py-20 px-4 bg-blue-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              The Compliance Nightmare is <span className="text-red-400">Costing You Money</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                problem: 'Lost Milestones',
                cost: 'UGX 50M-500M',
                icon: '📋',
                description: 'Delayed payment verification & invoice disputes cost you weeks of follow-up'
              },
              {
                problem: 'Tax Penalties',
                cost: 'UGX 10M+',
                icon: '⚖️',
                description: 'Missing tax clearance renewals = automatic bid disqualification'
              },
              {
                problem: 'Manual Paperwork',
                cost: '40+ hours/month',
                icon: '📄',
                description: 'Your team spends 40+ hours organizing receipts & compliance docs'
              },
              {
                problem: 'Audit Delays',
                cost: '3-6 months',
                icon: '🔍',
                description: 'Disorganized records mean failed audits & contract termination risk'
              }
            ].map((item, index) => (
              <div key={index} className="bg-red-950/30 border border-red-500/20 rounded-2xl p-6">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-white text-xl font-semibold mb-2">{item.problem}</h3>
                <p className="text-red-400 font-bold text-lg mb-3">{item.cost} cost</p>
                <p className="text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Solution Section - Core Features */}
      <div className="py-20 px-4" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              How Empowise <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Saves You Time & Money</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Compliance Vault',
                description: 'Auto-track tax clearance, NSSF, insurance expiry. Get alerts 30 days before deadline.',
                benefit: 'Never miss a renewal'
              },
              {
                icon: <FileText className="w-8 h-8" />,
                title: 'Photo-Lock Verification',
                description: 'GPS-tagged photo proof of work. Milestone auto-verifies. Invoice auto-generates.',
                benefit: 'Get paid 2 weeks faster'
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: 'Real-Time P&L Dashboard',
                description: 'See income vs expenses daily. Tax liability auto-calculated. Files ready for audits.',
                benefit: 'Know your exact profit margin'
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Vendor Management',
                description: 'Track subcontractors, insurance, certifications. Auto-block expired vendors.',
                benefit: 'Zero compliance risk'
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: 'Automated Invoicing',
                description: 'Milestone verified → Zoho invoice → Flutterwave payment → Done.',
                benefit: 'Zero manual work'
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: 'Professional Directory',
                description: 'Connect with verified contractors. Find suppliers. Direct messaging with audit trail.',
                benefit: 'Build your network'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-950/40 to-cyan-950/20 border border-blue-500/20 rounded-2xl p-8 hover:border-blue-500/40 transition-all">
                <div className="text-blue-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300 mb-4">{feature.description}</p>
                <p className="text-cyan-400 font-semibold text-sm">✓ {feature.benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROI Section */}
      <div className="py-20 px-4 bg-gradient-to-r from-blue-950/50 to-cyan-950/50 border-y border-blue-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-playfair font-bold text-white mb-12">
            What Contractors Save with Empowise
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                number: '40+',
                unit: 'hours/month',
                description: 'Admin work eliminated'
              },
              {
                number: '2',
                unit: 'weeks',
                description: 'Faster payment processing'
              },
              {
                number: '5-10%',
                unit: 'profit increase',
                description: 'From reduced waste & disputes'
              }
            ].map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-playfair font-bold text-cyan-400 mb-2">{metric.number}</div>
                <div className="text-gray-300 font-semibold mb-1">{metric.unit}</div>
                <div className="text-gray-400 text-sm">{metric.description}</div>
              </div>
            ))}
          </div>

          <div className="bg-blue-900/40 border border-blue-500/30 rounded-2xl p-8">
            <p className="text-gray-300 mb-4">A typical contractor with 5 active contracts saves:</p>
            <p className="text-3xl font-bold text-cyan-400 mb-4">UGX 2-5 Million/Month</p>
            <p className="text-gray-400">From faster invoicing, fewer disputes, and reduced admin overhead</p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Transparent Pricing</span>
            </h2>
            <p className="text-gray-300 text-lg">No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: 'UGX 150K',
                period: '/month',
                description: 'Perfect for solo contractors',
                features: [
                  'Compliance vault',
                  'Document tracking',
                  'Basic tenders access',
                  '1 active contract',
                  'Email support'
                ],
                highlighted: false
              },
              {
                name: 'Pro',
                price: 'UGX 300K',
                period: '/month',
                description: 'For growing contractors',
                features: [
                  'Everything in Starter',
                  'Photo-Lock verification',
                  'Zoho Books integration',
                  'Up to 5 contracts',
                  'Professional directory',
                  'Team management',
                  'Priority support'
                ],
                highlighted: true
              },
              {
                name: 'Elite',
                price: 'UGX 500K',
                period: '/month',
                description: 'For agencies & large firms',
                features: [
                  'Everything in Pro',
                  'Document renewal service',
                  'Unlimited contracts',
                  'Advanced analytics',
                  'Materials marketplace access',
                  'Dedicated account manager',
                  '24/7 phone support'
                ],
                highlighted: false
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl p-8 transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 border-2 border-cyan-400 transform scale-105'
                    : 'bg-blue-950/40 border border-blue-500/20 hover:border-blue-500/40'
                }`}
              >
                <h3 className={`text-2xl font-semibold mb-2 ${plan.highlighted ? 'text-white' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-blue-100' : 'text-gray-400'}`}>
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-cyan-400'}`}>
                    {plan.price}
                  </span>
                  <span className={plan.highlighted ? 'text-blue-100' : 'text-gray-400'}>{plan.period}</span>
                </div>

                <button
                  className={`w-full py-3 px-4 rounded-lg font-semibold mb-6 transition-all ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-gray-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Get Started
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className={plan.highlighted ? 'text-white text-sm' : 'text-gray-300 text-sm'}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 bg-gradient-to-r from-blue-950 to-cyan-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-playfair font-bold text-white mb-6">
            Ready to Automate Your Operations?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join 1000+ contractors already using Empowise to save time, reduce errors, and win more bids.
          </p>

          {user ? (
            <Link
              to="/dashboard"
              className="px-8 py-4 bg-cyan-500 text-white font-semibold rounded-xl hover:bg-cyan-600 transition-all inline-block"
            >
              Go to Dashboard <ArrowRight className="inline w-5 h-5 ml-2" />
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-cyan-500 text-white font-semibold rounded-xl hover:bg-cyan-600 transition-all"
              >
                Start Free Trial <ArrowRight className="inline w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/signin"
                className="px-8 py-4 border border-cyan-500/50 text-white font-semibold rounded-xl hover:bg-cyan-500/10 transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-12 px-4 border-t border-blue-500/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-400 text-sm">
            <p className="mb-4">
              Empowise is proud to serve high-stakes contractors across Africa. Securely powered by Supabase & Zoho Books.
            </p>
            <div className="flex justify-center gap-6 text-xs">
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
              <a href="#" className="hover:text-white transition">Terms of Service</a>
              <a href="#" className="hover:text-white transition">Contact Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
