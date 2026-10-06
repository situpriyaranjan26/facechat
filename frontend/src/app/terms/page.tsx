import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16">
        <h1 className="text-4xl font-extrabold text-white mb-6">Terms of Service</h1>
        <div className="space-y-6 text-sm text-[#8B8BA7] leading-relaxed">
          <p>Last updated: October 2026</p>
          <h2 className="text-lg font-bold text-white">1. Eligibility</h2>
          <p>You must be at least 18 years old to access or use FaceChat.</p>
          <h2 className="text-lg font-bold text-white">2. Virtual Currency (Face Coins)</h2>
          <p>Face Coins have no real-world cash value and cannot be redeemed for fiat currency. All coin purchases are final.</p>
          <h2 className="text-lg font-bold text-white">3. Female Match Pass</h2>
          <p>The Female Match Pass grants 12 hours of female-preference matching. Conversations during this period still consume Face Coins.</p>
          <h2 className="text-lg font-bold text-white">4. Prohibited Conduct</h2>
          <p>Users must not engage in illegal conduct, transmit malware, harass others, or record conversations without consent.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
