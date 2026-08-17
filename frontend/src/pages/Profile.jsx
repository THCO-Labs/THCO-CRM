import { useState, useEffect, useRef } from "react";
import { User, Lock, CheckCircle2, AlertCircle, Camera, Cake, Loader2, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import DateField from "../components/ui/date-field";
import { Label } from "../components/ui/label";
import { authAPI } from "../lib/api";
import { toast } from "sonner";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [savingPic, setSavingPic] = useState(false);
  const picRef = useRef(null);
  const [savingPw, setSavingPw] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const u = await authAPI.getMe();
        setUser(u);
        setName(u.name || "");
        setBirthday(u.birthday || "");
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
      await authAPI.updateMe({ name: name.trim() });
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

  // Shrunk in the browser before it is sent. The picture is stored on the
  // account as a data URL so every avatar in the app -- all plain <img src> --
  // keeps working without a signed request; that is only reasonable if the
  // image is small, so it is squared and capped at 256px here rather than
  // uploading whatever came off a phone camera.
  const downscale = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read that file"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("That file is not an image"));
        img.onload = () => {
          const size = 256;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          // Cover, not stretch: crop to the middle square.
          const side = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2,
                        side, side, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  const savePicture = async (file) => {
    if (!file) return;
    setSavingPic(true);
    try {
      const dataUrl = await downscale(file);
      await authAPI.updateMe({ picture: dataUrl });
      setUser(await authAPI.getMe());
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Could not save that photo");
    } finally {
      setSavingPic(false);
    }
  };

  const removePicture = async () => {
    setSavingPic(true);
    try {
      await authAPI.updateMe({ picture: "" });
      setUser(await authAPI.getMe());
      toast.success("Photo removed");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not remove it");
    } finally {
      setSavingPic(false);
    }
  };

  const saveBirthday = async () => {
    setSavingBirthday(true);
    try {
      await authAPI.updateMe({ birthday });
      setUser(await authAPI.getMe());
      toast.success(birthday ? "Birthday saved" : "Birthday cleared");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save your birthday");
    } finally {
      setSavingBirthday(false);
    }
  };

  const savePassword = async () => {
    const errs = {};
    if (!currentPassword) errs.current = "Enter your current password";
    // Matches what the server enforces. They disagreed before: this said six,
    // the server said eight, so a seven-character password passed here and
    // was refused on save with a message that contradicted the form.
    if (newPassword.length < 8) errs.new = "New password must be at least 8 characters";
    if (newPassword !== confirmPassword) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSavingPw(true);
    try {
      // The current password is sent and checked. It used to be collected and
      // discarded -- the field asked for it, nothing verified it, so anybody
      // at an unattended screen could set a new one.
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success("Password changed — other devices have been signed out");
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
          <div className="relative group/pic">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                className="w-14 h-14 rounded-full object-cover border border-[#EAE7E0]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C6A15B] to-[#8F7340] flex items-center justify-center text-[#0C0F13] text-xl font-semibold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <input
              ref={picRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { savePicture(e.target.files?.[0]); e.target.value = ""; }}
              data-testid="profile-picture-input"
            />
            <button
              type="button"
              onClick={() => picRef.current?.click()}
              disabled={savingPic}
              title="Change photo"
              data-testid="profile-picture-btn"
              className="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center disabled:opacity-50"
            >
              {savingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-gray-900">{user.name}</p>
            <p className="text-[13px] text-gray-500">{user.email}</p>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#A9834E] mt-1">{roleLabel}</p>
            {user.picture && (
              <button
                type="button"
                onClick={removePicture}
                disabled={savingPic}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Remove photo
              </button>
            )}
          </div>
        </div>

        {/* Birthday. Filled in by the person themselves rather than waiting on
            an administrator, which is why the calendar had none. Only the day
            and month are ever shown to anyone else. */}
        <div className="space-y-2 mb-6" data-testid="profile-birthday">
          <Label htmlFor="birthday" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
            Birthday
          </Label>
          <div className="flex gap-3">
            <div className="flex-1">
              <DateField
                value={birthday}
                onChange={setBirthday}
                icon={Cake}
                data-testid="birthday-input"
                className="h-11"
              />
            </div>
            <Button
              onClick={saveBirthday}
              disabled={savingBirthday}
              className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-lg px-5 h-11"
              data-testid="birthday-save"
            >
              {savingBirthday ? "Saving…" : "Save"}
            </Button>
          </div>
          <p className="text-[11px] text-gray-400">
            {user.birthday
              ? "Shown on the team calendar as a day and month. Your year is never displayed."
              : "Add it and it appears on the team calendar — day and month only, never the year."}
          </p>
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
