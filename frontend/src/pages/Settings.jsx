import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, Webhook, UserCog, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { authAPI, usersAPI, settingsAPI } from "../lib/api";
import { toast } from "sonner";
import { hasFullAccess } from "../context/UserContext";

const UNIT_LABELS = {
  talent: "Talent & Delivery",
  "thco-hr": "THCO HR",
  flow: "THCO Flow",
  "it-tools": "IT & THCO Tools",
  sales: "Sales & Business Dev",
  marketing: "Marketing & Brand",
  advisory: "Advisory & Consulting",
  technology: "Technology & Build",
  operations: "Operations & Finance",
  academy: "Academy & Learning",
  "client-delivery": "Client Delivery",
};

const Settings = () => {
  const [user, setUser] = useState(null);
  const [webhooks, setWebhooks] = useState({ sourcing_webhook_url: "", database_search_webhook_url: "" });
  const [savingWebhooks, setSavingWebhooks] = useState(false);
  const [testing, setTesting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await authAPI.getMe();
        setUser(u);
        if (u.role === "super_admin") {
          const wh = await settingsAPI.getWebhooks();
          setWebhooks(wh);
        }
      } catch (e) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isAdmin = user?.role === "super_admin";

  const handleSaveWebhooks = async () => {
    setSavingWebhooks(true);
    try {
      await settingsAPI.updateWebhooks(webhooks);
      toast.success("Integrations saved");
    } catch (e) {
      toast.error("Failed to save integrations");
    } finally {
      setSavingWebhooks(false);
    }
  };

  const handleTestWebhook = async (type, url) => {
    if (!url) return toast.error("Enter a webhook URL first");
    setTesting(type);
    try {
      const r = await settingsAPI.testWebhook(type, url);
      if (r.success) toast.success(`Webhook OK (${r.status_code})`);
      else toast.error(`Webhook failed (${r.status_code})`);
    } catch (e) {
      toast.error("Webhook test failed");
    } finally {
      setTesting(null);
    }
  };

  if (loading || !user) {
    return <div className="max-w-[820px] mx-auto py-10"><div className="h-48 bg-[#EFEDE8] rounded-2xl animate-pulse" /></div>;
  }

  const roleLabel = isAdmin ? "Super Admin" : user.role === "mini_admin" ? "Admin" : user.is_hr ? "HR" : "Team Member";

  return (
    <div className="max-w-[820px] mx-auto space-y-6">
      <div>
        <p className="lux-eyebrow mb-2">Preferences</p>
        <h1 className="font-display text-3xl text-gray-900">Settings</h1>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="bg-gray-100 border border-gray-200 p-1 rounded-xl">
          <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px]">
            Account
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="integrations" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px]">
              Integrations
            </TabsTrigger>
          )}
        </TabsList>

        {/* Account tab — all users */}
        <TabsContent value="account" className="mt-2 space-y-6">
          <div className="lux-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C6A15B] to-[#8F7340] flex items-center justify-center text-[#0C0F13] text-lg font-semibold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-[15px] font-medium text-gray-900">{user.name}</p>
                <p className="text-[13px] text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div className="rounded-lg bg-[#FBF8F1] border border-[#EAE7E0] p-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">Role</p>
                <p className="text-gray-800 font-medium">{roleLabel}</p>
              </div>
              <div className="rounded-lg bg-[#FBF8F1] border border-[#EAE7E0] p-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">Status</p>
                <p className="text-gray-800 font-medium capitalize">{user.status || "active"}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 mb-2">Your Access</p>
              <div className="flex flex-wrap gap-2">
                {(user.accessible_units || []).map((u) => (
                  <span key={u} className="px-3 py-1 rounded-full bg-[#1FB58A]/10 text-[#179C76] text-[12px] font-medium border border-[#1FB58A]/20">
                    {UNIT_LABELS[u] || u}
                  </span>
                ))}
                {(!user.accessible_units || user.accessible_units.length === 0) && (
                  <span className="text-[12px] text-gray-400">No units assigned</span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#F0EEE9]">
              <Link to="/profile" className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#EFEDE8] flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-[#A9834E]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">Profile & Password</p>
                    <p className="text-[12px] text-gray-500">Edit your name and change your password</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#A9834E] transition-colors" />
              </Link>
            </div>
          </div>

          {hasFullAccess(user) && (
            <div className="lux-card p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1FB58A]/10 flex items-center justify-center">
                  <UserCog className="w-4 h-4 text-[#179C76]" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-gray-900">Administration</p>
                  <p className="text-[12px] text-gray-500">Manage users, units and permissions</p>
                </div>
              </div>
              <Link to="/admin/users">
                <Button variant="outline" className="border-[#EAE7E0] text-gray-700 hover:bg-[#FBFAF7] rounded-lg">Manage</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        {/* Integrations tab — super admin only */}
        {isAdmin && (
          <TabsContent value="integrations" className="mt-2 space-y-6">
            <div className="lux-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#A9834E]" />
                <h2 className="font-display text-lg text-gray-900">Webhook Integrations</h2>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">AI Candidate Sourcing</Label>
                <div className="flex gap-3">
                  <Input
                    value={webhooks.sourcing_webhook_url}
                    onChange={(e) => setWebhooks({ ...webhooks, sourcing_webhook_url: e.target.value })}
                    placeholder="https://your-n8n.app.n8n.cloud/webhook/thco-sourcing"
                    className="flex-1 bg-white border-[#EAE7E0] text-gray-900 rounded-lg"
                  />
                  <Button variant="outline" onClick={() => handleTestWebhook("sourcing", webhooks.sourcing_webhook_url)} disabled={testing === "sourcing"} className="border-[#EAE7E0] rounded-lg">
                    {testing === "sourcing" ? "Testing…" : "Test"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Database Search</Label>
                <div className="flex gap-3">
                  <Input
                    value={webhooks.database_search_webhook_url}
                    onChange={(e) => setWebhooks({ ...webhooks, database_search_webhook_url: e.target.value })}
                    placeholder="https://your-n8n.app.n8n.cloud/webhook/thco-talent-match"
                    className="flex-1 bg-white border-[#EAE7E0] text-gray-900 rounded-lg"
                  />
                  <Button variant="outline" onClick={() => handleTestWebhook("database", webhooks.database_search_webhook_url)} disabled={testing === "database"} className="border-[#EAE7E0] rounded-lg">
                    {testing === "database" ? "Testing…" : "Test"}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveWebhooks} disabled={savingWebhooks} className="bg-[#1FB58A] hover:bg-[#179C76] text-white rounded-lg px-6">
                  {savingWebhooks ? "Saving…" : "Save Integrations"}
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
