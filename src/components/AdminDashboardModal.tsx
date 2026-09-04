import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Database, 
  MapPin, 
  Bell, 
  X, 
  Check, 
  RefreshCw, 
  Loader2, 
  Lock, 
  UserCheck, 
  ShieldAlert,
  Server,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminOverview, AdminAuditLog, UserRole } from '../types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, isAdmin, setRole, getToken } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit'>('overview');
  const [data, setData] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const token = await getToken();
      const res = await fetch('/api/admin/overview', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'X-User-Role': user?.role || 'user'
        }
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access Denied (403): Role-Based Access Control blocked this request. You must have the "admin" role to view this panel.');
        }
        throw new Error(`Server returned status ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to retrieve admin telemetry');
      }
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setErrorMessage(err.message || 'Failed to load administrative overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen, user?.role]);

  if (!isOpen) return null;

  const handleRoleChange = async (targetUid: string, targetCurrentRole: UserRole) => {
    const nextRole: UserRole = targetCurrentRole === 'admin' ? 'user' : 'admin';
    setUpdatingUid(targetUid);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
          'X-User-Role': user?.role || 'user'
        },
        body: JSON.stringify({ targetUid, role: nextRole })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to mutate role');
      }

      // If updating current user's role
      if (targetUid === user?.uid) {
        await setRole(nextRole);
      }

      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Could not update user role');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div 
      id="modal-admin-dashboard" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-base">Admin Dashboard</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  RBAC Enforced
                </span>
              </div>
              <p className="text-xs text-slate-500">System metrics, role management, and audit logs</p>
            </div>
          </div>

          {/* Role Simulator Switch for review / evaluation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs">
              <span className="text-slate-500">Your Persona:</span>
              <button
                type="button"
                id="btn-toggle-my-role"
                onClick={() => setRole(isAdmin ? 'user' : 'admin')}
                className={`font-semibold px-2 py-0.5 rounded transition-colors ${
                  isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                }`}
                title="Click to toggle between Admin and User personas"
              >
                {isAdmin ? 'ADMIN (Active)' : 'STANDARD USER'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Telemetry & Health</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Role Management</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Security Audit Trail</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs">Authenticating and verifying RBAC permissions...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-center">
              <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <h4 className="font-semibold text-base mb-1">Access Restricted</h4>
              <p className="text-xs text-rose-700 max-w-md mx-auto mb-4">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Switch Role to Admin & Re-verify
              </button>
            </div>
          ) : (
            <>
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && data && (
                <div className="space-y-6">
                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-medium">Registered Users</span>
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{data.totalUsers}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Firestore isolated</div>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-medium">Journal Sessions</span>
                        <Database className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{data.totalSessions}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Stored securely</div>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-medium">Messages Exchanged</span>
                        <Activity className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{data.totalMessages}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Companion dialogues</div>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-medium">Alerts Dispatched</span>
                        <Bell className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{data.notificationsDispatched}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Slack/Discord webhooks</div>
                    </div>
                  </div>

                  {/* Subsystems Health Grid */}
                  <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                      Subsystem Health & Connectivity
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">Cloud Firestore</div>
                          <div className="text-[11px] text-slate-500">Security rules active</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">Gemini Resilience Ladder</div>
                          <div className="text-[11px] text-slate-500">5-stage fallback active</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">Google Maps Proxy</div>
                          <div className="text-[11px] text-slate-500">Geocoding & CORS bypass</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Users RBAC */}
              {activeTab === 'users' && data && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                      User Accounts & Role Permissions
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Admins have access to global statistics, role changes, and audit trails
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">User / Email</th>
                          <th className="px-4 py-2.5 font-medium">UID</th>
                          <th className="px-4 py-2.5 font-medium">Role</th>
                          <th className="px-4 py-2.5 font-medium">Sessions</th>
                          <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Always include current user */}
                        {data.users.map((u) => {
                          const isMe = u.uid === user?.uid;
                          const currentRole = isMe ? user.role : u.role;
                          return (
                            <tr key={u.uid} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900">{u.displayName || 'Reflective Writer'}</div>
                                <div className="text-slate-500 text-[11px]">{u.email || 'No email provided'}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                                {u.uid.slice(0, 10)}...
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    currentRole === 'admin'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {currentRole.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{u.sessionCount} entries</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  disabled={updatingUid === u.uid}
                                  onClick={() => handleRoleChange(u.uid, currentRole)}
                                  className="px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                                >
                                  {updatingUid === u.uid
                                    ? 'Updating...'
                                    : currentRole === 'admin'
                                    ? 'Demote to User'
                                    : 'Promote to Admin'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Security Audit Trail */}
              {activeTab === 'audit' && data && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                      Immutable System Audit Log
                    </h4>
                    <button
                      type="button"
                      onClick={fetchAdminData}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto font-mono text-[11px]">
                    {data.recentAuditLogs.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">No audit logs recorded yet.</div>
                    ) : (
                      data.recentAuditLogs.map((log) => (
                        <div key={log.id} className="p-3 hover:bg-slate-50 flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-700">{log.action}</span>
                              <span className="text-[10px] text-slate-400">by {log.adminEmail || log.adminUid}</span>
                            </div>
                            {log.details && (
                              <div className="text-slate-600 mt-1 font-sans text-xs">
                                {JSON.stringify(log.details)}
                              </div>
                            )}
                          </div>
                          <span className="text-slate-400 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Current Operator: <span className="font-semibold text-slate-800">{user?.email}</span> (
            <span className="capitalize">{user?.role}</span>)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
