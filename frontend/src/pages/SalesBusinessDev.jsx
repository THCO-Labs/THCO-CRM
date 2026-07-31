import { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Mail, 
  UserPlus, 
  RefreshCw,
  Plus,
  Search,
  Filter,
  Phone,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";

// 4 Intake Paths as defined in Operating Cycle
const INTAKE_PATHS = [
  { 
    id: "outbound", 
    name: "Outbound", 
    icon: Mail, 
    color: "bg-blue-500",
    description: "AI agents research → Emmanuel warms → Rebecca closes",
    team: ["Rebecca", "Onia", "Emmanuel"]
  },
  { 
    id: "inbound", 
    name: "Inbound", 
    icon: TrendingUp, 
    color: "bg-green-500",
    description: "Content, newsletters, blog → Prospects come to us",
    team: ["Havilah", "Godwin", "Angela"]
  },
  { 
    id: "referrals", 
    name: "Referrals", 
    icon: UserPlus, 
    color: "bg-emerald-500",
    description: "Happy clients tell others → Warm introductions",
    team: ["Rebecca", "Marketing"]
  },
  { 
    id: "reactivation", 
    name: "Reactivation", 
    icon: RefreshCw, 
    color: "bg-orange-500",
    description: "320 existing clients → Cross-sell 5 pillars",
    team: ["Rebecca", "Emmanuel", "Michael", "Babatunde"]
  }
];

const SAMPLE_LEADS = [
  { id: 1, name: "TechCorp Nigeria", contact: "John Ade", email: "john@techcorp.ng", path: "outbound", status: "qualified", pillar: "Technology", value: "$45,000", nextAction: "Meeting scheduled", date: "2026-02-18" },
  { id: 2, name: "FinBank Ltd", contact: "Sarah Obi", email: "sarah@finbank.com", path: "inbound", status: "new", pillar: "Talent", value: "$25,000", nextAction: "Send proposal", date: "2026-02-17" },
  { id: 3, name: "RetailMax", contact: "Mike Chen", email: "mike@retailmax.com", path: "referrals", status: "proposal", pillar: "Advisory", value: "$35,000", nextAction: "Follow up", date: "2026-02-20" },
  { id: 4, name: "GlobalHealth Inc", contact: "Dr. Amina", email: "amina@globalhealth.com", path: "reactivation", status: "negotiation", pillar: "Technology", value: "$75,000", nextAction: "Ayo approval needed", date: "2026-02-19" },
  { id: 5, name: "EduTech Solutions", contact: "Peter Nwosu", email: "peter@edutech.ng", path: "outbound", status: "qualified", pillar: "Academy", value: "$18,000", nextAction: "Discovery call", date: "2026-02-21" },
  { id: 6, name: "ManufacturePro", contact: "Chidi Okoro", email: "chidi@manufacturepro.com", path: "inbound", status: "new", pillar: "Operate", value: "$55,000", nextAction: "Initial contact", date: "2026-02-16" },
];

const STATUSES = {
  new: { label: "New Lead", color: "bg-gray-100 text-gray-700" },
  qualified: { label: "Qualified", color: "bg-blue-100 text-blue-700" },
  proposal: { label: "Proposal Sent", color: "bg-yellow-100 text-yellow-700" },
  negotiation: { label: "Negotiation", color: "bg-emerald-100 text-emerald-700" },
  won: { label: "Won", color: "bg-green-100 text-green-700" },
  lost: { label: "Lost", color: "bg-red-100 text-red-700" }
};

const PILLARS = ["Technology", "Talent", "Advisory", "Academy", "Operate"];

const SalesBusinessDev = () => {
  const [leads, setLeads] = useState(SAMPLE_LEADS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPath, setFilterPath] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "", contact: "", email: "", path: "", pillar: "", value: ""
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPath = filterPath === "all" || lead.path === filterPath;
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    return matchesSearch && matchesPath && matchesStatus;
  });

  const pathStats = INTAKE_PATHS.map(path => ({
    ...path,
    count: leads.filter(l => l.path === path.id).length,
    value: leads.filter(l => l.path === path.id).reduce((sum, l) => sum + parseInt(l.value.replace(/\D/g, '')), 0)
  }));

  const totalPipeline = leads.reduce((sum, l) => sum + parseInt(l.value.replace(/\D/g, '')), 0);

  const handleAddLead = () => {
    if (!newLead.name || !newLead.contact) {
      toast.error("Please fill in company name and contact");
      return;
    }
    
    const lead = {
      id: Date.now(),
      ...newLead,
      status: "new",
      nextAction: "Initial contact",
      date: new Date().toISOString().split('T')[0]
    };
    
    setLeads([lead, ...leads]);
    setNewLead({ name: "", contact: "", email: "", path: "", pillar: "", value: "" });
    setIsAddModalOpen(false);
    toast.success("Lead added successfully");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Business Development</h1>
          <p className="text-gray-500 mt-1">4 intake paths feeding the THCO flywheel</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* 4 Intake Paths */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {pathStats.map((path, index) => {
          const Icon = path.icon;
          return (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setFilterPath(path.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${path.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{path.count}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{path.name}</h3>
              <p className="text-xs text-gray-500 mb-2">{path.description}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3 h-3" />
                {path.team.join(", ")}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-green-600">${path.value.toLocaleString()}</span>
                <span className="text-xs text-gray-400 ml-1">pipeline</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pipeline Summary */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Total Pipeline Value</p>
            <p className="text-4xl font-bold">${totalPipeline.toLocaleString()}</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{leads.length}</p>
              <p className="text-green-100 text-sm">Total Leads</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{leads.filter(l => l.status === "qualified").length}</p>
              <p className="text-green-100 text-sm">Qualified</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{leads.filter(l => l.status === "negotiation").length}</p>
              <p className="text-green-100 text-sm">Negotiation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPath} onValueChange={setFilterPath}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Intake Path" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Paths</SelectItem>
            {INTAKE_PATHS.map(path => (
              <SelectItem key={path.id} value={path.id}>{path.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUSES).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterPath !== "all" && (
          <Button variant="outline" size="sm" onClick={() => setFilterPath("all")}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Path</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pillar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Next Action</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.map((lead, index) => {
              const pathInfo = INTAKE_PATHS.find(p => p.id === lead.path);
              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{lead.contact}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-white ${pathInfo?.color}`}>
                      {pathInfo?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {lead.pillar}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUSES[lead.status].color}`}>
                      {STATUSES[lead.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-green-600">{lead.value}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{lead.nextAction}</p>
                    <p className="text-xs text-gray-400">{lead.date}</p>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem><Phone className="w-4 h-4 mr-2" /> Log Call</DropdownMenuItem>
                        <DropdownMenuItem><Calendar className="w-4 h-4 mr-2" /> Schedule Meeting</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <Input
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <Input
                value={newLead.contact}
                onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })}
                placeholder="Enter contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intake Path</label>
              <Select value={newLead.path} onValueChange={(v) => setNewLead({ ...newLead, path: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select path" />
                </SelectTrigger>
                <SelectContent>
                  {INTAKE_PATHS.map(path => (
                    <SelectItem key={path.id} value={path.id}>{path.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pillar</label>
              <Select value={newLead.pillar} onValueChange={(v) => setNewLead({ ...newLead, pillar: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pillar" />
                </SelectTrigger>
                <SelectContent>
                  {PILLARS.map(pillar => (
                    <SelectItem key={pillar} value={pillar}>{pillar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
              <Input
                value={newLead.value}
                onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                placeholder="$0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} className="bg-green-600 hover:bg-green-700">Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesBusinessDev;
