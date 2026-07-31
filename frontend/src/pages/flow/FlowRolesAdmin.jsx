import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowShell from "./FlowShell";
import { flowAPI, usersAPI, authAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Loader2, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function FlowRolesAdmin() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRole, setOpenRole] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const me = await authAPI.getMe();
      if (!(me.role === "super_admin" || me.is_hr)) {
        toast.error("Only admins or HR can manage flow roles");
        navigate("/flow");
        return;
      }
      setAuthorized(true);
      const [r, u] = await Promise.all([flowAPI.listRoles(), usersAPI.getAll()]);
      setRoles(r);
      setUsers(u);
    } catch (e) { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = async (user_id, flag, value) => {
    try { await flowAPI.assignRole(user_id, flag, value); toast.success("Updated"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <FlowShell title="Flow role assignments">
      {!authorized ? null : (
      <>
      <p className="text-sm text-gray-500 mb-4">
        Map workflow stages to people. The system sends automated emails when a project enters a stage requiring action.
      </p>

      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div> : (
        <div className="space-y-3" data-testid="roles-list">
          {roles.map((r) => (
            <div key={r.flag} className="bg-white rounded-xl border border-gray-100 p-4" data-testid={`role-${r.flag}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{r.label}</h3>
                  <p className="text-xs text-gray-400 font-mono">{r.flag}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenRole(r)} data-testid={`add-to-${r.flag}`}>
                  <Plus className="w-3 h-3 mr-1" />Assign user
                </Button>
              </div>
              {r.users.length === 0 ? (
                <p className="text-xs text-amber-600">⚠ No users assigned. Stage emails will not be sent for this role.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {r.users.map((u) => (
                    <span key={u.user_id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1B4332]/10 text-[#1B4332] text-xs rounded-full" data-testid={`assigned-${r.flag}-${u.user_id}`}>
                      <Check className="w-3 h-3" />
                      {u.name} <span className="text-gray-500 font-mono text-[10px]">({u.email})</span>
                      <button onClick={() => toggle(u.user_id, r.flag, false)} className="ml-1 hover:bg-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openRole && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Assign user → {openRole.label}</h3>
              <button onClick={() => setOpenRole(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Click a user to grant this role.</p>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {users.filter(u => !openRole.users.find(x => x.user_id === u.user_id)).map(u => (
                <button
                  key={u.user_id}
                  onClick={async () => { await toggle(u.user_id, openRole.flag, true); setOpenRole(null); }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm flex items-center justify-between"
                  data-testid={`grant-${openRole.flag}-${u.user_id}`}
                >
                  <span>{u.name}</span>
                  <span className="text-xs text-gray-400">{u.email}</span>
                </button>
              ))}
              {users.filter(u => !openRole.users.find(x => x.user_id === u.user_id)).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">All eligible users already assigned.</p>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </FlowShell>
  );
}
