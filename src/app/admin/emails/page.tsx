
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Mail, Plus, Settings, History, Edit, Trash, Check, X, AlertTriangle, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'providers' | 'logs'>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [testingTemplate, setTestingTemplate] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'templates') {
      const { data } = await supabase.from('email_templates').select('*').order('name');
      setTemplates(data || []);
    } else if (activeTab === 'providers') {
      const { data } = await supabase.from('email_providers').select('*').order('is_primary', { ascending: false });
      setProviders(data || []);
    } else if (activeTab === 'logs') {
      const { data } = await supabase.from('email_logs').select('*, email_templates(name)').order('created_at', { ascending: false }).limit(50);
      setLogs(data || []);
    }
    setLoading(false);
  };

  const handleSaveTemplate = async (e: any) => {
    e.preventDefault();
    const { id, ...rest } = editingTemplate;
    if (id) {
      await supabase.from('email_templates').update({ ...rest, updated_at: new Date() }).eq('id', id);
    } else {
      await supabase.from('email_templates').insert(rest);
    }
    setEditingTemplate(null);
    fetchData();
  };

  const seedDefaultTemplates = async () => {
    const defaults = [
      {
        name: 'Login Alert',
        subject: 'Security Alert: New Login to Your Account',
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">New Login Detected</h2>
            <p>Hi {{user_name}},</p>
            <p>We noticed a successful login to your BeatPoppa account from a new device or location.</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #666;"><strong>Time:</strong> {{login_time}}</p>
              <p style="margin: 0; color: #666;"><strong>IP Address:</strong> {{ip_address}}</p>
              <p style="margin: 0; color: #666;"><strong>Device:</strong> {{device_info}}</p>
            </div>
            <p>If this was you, you can safely ignore this email. If you don't recognize this activity, please change your password immediately.</p>
            <a href="{{reset_link}}" style="display: inline-block; background: #e11d48; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 20px;">Secure My Account</a>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">The BeatPoppa Security Team</p>
          </div>
        `,
        variables: ['user_name', 'login_time', 'ip_address', 'device_info', 'reset_link']
      },
      {
        name: 'Welcome & Verify',
        subject: 'Welcome to BeatPoppa! Verify Your Email',
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h1 style="color: #e11d48;">Welcome to BeatPoppa!</h1>
            <p style="font-size: 16px; color: #333;">We're excited to have you join our community of creators and buyers.</p>
            <p>Please click the button below to verify your email address and get started:</p>
            <a href="{{verify_link}}" style="display: inline-block; background: #000; color: white; padding: 15px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; margin: 30px 0;">Verify My Email</a>
            <p style="color: #666;">Or copy and paste this link: <br> {{verify_link}}</p>
            <hr style="margin: 40px 0; border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">If you didn't create an account, you can ignore this email.</p>
          </div>
        `,
        variables: ['verify_link']
      },
      {
        name: 'Forgot Password',
        subject: 'Reset Your BeatPoppa Password',
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You recently requested to reset your password for your BeatPoppa account. Use the button below to reset it. This link is only valid for the next 60 minutes.</p>
            <a href="{{reset_link}}" style="display: inline-block; background: #e11d48; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; margin: 20px 0;">Reset Password</a>
            <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">Thanks, <br>The BeatPoppa Team</p>
          </div>
        `,
        variables: ['reset_link']
      },
      {
        name: 'Order Confirmed',
        subject: 'Your BeatPoppa Order #{{order_id}} is Confirmed!',
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #e11d48; margin: 0; font-size: 32px; font-weight: 900;">Order Confirmed!</h1>
              <p style="color: #666; font-size: 16px; margin-top: 10px;">Thank you for your purchase, {{user_name}}.</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 20px; padding: 30px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
              <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Order Details</h2>
              <p style="margin: 10px 0;"><strong>Order ID:</strong> #{{order_id}}</p>
              <p style="margin: 10px 0;"><strong>Status:</strong> Completed & Cleared</p>
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Your license clearance document(s) have been attached to this email. You can use these documents for verification on streaming platforms like Spotify, Apple Music, and YouTube.
              </p>
              <a href="{{download_url}}" style="display: inline-block; background: #e11d48; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 10px; box-shadow: 0 4px 14px 0 rgba(225, 29, 72, 0.39);">Download Your Beats</a>
            </div>
            
            <div style="text-align: center; color: #94a3b8; font-size: 12px;">
              <p>Need help? <a href="{{site_url}}/support" style="color: #e11d48; text-decoration: none;">Contact Support</a></p>
              <p>&copy; {{current_year}} BeatPoppa. All rights reserved.</p>
            </div>
          </div>
        `,
        variables: ['order_id', 'user_name', 'download_url', 'site_url', 'current_year']
      },
      {
        name: 'New Sale Alert',
        subject: 'Cha-Ching! You just made a sale on BeatPoppa!',
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #000; color: #fff; border-radius: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 50px; margin-bottom: 20px;">💰</div>
              <h1 style="color: #e11d48; margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">New Sale!</h1>
              <p style="color: #94a3b8; font-size: 16px; margin-top: 10px;">Great job, {{creator_name}}!</p>
            </div>
            
            <div style="background: #111; border-radius: 20px; padding: 30px; margin-bottom: 30px; border: 1px solid #222;">
              <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 10px; color: #e11d48;">Sale Summary</h2>
              <p style="margin: 10px 0;"><strong>Beat:</strong> {{beat_title}}</p>
              <p style="margin: 10px 0;"><strong>License:</strong> {{license_type}}</p>
              <p style="margin: 10px 0;"><strong>Earnings:</strong> {{amount}}</p>
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                The funds have been added to your balance. You can request a payout once you reach the minimum threshold.
              </p>
              <a href="{{dashboard_url}}" style="display: inline-block; background: #fff; color: #000; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 10px;">View Sales Dashboard</a>
            </div>
            
            <div style="text-align: center; color: #444; font-size: 12px;">
              <p>&copy; {{current_year}} BeatPoppa Creators.</p>
            </div>
          </div>
        `,
        variables: ['creator_name', 'beat_title', 'license_type', 'amount', 'dashboard_url', 'current_year']
      },
      {
        name: 'Payout Processed',
        subject: 'Your Payout has been Processed!',
        body: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 50px; margin-bottom: 20px;">✅</div>
              <h1 style="color: #10b981; margin: 0; font-size: 32px; font-weight: 900;">Payout Successful</h1>
              <p style="color: #666; font-size: 16px; margin-top: 10px;">Hi {{user_name}}, your funds are on the way.</p>
            </div>
            
            <div style="background: #f0fdf4; border-radius: 20px; padding: 30px; margin-bottom: 30px; border: 1px solid #dcfce7;">
              <p style="margin: 10px 0;"><strong>Amount:</strong> {{amount}}</p>
              <p style="margin: 10px 0;"><strong>Method:</strong> {{payout_method}}</p>
              <p style="margin: 10px 0;"><strong>Date:</strong> {{payout_date}}</p>
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #166534;">
                The transfer has been initiated. Depending on your bank or payment provider, it may take 1-3 business days to appear in your account.
              </p>
            </div>
            
            <div style="text-align: center; color: #94a3b8; font-size: 12px;">
              <p>Questions? <a href="{{site_url}}/support" style="color: #e11d48; text-decoration: none;">Contact Support</a></p>
            </div>
          </div>
        `,
        variables: ['user_name', 'amount', 'payout_method', 'payout_date', 'site_url']
      }
    ];

    setLoading(true);
    for (const template of defaults) {
      const { data: existing } = await supabase.from('email_templates').select('id').eq('name', template.name).maybeSingle();
      if (!existing) {
        await supabase.from('email_templates').insert(template);
      } else {
        // Update existing ones to ensure they have the latest design
        await supabase.from('email_templates').update(template).eq('id', existing.id);
      }
    }
    fetchData();
  };

  const handleSaveProvider = async (e: any) => {
    e.preventDefault();
    const { id, ...rest } = editingProvider;
    if (id) {
      await supabase.from('email_providers').update({ ...rest, updated_at: new Date() }).eq('id', id);
    } else {
      await supabase.from('email_providers').insert(rest);
    }
    setEditingProvider(null);
    fetchData();
  };

  const testEmail = async (template: any) => {
    const email = prompt('Enter email to send test to:');
    if (!email) return;

    setTestingTemplate(true);
    try {
      const response = await fetch('/api/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: email,
          templateId: template.id,
          variables: template.variables.reduce((acc: any, v: string) => ({ ...acc, [v]: `[TEST_${v.toUpperCase()}]` }), {})
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Test email sent successfully!');
      } else {
        alert('Failed to send test email: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + String(err));
    } finally {
      setTestingTemplate(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <Mail className="text-blue-500" />
            Email Management
          </h1>
          <p className="text-zinc-400">Manage transactional emails, providers, and logs.</p>
        </div>
        <div className="flex gap-4">
          {templates.length === 0 && activeTab === 'templates' && (
            <button 
              onClick={seedDefaultTemplates}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              <Plus size={18} /> Seed Default Templates
            </button>
          )}
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'templates' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Templates
          </button>
          <button 
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'providers' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Providers
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Logs
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'templates' && (
            <div className="grid gap-6">
              <div className="flex justify-end">
                <button 
                  onClick={() => setEditingTemplate({ name: '', subject: '', body: '', variables: [] })}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                  <Plus size={18} /> New Template
                </button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                  <div key={t.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all">
                    <h3 className="text-xl font-bold text-white mb-2">{t.name}</h3>
                    <p className="text-zinc-400 text-sm mb-4">{t.subject}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {t.variables?.map((v: string) => (
                        <span key={v} className="px-2 py-1 bg-zinc-800 text-zinc-500 rounded text-xs">{"{{"}{v}{"}}"}</span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800">
                      <div className="flex gap-4">
                        <button onClick={() => setEditingTemplate(t)} className="text-zinc-400 hover:text-white flex items-center gap-1">
                          <Edit size={16} /> Edit
                        </button>
                        <button onClick={() => setPreviewTemplate(t)} className="text-zinc-400 hover:text-blue-500 flex items-center gap-1">
                          <Mail size={16} /> Preview
                        </button>
                      </div>
                      <button 
                        disabled={testingTemplate}
                        onClick={() => testEmail(t)} 
                        className="text-zinc-400 hover:text-blue-500 flex items-center gap-1 disabled:opacity-50"
                      >
                        <Send size={16} /> {testingTemplate ? 'Sending...' : 'Test'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="grid gap-6">
              <div className="flex justify-end">
                <button 
                  onClick={() => setEditingProvider({ name: '', type: 'resend', config: {}, is_primary: false, is_active: true })}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                  <Plus size={18} /> Add Provider
                </button>
              </div>
              <div className="grid gap-4">
                {providers.map(p => (
                  <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                        <Settings className="text-zinc-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{p.name}</h3>
                          {p.is_primary && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-[10px] font-black uppercase rounded">Primary</span>}
                          {!p.is_active && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-black uppercase rounded">Inactive</span>}
                        </div>
                        <p className="text-zinc-500 text-sm uppercase tracking-widest">{p.type}</p>
                      </div>
                    </div>
                    <button onClick={() => setEditingProvider(p)} className="text-zinc-400 hover:text-white">
                      <Edit size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-800 text-zinc-400 text-xs uppercase font-black">
                  <tr>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 text-white font-medium">{log.recipient}</td>
                      <td className="px-6 py-4 text-zinc-400">{log.email_templates?.name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          log.status === 'sent' ? 'bg-green-500/20 text-green-500' : 
                          log.status === 'failed' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-500/20 text-zinc-500'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm font-bold"
                        >
                          <History size={14} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Selected Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
              <h2 className="text-xl font-black text-white">Log Details</h2>
              <button onClick={() => setSelectedLog(null)} className="text-zinc-400 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 block">Status</label>
                    <p className={`font-bold ${selectedLog.status === 'sent' ? 'text-green-500' : 'text-red-500'}`}>{selectedLog.status.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 block">Date</label>
                    <p className="text-white font-bold">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
               </div>
               <div>
                  <label className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 block">Recipient</label>
                  <p className="text-white font-bold">{selectedLog.recipient}</p>
               </div>
               <div>
                  <label className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 block">Error Message</label>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-sm text-red-400">
                    {selectedLog.error_message || 'None'}
                  </div>
               </div>
               <div>
                  <label className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 block">Metadata</label>
                  <pre className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-500 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
              <h2 className="text-2xl font-black text-white">Edit Template</h2>
              <button onClick={() => setEditingTemplate(null)} className="text-zinc-400 hover:text-white transition-colors"><X /></button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl mb-6">
                <h4 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} /> Pro Tip: Using Variables
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Use double curly braces like <code className="text-blue-400">{"{{user_name}}"}</code> to insert dynamic data. 
                  Common variables: <code className="text-zinc-300">order_id</code>, <code className="text-zinc-300">download_url</code>, <code className="text-zinc-300">site_url</code>, <code className="text-zinc-300">current_year</code>.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Name</label>
                  <input 
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-colors"
                    placeholder="e.g. Order Confirmed"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Subject</label>
                  <input 
                    value={editingTemplate.subject}
                    onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-colors"
                    placeholder="e.g. Your Order #{{order_id}} is Ready"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Body (HTML Supported)</label>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  <ReactQuill 
                    theme="snow"
                    value={editingTemplate.body}
                    onChange={val => setEditingTemplate({...editingTemplate, body: val})}
                    className="text-white h-[300px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Variables (Comma Separated)</label>
                <input 
                  value={editingTemplate.variables?.join(', ')}
                  onChange={e => setEditingTemplate({...editingTemplate, variables: e.target.value.split(',').map(v => v.trim()).filter(v => v)})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-colors"
                  placeholder="e.g. user_name, order_id, download_url"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setEditingTemplate(null)} className="px-6 py-2 text-zinc-400 hover:text-white font-bold">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Provider Modal */}
      {editingProvider && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
              <h2 className="text-2xl font-black text-white">Provider Settings</h2>
              <button onClick={() => setEditingProvider(null)} className="text-zinc-400 hover:text-white transition-colors"><X /></button>
            </div>
            <form onSubmit={handleSaveProvider} className="p-8 space-y-6">
              <div>
                <label className="block text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Name</label>
                <input 
                  value={editingProvider.name}
                  onChange={e => setEditingProvider({...editingProvider, name: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Type</label>
                <select 
                  value={editingProvider.type}
                  onChange={e => setEditingProvider({...editingProvider, type: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Config (JSON)</label>
                <div className="p-4 bg-zinc-950 rounded-xl border border-dashed border-zinc-800">
                  <p className="text-[10px] text-zinc-500 italic mb-4">Configuration for {editingProvider.type} (API Keys, Host, etc.)</p>
                  <textarea 
                    value={JSON.stringify(editingProvider.config, null, 2)}
                    onChange={e => {
                      try {
                        setEditingProvider({...editingProvider, config: JSON.parse(e.target.value)});
                      } catch(err) {}
                    }}
                    className="w-full h-40 bg-transparent font-mono text-sm text-zinc-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="is_primary"
                    checked={editingProvider.is_primary}
                    onChange={e => setEditingProvider({...editingProvider, is_primary: e.target.checked})}
                    className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_primary" className="text-zinc-400 font-bold">Primary</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="is_active"
                    checked={editingProvider.is_active}
                    onChange={e => setEditingProvider({...editingProvider, is_active: e.target.checked})}
                    className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-zinc-400 font-bold">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setEditingProvider(null)} className="px-6 py-3 text-zinc-400 font-bold hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all">Save Provider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Template Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
              <div>
                <h2 className="text-xl font-black text-white">Preview: {previewTemplate.name}</h2>
                <p className="text-sm text-zinc-500">Subject: {previewTemplate.subject}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-zinc-400 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto bg-white">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: previewTemplate.body.replace(/\{\{(.*?)\}\}/g, (match: string, p1: string) => {
                    return `<span style="background: #eff6ff; color: #1d4ed8; padding: 2px 4px; border-radius: 4px; font-weight: bold;">[${p1.trim()}]</span>`;
                  }) 
                }} 
              />
            </div>
            <div className="p-6 border-t border-zinc-800 flex justify-end bg-zinc-800/20">
              <button 
                onClick={() => setPreviewTemplate(null)} 
                className="px-8 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
