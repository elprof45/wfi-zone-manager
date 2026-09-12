'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
    Users,
    UserPlus,
    ShieldCheck,
    UserCheck,
    Crown,
    Search,
    MoreVertical,
    Ban,
    Trash2,
    Edit3,
    Eye,
    EyeOff,
    RefreshCw,
    X,
    Check,
    AlertTriangle,
    Mail,
    Lock,
    User
} from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@/components/ui/skeleton';

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserRole = 'super_admin' | 'admin' | 'cashier';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean;
  banReason: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UsersViewProps {
  currentUserId?: string;
  currentUserRole?: UserRole;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  super_admin: {
    label: 'Super Admin',
    color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800',
    icon: <Crown className="w-3 h-3" />,
  },
  admin: {
    label: 'Admin',
    color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  cashier: {
    label: 'Caissier',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800',
    icon: <UserCheck className="w-3 h-3" />,
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const { label, color, icon } = ROLES[role] ?? ROLES.cashier;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${color}`}>
      {icon}
      {label}
    </span>
  );
}

function UserAvatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return <Image src={image} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-neutral-800" />;
  }
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-purple-500 to-violet-600',
    'from-rose-500 to-pink-600',
  ];
  const gradient = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-neutral-800`}>
      {initials}
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: UserRecord) => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' as UserRole });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2) e.name = 'Nom trop court (min 2 caractères)';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide';
    if (!form.password || form.password.length < 8) e.password = 'Mot de passe trop court (min 8 caractères)';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      toast.success(`Utilisateur ${form.name} créé avec succès`);
      onCreated(data.user);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white text-sm">Nouvel utilisateur</h2>
              <p className="text-xs text-neutral-500">Créer un compte accès au système</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(e2 => ({ ...e2, name: '' })); }}
                placeholder="Jean Dupont"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/60 border rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.name ? 'border-red-400' : 'border-neutral-200 dark:border-neutral-700'}`}
              />
            </div>
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="email"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(e2 => ({ ...e2, email: '' })); }}
                placeholder="jean@domaine.com"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/60 border rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.email ? 'border-red-400' : 'border-neutral-200 dark:border-neutral-700'}`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(e2 => ({ ...e2, password: '' })); }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/60 border rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.password ? 'border-red-400' : 'border-neutral-200 dark:border-neutral-700'}`}
              />
              <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition cursor-pointer">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Rôle</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ROLES) as [UserRole, typeof ROLES[UserRole]][]).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: key }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition cursor-pointer ${
                    form.role === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Création...</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Créer</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onUpdated,
  canChangeRole,
}: {
  user: UserRecord;
  onClose: () => void;
  onUpdated: (u: UserRecord) => void;
  canChangeRole: boolean;
}) {
  const [form, setForm] = useState({ name: user.name, role: user.role, banned: user.banned, banReason: user.banReason ?? '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: form.name,
          role: canChangeRole ? form.role : undefined,
          banned: form.banned,
          banReason: form.banned ? form.banReason || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      toast.success('Utilisateur mis à jour');
      onUpdated(data.user);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} image={user.image} />
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white text-sm">{user.name}</p>
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Nom complet</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {canChangeRole && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Rôle</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(ROLES) as [UserRole, typeof ROLES[UserRole]][]).map(([key, { label, icon }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: key }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition cursor-pointer ${
                      form.role === key
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                    }`}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ban toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Accès suspendu</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, banned: !f.banned }))}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.banned ? 'bg-red-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.banned ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {form.banned && (
              <input
                type="text"
                value={form.banReason}
                onChange={e => setForm(f => ({ ...f, banReason: e.target.value }))}
                placeholder="Raison de la suspension..."
                className="w-full px-4 py-2 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function UsersView({ currentUserId, currentUserRole = 'admin' }: UsersViewProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const canManageUsers = currentUserRole === 'super_admin' || currentUserRole === 'admin';
  const canChangeRoles = currentUserRole === 'super_admin';
  const canDeleteUsers = currentUserRole === 'super_admin';

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchUsers(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setActiveMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingUserId(id);
  };

  const confirmDelete = async () => {
    if (!deletingUserId) return;
    try {
      const res = await fetch(`/api/users?id=${deletingUserId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Utilisateur supprimé');
      setUsers(u => u.filter(x => x.id !== deletingUserId));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingUserId(null);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: users.length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
    admins: users.filter(u => u.role === 'admin').length,
    cashiers: users.filter(u => u.role === 'cashier').length,
    banned: users.filter(u => u.banned).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Utilisateurs
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Gérez les accès et rôles du système
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canManageUsers && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Nouvel utilisateur
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-neutral-900 dark:text-white', bg: 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700', icon: <Users className="w-4 h-4 text-neutral-500" /> },
          { label: 'Super Admin', value: stats.superAdmins, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: <Crown className="w-4 h-4 text-amber-500" /> },
          { label: 'Admins', value: stats.admins, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', icon: <ShieldCheck className="w-4 h-4 text-blue-500" /> },
          { label: 'Caissiers', value: stats.cashiers, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon: <UserCheck className="w-4 h-4 text-emerald-500" /> },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg}`}>
            <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">{s.icon}</div>
            <div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-neutral-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'super_admin', 'admin', 'cashier'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                roleFilter === r
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              {r === 'all' ? 'Tous' : ROLES[r]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <Users className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">{search ? 'Aucun résultat trouvé' : 'Aucun utilisateur'}</p>
            {!search && canManageUsers && (
              <button onClick={() => setShowCreateModal(true)} className="mt-3 text-blue-500 text-sm hover:underline cursor-pointer">
                Créer le premier utilisateur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Créé le</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    {/* User info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} image={user.image} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-neutral-900 dark:text-white">{user.name}</p>
                            {user.id === currentUserId && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-800">
                                Vous
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      {user.banned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800">
                          <Ban className="w-3 h-3" /> Suspendu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800">
                          <Check className="w-3 h-3" /> Actif
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {canManageUsers && user.id !== currentUserId && (
                        <div className="relative inline-block">
                          <button
                            onClick={e => { e.stopPropagation(); setActiveMenu(m => m === user.id ? null : user.id); }}
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4 text-neutral-500" />
                          </button>

                          {activeMenu === user.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-20 overflow-hidden"
                            >
                              <button
                                onClick={() => { setEditingUser(user); setActiveMenu(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" /> Modifier
                              </button>
                              {canDeleteUsers && (
                                <button
                                  onClick={() => { handleDelete(user.id); setActiveMenu(null); }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" /> Supprimer
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Banned banner */}
      {stats.banned > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>{stats.banned}</strong> utilisateur{stats.banned > 1 ? 's' : ''} suspendu{stats.banned > 1 ? 's' : ''} — leur accès au système est bloqué.
          </p>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={u => setUsers(prev => [u, ...prev])}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={u => setUsers(prev => prev.map(x => x.id === u.id ? u : x))}
          canChangeRole={canChangeRoles}
        />
      )}

      {/* Delete confirmation */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Supprimer l&apos;utilisateur</p>
                <p className="text-xs text-neutral-500">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              L&apos;utilisateur et toutes ses sessions seront définitivement supprimés.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingUserId(null)} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer">
                Annuler
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition cursor-pointer">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
