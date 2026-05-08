"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Trash2, ToggleLeft, ToggleRight, X, Eye, EyeOff } from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  last_access: string | null;
  created_at: string;
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function loadUsers() {
    const res = await fetch("/api/usuarios");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear usuario");
    } else {
      setShowForm(false);
      setForm({ name: "", email: "", password: "" });
      loadUsers();
    }
    setSubmitting(false);
  }

  async function toggleActive(user: User) {
    await fetch(`/api/usuarios/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    loadUsers();
  }

  async function handleDelete(user: User) {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/usuarios/${user.id}`, { method: "DELETE" });
    loadUsers();
  }

  function fmt(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Usuarios</h1>
            <p className="text-xs text-gray-400">Gestión de acceso al panel</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nuevo usuario
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Crear usuario</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre completo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@vematel.com.ar"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {submitting ? "Creando…" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No hay usuarios. Creá el primero con el botón de arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500">Usuario</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500">Último acceso</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500">Estado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">{fmt(u.last_access)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      u.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        title={u.is_active ? "Desactivar" : "Activar"}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {u.is_active ? <ToggleRight size={20} className="text-blue-500" /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        title="Eliminar"
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Los usuarios inactivos no pueden iniciar sesión. Las contraseñas se almacenan hasheadas con bcrypt.
      </p>
    </div>
  );
}
