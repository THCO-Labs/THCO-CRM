import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  RefreshCw, 
  Zap, 
  Clock, 
  Play, 
  Pause,
  Search,
  Filter,
  ExternalLink,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { toast } from "sonner";
import { flowforgeAPI } from "../lib/api";

// Unit options
const UNIT_OPTIONS = [
  { value: "all", label: "All Units" },
  { value: "talent", label: "Talent & Delivery" },
  { value: "sales", label: "Sales & Business Dev" },
  { value: "marketing", label: "Marketing & Brand" },
  { value: "advisory", label: "Advisory & Consulting" },
  { value: "technology", label: "Technology & Build" },
  { value: "operations", label: "Operations & Finance" },
  { value: "academy", label: "Academy & Learning" },
  { value: "client-delivery", label: "Client Delivery" },
];

// Format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Workflow Card Component
const WorkflowCard = ({ workflow }) => {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-[#1FB58A]/30 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            workflow.is_active ? "bg-green-100" : "bg-gray-100"
          }`}>
            <Zap className={`w-5 h-5 ${workflow.is_active ? "text-green-600" : "text-gray-400"}`} />
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
              {workflow.is_flowforge_created && (
                <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                  FlowForge
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
              {workflow.description || "No description"}
            </p>
            
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Synced {formatRelativeTime(workflow.last_synced_at)}
              </span>
              {workflow.trigger_type && (
                <span className="capitalize">{workflow.trigger_type.replace(/n8n-nodes-base\.|Trigger/g, '')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            workflow.is_active 
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {workflow.is_active ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {workflow.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Tags */}
      {workflow.tags && workflow.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {workflow.tags.map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Nodes Summary */}
      {workflow.nodes_summary && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">Uses: </span>
          <span className="text-xs text-gray-600">
            {workflow.nodes_summary.split(',').slice(0, 4).map(n => n.trim().replace(/n8n-nodes-base\./g, '')).join(', ')}
            {workflow.nodes_summary.split(',').length > 4 && ' ...'}
          </span>
        </div>
      )}
    </div>
  );
};

// Main Workflow Inventory Page
const WorkflowInventory = () => {
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Load workflows
  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const data = await flowforgeAPI.getInventory({
        unit: unitFilter !== 'all' ? unitFilter : undefined,
      });
      setWorkflows(data);
      
      // Get last sync time from most recent workflow
      if (data.length > 0) {
        const mostRecent = data.reduce((a, b) => 
          new Date(a.last_synced_at) > new Date(b.last_synced_at) ? a : b
        );
        setLastSyncTime(mostRecent.last_synced_at);
      }
    } catch (error) {
      console.error("Failed to load workflows:", error);
      toast.error("Failed to load workflow inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, [unitFilter]);

  // Sync with n8n
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await flowforgeAPI.syncInventory();
      toast.success("Inventory synced with automation engine");
      loadWorkflows();
    } catch (error) {
      console.error("Failed to sync:", error);
      toast.error("Failed to sync with automation engine");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter workflows by search query
  const filteredWorkflows = workflows.filter(wf => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      wf.name.toLowerCase().includes(query) ||
      (wf.description && wf.description.toLowerCase().includes(query)) ||
      (wf.nodes_summary && wf.nodes_summary.toLowerCase().includes(query))
    );
  });

  // Stats
  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.is_active).length,
    flowforge: workflows.filter(w => w.is_flowforge_created).length,
  };

  return (
    <div className="space-y-6" data-testid="workflow-inventory-page">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-medium">Workflow Inventory</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Inventory</h1>
          <p className="text-gray-500 mt-1">
            {stats.total} workflows • {stats.active} active • Last synced {formatRelativeTime(lastSyncTime)}
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-[#1FB58A] hover:bg-[#179C76]"
          data-testid="sync-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Workflows</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.flowforge}</p>
              <p className="text-sm text-gray-500">Built with FlowForge</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows..."
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[200px]" data-testid="unit-filter">
            <SelectValue placeholder="Filter by unit" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workflow List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1FB58A]" />
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {workflows.length === 0 ? "No workflows in inventory" : "No matching workflows"}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {workflows.length === 0 
              ? "Click 'Sync Now' to pull workflows from the automation engine"
              : "Try adjusting your search or filters"}
          </p>
          {workflows.length === 0 && (
            <Button onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4" data-testid="workflow-list">
          {filteredWorkflows.map(workflow => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowInventory;
