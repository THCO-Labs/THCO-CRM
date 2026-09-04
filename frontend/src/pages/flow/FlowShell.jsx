import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Kanban, FolderKanban, Users2, Calendar, Target,
  Ticket, MessageSquare, Settings, Plus, Search, ChevronRight, ArrowLeft, Gauge
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { flowAPI } from "../../lib/api";

const FLOW_NAV = [
  { path: "/flow",            label: "Dashboard",   icon: LayoutDashboard, key: "dashboard" },
  { path: "/flow/board",      label: "Pipeline",    icon: Kanban,          key: "board" },
  // Oversight across every project at once, rather than one project at a time.
  // Sits next to the pipeline because that is the other "all projects" view.
  { path: "/flow/control-tower", label: "Control Tower", icon: Gauge,      key: "control-tower" },
  { path: "/flow/projects",   label: "Projects",    icon: FolderKanban,    key: "projects" },
  { path: "/flow/contacts",   label: "Contacts",    icon: Users2,          key: "contacts" },
  { path: "/flow/calendar",   label: "Calendar",    icon: Calendar,        key: "calendar" },
  { path: "/flow/prospects",  label: "Prospects",   icon: Target,          key: "prospects" },
  { path: "/flow/tickets",    label: "Tickets",     icon: Ticket,          key: "tickets" },
  { path: "/flow/messages",   label: "Messages",    icon: MessageSquare,   key: "messages" },
  { path: "/flow/admin/roles", label: "Roles",      icon: Settings,        key: "roles" },
];

export const FlowShell = ({ children, title, action }) => {
  const location = useLocation();
  return (
    <div className="space-y-6" data-testid="flow-shell">
      {/* The page title bar above this (DashboardLayout) already says
          "Crowther OS" -- a second one here, with its own icon and tagline,
          just repeated the same thing directly underneath it. */}
      <div className="sticky top-0 z-20 -mx-4 px-4 lg:-mx-8 lg:px-8 py-3 flex items-center justify-between gap-3 border-b border-[#EAE7E0] bg-[#F7F6F3]/95 backdrop-blur-md">
        <div className="flex gap-1 overflow-x-auto" data-testid="flow-nav">
          {FLOW_NAV.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === n.path || (n.path !== "/flow" && location.pathname.startsWith(n.path));
            return (
              <Link
                key={n.key}
                to={n.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-[#1B4332] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                data-testid={`flow-nav-${n.key}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {n.label}
              </Link>
            );
          })}
        </div>
        {action}
      </div>

      {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
      {children}
    </div>
  );
};

export default FlowShell;
