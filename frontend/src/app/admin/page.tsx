'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Video, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, reportsRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/reports'),
      ]);
      setStats(statsRes.data.data);
      setReports(reportsRes.data.data.reports || []);
    } catch {
      toast.error('Admin authentication required.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12">
        <h1 className="text-3xl font-extrabold text-white mb-2">Admin Dashboard</h1>
        <p className="text-sm text-[#8B8BA7] mb-8">System analytics & moderation</p>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl">
              <span className="text-xs text-[#8B8BA7] uppercase font-bold">Total Users</span>
              <div className="text-3xl font-extrabold text-white mt-2">{stats.totalUsers}</div>
            </div>
            <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl">
              <span className="text-xs text-[#8B8BA7] uppercase font-bold">Conversations</span>
              <div className="text-3xl font-extrabold text-[#7C3AED] mt-2">{stats.totalConversations}</div>
            </div>
            <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl">
              <span className="text-xs text-[#8B8BA7] uppercase font-bold">Revenue</span>
              <div className="text-3xl font-extrabold text-[#10B981] mt-2">${stats.totalRevenueUsd.toFixed(2)}</div>
            </div>
            <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl">
              <span className="text-xs text-[#8B8BA7] uppercase font-bold">Pending Reports</span>
              <div className="text-3xl font-extrabold text-red-400 mt-2">{stats.pendingReports}</div>
            </div>
          </div>
        )}

        {/* Reports Table */}
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Pending Reports</h2>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-[#8B8BA7]">No pending reports.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A3A] text-xs uppercase text-[#8B8BA7]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A3A]">
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 text-[#8B8BA7]">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-semibold text-white">{r.reason}</td>
                      <td className="py-3 px-4">{r.status}</td>
                      <td className="py-3 px-4">
                        <button className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-xs hover:bg-red-600 hover:text-white transition">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
