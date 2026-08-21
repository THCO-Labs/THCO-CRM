import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Wrench, Users, FolderKanban, MessageSquare, LayoutDashboard, Building2,
  ArrowUpRight, CheckCircle2,
} from "lucide-react";
import { unitsAPI } from "../lib/api";
import { toast } from "sonner";

const ICON_MAP = {
  "layers": Building2, "building-2": Building2, "users": Users, "briefcase": Users,
  "wrench": Wrench, "trending-up": Wrench, "megaphone": Wrench, "graduation-cap": Users,
  "code": Wrench, "truck": Wrench, "clipboard-list": Users, "headphones": Wrench,
  "folder-kanban": FolderKanban, "lightbulb": Wrench,
};

const UnitPage = () => {
  const { slug } = useParams();
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await unitsAPI.get(slug);
        if (active) setUnit(u);
      } catch (e) {
        if (active) toast.error("Unit not found");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return <div className="max-w-[1100px] mx-auto"><div className="h-48 bg-[#EFEDE8] rounded-2xl animate-pulse" /></div>;
  }
  if (!unit) {
    return (
      <div className="max-w-[1100px] mx-auto lux-card p-10 text-center text-gray-400">
        <p className="text-sm">This business unit doesn't exist or you don't have access.</p>
        <Link to="/dashboard" className="text-[#179C76] text-sm">Back to dashboard</Link>
      </div>
    );
  }

  const cfg = unit.config || {};
  const sections = cfg.sections || { overview: true, tools: true, team: true, flow: true, feedback: true };
  const tasks = cfg.userTasks || [];
  const Icon = ICON_MAP[unit.icon] || Building2;
  const accent = unit.accent || "#1FB58A";

  return (
    <div className="max-w-[1100px] mx-auto space-y-8" data-testid={`unit-page-${slug}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}1A`, border: `1px solid ${accent}55` }}
        >
          <Icon className="w-7 h-7" style={{ color: accent }} />
        </div>
        <div>
          <p className="lux-eyebrow mb-1">Business Unit</p>
          <h1 className="font-display text-3xl text-gray-900">{unit.name}</h1>
          {unit.lead && <p className="text-[13px] text-gray-500 mt-1">Lead · <span className="text-gray-700 font-medium">{unit.lead}</span></p>}
        </div>
      </div>
      {unit.description && <p className="text-[15px] text-gray-600 max-w-[760px]">{unit.description}</p>}

      {/* Overview stats */}
      {sections.overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Team Members", value: unit.member_count || 0, icon: Users },
            { label: "Tools Available", value: 0, icon: Wrench },
            { label: "Open Tasks", value: 0, icon: LayoutDashboard },
          ].map(({ label, value, icon: I }) => (
            <div key={label} className="lux-card p-6 flex items-center gap-5">
              <div className="w-11 h-11 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
                <I className="w-[18px] h-[18px] text-[#A9834E]" strokeWidth={1.6} />
              </div>
              <div>
                <p className="font-display text-[32px] leading-none text-gray-900">{value}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 mt-2">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* What members do */}
      {tasks.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-4">What You'll Be Doing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasks.map((t, i) => (
              <div key={i} className="lux-card p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
                <p className="text-[14px] text-gray-700">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tools */}
      {sections.tools && (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-4">Tools</h2>
          <div className="lux-card p-8 text-center text-gray-400">
            <Wrench className="w-7 h-7 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tools deployed for this unit yet.</p>
          </div>
        </div>
      )}

      {/* Crowther OS */}
      {sections.flow && (
        <Link to="/flow" className="lux-card lux-card-hover p-6 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-[#1B4332]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Crowther OS</p>
              <p className="text-[13px] text-gray-500">The 12-stage client pipeline for this unit's work</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-[#A9834E] transition-colors" />
        </Link>
      )}

      {/* Feedback */}
      {sections.feedback && (
        <Link to="/feedback" className="lux-card lux-card-hover p-6 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#1FB58A]/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#179C76]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Feedback & IT Support</p>
              <p className="text-[13px] text-gray-500">Send requests or complaints to the IT team</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-[#A9834E] transition-colors" />
        </Link>
      )}

      {/* Team */}
      {sections.team && (
        <div>
          <h2 className="font-display text-xl text-gray-900 mb-4">Team</h2>
          <div className="lux-card p-8 text-center text-gray-400">
            <Users className="w-7 h-7 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{unit.member_count || 0} member{(unit.member_count || 0) === 1 ? "" : "s"} in this unit.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitPage;
