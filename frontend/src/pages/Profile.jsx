import { useState, useEffect } from "react";
import { User, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { authAPI, usersAPI } from "../lib/api";
import { toast } from "sonner";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const u = await authAPI.getMe();
        setUser(u);
        setName(u.name || "");
      } catch (e) {
        toast.error("Failed to load profile");
      }
    };
    load();
  }, []);

  const saveName = async () => {
    if (!name.trim()) {
      setErrors({ name: "Name cannot be empty" });
      return;
    }
    setSavingName(true);
    try {
      await usersAPI.update(user.user_id, { name: name.trim() });
      toast.success("Profile name updated");
      setErrors({});
      // refresh local user
      const u = await authAPI.getMe();
      setUser(u);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    const errs = {};
    if (!currentPassword) errs.current = "Enter your current password";
    if (newPassword.length < 6) errs.new = "New password must be at least 6 characters";
    if (newPassword !== confirmPassword) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSavingPw(true);
    try {
      await usersAPI.update(user.user_id, { password: newPassword });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-[760px] mx-auto py-10">
        <div className="h-40 bg-[#EFEDE8] rounded-2xl animate-pulse" />
      </div>
    );
  }

  const roleLabel =
    user.role === "super_admin" ? "Super Admin" : user.role === "mini_admin" ? "Admin" : user.is_hr ? "HR" : "Team Member";

  return (
    <div className="max-w-[760px] mx-auto space-y-6">
      <div>
        <p className="lux-eyebrow mb-2">Account</p>
        <h1 className="font-display text-3xl text-gray-900">Profile</h1>
      </div>

      {/* Identity card */}
      <div className="lux-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C6A15B] to-[#8F7340] flex items-center justify-center text-[#0C0F13] text-xl font-semibold">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="text-[15px] font-medium text-gray-900">{user.name}</p>
            <p className="text-[13px] text-gray-500">{user.email}</p>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#A9834E] mt-1">{roleLabel}</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
            Full Name
          </Label>
          <div className="flex gap-3">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-white border-[#EAE7E0] text-gray-900 focus:border-[#C6A15B] focus:ring-[#C6A15B]/20 rounded-lg text-[14px]"
            />
            <Button
              onClick={saveName}
              disabled={savingName}
              className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-lg px-5 h-11"
            >
              {savingName ? "Saving…" : "Save"}
            </Button>
          </div>
          {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
        </div>
      </div>

      {/* Password */}
      <div className="lux-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#A9834E]" />
          <h2 className="font-display text-lg text-gray-900">Change Password</h2>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Current Password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-11 bg-white border-[#EAE7E0] text-gray-900 rounded-lg text-[14px]"
          />
          {errors.current && <p className="text-red-500 text-xs">{errors.current}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">New Password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-11 bg-white border-[#EAE7E0] text-gray-900 rounded-lg text-[14px]"
          />
          {errors.new && <p className="text-red-500 text-xs">{errors.new}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Confirm New Password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 bg-white border-[#EAE7E0] text-gray-900 rounded-lg text-[14px]"
          />
          {errors.confirm && <p className="text-red-500 text-xs">{errors.confirm}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={savePassword}
            disabled={savingPw}
            className="bg-[#1FB58A] hover:bg-[#179C76] text-white rounded-lg px-5 h-11"
          >
            {savingPw ? "Updating…" : "Update Password"}
          </Button>
          <span className="text-[12px] text-gray-400">At least 6 characters.</span>
        </div>
      </div>
    </div>
  );
};

export default Profile;
