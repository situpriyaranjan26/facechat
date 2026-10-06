import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16">
        <h1 className="text-4xl font-extrabold text-white mb-6">Privacy Policy</h1>
        <div className="space-y-6 text-sm text-[#8B8BA7] leading-relaxed">
          <p>Last updated: October 2026</p>
          <h2 className="text-lg font-bold text-white">1. No Audio/Video Recording</h2>
          <p>FaceChat never records or stores your video streams or audio conversations. Real-time media travels peer-to-peer via encrypted WebRTC connections.</p>
          <h2 className="text-lg font-bold text-white">2. Location Data</h2>
          <p>We do not collect or expose your precise geographical location or IP address to other participants.</p>
          <h2 className="text-lg font-bold text-white">3. Data Retention</h2>
          <p>Chat messages exchanged during calls are ephemeral and deleted when the session ends.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
