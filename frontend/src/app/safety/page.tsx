import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ShieldCheck, Flag, Ban, AlertCircle } from 'lucide-react';

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16">
        <h1 className="text-4xl font-extrabold text-white mb-4">Safety & Community Guidelines</h1>
        <p className="text-[#8B8BA7] mb-12">
          Your safety is our top priority. FaceChat is designed to connect adults safely through verified tools and strict policies.
        </p>

        <div className="space-y-8">
          <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Strictly 18+ Platform
            </h2>
            <p className="text-sm text-[#8B8BA7] leading-relaxed">
              Minors are not permitted on FaceChat under any circumstances. We actively report and ban any accounts suspected of underage usage.
            </p>
          </div>

          <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              Zero Tolerance for Harassment & Nudity
            </h2>
            <p className="text-sm text-[#8B8BA7] leading-relaxed">
              Sexual violence, hate speech, harassment, nudity, scams, and threats are strictly forbidden. Violators face permanent bans.
            </p>
          </div>

          <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-400" />
              How to Report & Block
            </h2>
            <p className="text-sm text-[#8B8BA7] leading-relaxed">
              Every active video call features one-click Report and Block buttons at the bottom. Blocking a user terminates the call and guarantees you will never be matched with them again.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
