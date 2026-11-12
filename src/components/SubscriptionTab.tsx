import React, { useState } from 'react';
import { CreditCard, Check, Shield, Zap, Sparkles, Heart, Coffee, AlertCircle, Loader2, Copy, ExternalLink, QrCode, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const SUBSCRIPTION_TIERS = [
  {
    id: 'free',
    name: 'Standard',
    price: '$0',
    interval: 'forever',
    features: [
      'Basic OBD-II Diagnostics (Generic PIDs)',
      'Real-time GPS Tracking',
      'AI Diagnosis (3/day)',
      'Local Trip Storage'
    ],
    recommended: false,
    color: 'text-white',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
  {
    id: 'pro',
    name: 'Pro Diagnostics',
    price: '$9.99',
    interval: '/month',
    features: [
      'Advanced Manufacturer PIDs (1996+)',
      'Unlimited AI Diagnostics & Voice Chat',
      'Cloud Backup & Drive Sync',
      'Live Sensor Data Graphing',
      'Priority Support'
    ],
    recommended: true,
    color: 'text-car-accent',
    bg: 'bg-car-accent/10',
    border: 'border-car-accent/30',
  },
  {
    id: 'lifetime',
    name: 'Lifetime Pro',
    price: '$149.99',
    interval: 'one-time',
    features: [
      'All Pro Diagnostics Features',
      'Lifetime Updates & New Features',
      'Early Access to Beta Tools',
      'VIP Support Queue'
    ],
    recommended: false,
    color: 'text-car-purple',
    bg: 'bg-car-purple/10',
    border: 'border-car-purple/30',
  }
];

const DONATION_TIERS = [
  { amount: 5, label: 'Coffee', icon: Coffee },
  { amount: 15, label: 'Lunch', icon: Heart },
  { amount: 50, label: 'Sponsor', icon: Shield },
];

const DEFAULT_PAYPAL_ME = (process.env as any)?.VITE_PAYPAL_ME_URL || 'https://www.paypal.com/paypalme/drivelogicai';
const DEFAULT_PAYPAL_LOGIN = (process.env as any)?.VITE_PAYPAL_SANDBOX_LOGIN || 'sb-buyer-drivelogicai@personal.example.com';
const DEFAULT_BTC_ADDRESS = (process.env as any)?.VITE_BTC_WALLET_ADDRESS || 'bc1qdrivelogicai99xge8273x0wkw0923kljhx';
const DEFAULT_BTC_URI = (process.env as any)?.VITE_BTC_WALLET_URI || `bitcoin:${DEFAULT_BTC_ADDRESS}?label=DriveLogicAI%20Support`;

export default function SubscriptionTab() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingDonation, setLoadingDonation] = useState<number | null>(null);
  const [customDonation, setCustomDonation] = useState('');
  const [copiedBtc, setCopiedBtc] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<{ title: string; amount: string } | null>(null);

  const handleSubscribe = async (tierId: string) => {
    setLoadingTier(tierId);
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId);
    setSelectedPaymentItem({
      title: `${tier?.name || tierId} Subscription`,
      amount: tier?.price || '$9.99'
    });
    setLoadingTier(null);
    setShowPayPalModal(true);
  };

  const handleDonate = async (amount: number) => {
    setLoadingDonation(amount);
    setSelectedPaymentItem({
      title: `DriveLogic AI Contribution`,
      amount: `$${amount}`
    });
    setLoadingDonation(null);
    setShowPayPalModal(true);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBtc(true);
      setTimeout(() => setCopiedBtc(false), 2500);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-car-accent/10 border border-car-accent/20 text-car-accent text-xs font-semibold uppercase tracking-wider">
          <Shield size={14} /> Verified Secure Platform &bull; drivelgicaiapp.com
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Unlock Professional Capabilities</h2>
        <p className="text-white/60 text-sm max-w-xl mx-auto leading-relaxed">
          Access manufacturer-specific OBD-II protocols, high-frequency IMU telemetry, and unlimited cloud features on DriveLogic AI.
        </p>
      </div>

      {/* Subscription Pricing Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {SUBSCRIPTION_TIERS.map((tier) => (
          <div 
            key={tier.id}
            className={cn(
              "relative rounded-3xl p-6 glass-card flex flex-col justify-between border-2 transition-all duration-300 hover:-translate-y-1",
              tier.recommended ? 'border-car-accent shadow-xl shadow-car-accent/10' : 'border-transparent hover:border-white/10'
            )}
          >
            {tier.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-car-accent text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full shadow-lg">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className={cn("text-lg font-bold font-mono tracking-tight", tier.color)}>{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black text-white">{tier.price}</span>
                  <span className="text-xs text-white/40 uppercase tracking-widest">{tier.interval}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn("p-1 rounded-full shrink-0 mt-0.5", tier.bg)}>
                      <Check size={10} className={tier.color} />
                    </div>
                    <span className="text-sm text-white/70 leading-snug">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSubscribe(tier.id)}
              disabled={loadingTier !== null}
              className={cn(
                "mt-8 w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                tier.recommended 
                  ? "bg-car-accent hover:bg-car-accent/90 text-white shadow-lg shadow-car-accent/20" 
                  : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
              )}
            >
              {loadingTier === tier.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                tier.id === 'free' ? 'Current Plan' : 'Select Plan'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Donation & Support Section with PayPal & Bitcoin */}
      <div className="grid md:grid-cols-2 gap-6 mt-12">
        {/* PayPal Support Card */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <CreditCard size={20} />
                <span>PayPal Direct & Login</span>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                Verified Merchant
              </span>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              Support development directly via PayPal or your credit/debit card. Fast, encrypted, and automatically activates your DriveLogic AI benefits.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {DONATION_TIERS.map((tier) => (
                <button
                  key={tier.amount}
                  onClick={() => handleDonate(tier.amount)}
                  disabled={loadingDonation !== null}
                  className="flex-1 py-2 px-3 bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <span className="text-xs font-bold text-white">${tier.amount}</span>
                  <span className="text-[10px] text-white/40">({tier.label})</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="number" 
                min="1"
                value={customDonation}
                onChange={(e) => setCustomDonation(e.target.value)}
                placeholder="Custom $ amount"
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button 
                onClick={() => handleDonate(Number(customDonation) || 25)}
                disabled={!customDonation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shrink-0 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>

          <div className="pt-5 border-t border-white/5 mt-4 flex items-center justify-between">
            <a 
              href={DEFAULT_PAYPAL_ME} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
            >
              Open paypal.me/drivelogicai <ExternalLink size={12} />
            </a>
            <span className="text-[10px] text-white/30 font-mono">Sandbox: {DEFAULT_PAYPAL_LOGIN.slice(0, 16)}...</span>
          </div>
        </div>

        {/* Bitcoin (BTC) Support Card */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span className="text-base font-black">₿</span>
                <span>Bitcoin (BTC) Wallet</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Native SegWit / Bech32
              </span>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              Decentralized contributions support open-source telemetry parsers, vehicle safety algorithms, and server infrastructure.
            </p>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="text-[10px] uppercase font-mono text-white/40 tracking-wider">BTC Deposit Address:</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-amber-300/90 break-all select-all font-medium">
                  {DEFAULT_BTC_ADDRESS}
                </span>
                <button
                  onClick={() => copyToClipboard(DEFAULT_BTC_ADDRESS)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors shrink-0"
                  title="Copy BTC Address"
                >
                  {copiedBtc ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {copiedBtc && (
              <p className="text-[11px] text-green-400 font-medium animate-in fade-in flex items-center gap-1">
                <CheckCircle2 size={12} /> Address copied to clipboard!
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between">
            <a 
              href={DEFAULT_BTC_URI}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
            >
              Open in Crypto Wallet <ExternalLink size={12} />
            </a>
            <span className="text-[10px] text-white/30 font-mono">Instant Confirmation</span>
          </div>
        </div>
      </div>

      {/* PayPal Checkout & Login Modal */}
      <AnimatePresence>
        {showPayPalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card bg-[#0d1117] border border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">PayPal Checkout</h3>
                    <p className="text-[11px] text-white/40">DriveLogic AI &bull; drivelgicaiapp.com</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPayPalModal(false)}
                  className="text-white/40 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              {selectedPaymentItem && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-white/50">{selectedPaymentItem.title}</div>
                    <div className="text-sm font-bold text-white">DriveLogic AI Pro Services</div>
                  </div>
                  <div className="text-2xl font-black text-car-accent">
                    {selectedPaymentItem.amount}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <a
                  href={`${DEFAULT_PAYPAL_ME}/${selectedPaymentItem?.amount.replace('$', '') || '10'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-[#0070ba] hover:bg-[#003087] text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-blue-500/20"
                >
                  <span>Continue to PayPal Checkout</span>
                  <ExternalLink size={14} />
                </a>

                <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5 text-[11px] text-white/50 font-mono">
                  <div className="text-white/70 font-semibold">Test / Default Credentials:</div>
                  <div>Email: <span className="text-white/90">{DEFAULT_PAYPAL_LOGIN}</span></div>
                  <div>Status: <span className="text-green-400">Sandbox Ready / Instant Sandbox</span></div>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setShowPayPalModal(false)}
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  Cancel and return to app
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
