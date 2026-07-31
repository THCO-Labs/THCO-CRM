import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Kanban, FolderKanban, Users2, Calendar, Target,
  Ticket, MessageSquare, Settings, Plus, Search, ChevronRight, ArrowLeft
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { flowAPI } from "../../lib/api";

const FLOW_NAV = [
  { path: "/flow",            label: "Dashboard",   icon: LayoutDashboard, key: "dashboard" },
  { path: "/flow/board",      label: "Pipeline",    icon: Kanban,          key: "board" },
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
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center">
            <span className="text-[#C9A84C] font-bold text-sm tracking-wider">F</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">THCO Flow</h1>
            <p className="text-xs text-gray-500">Project management — deal to delivery</p>
          </div>
        </div>
        {action}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1" data-testid="flow-nav">
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

      {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
      {children}
    </div>
  );
};

export default FlowShell;
