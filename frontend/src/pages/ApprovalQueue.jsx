import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  Loader2,
  Zap,
  User,
  Calendar,
  MessageSquare,
  Filter,
  RefreshCw,
  FileCode,
  Edit3,
  Trash2,
  ArrowUpDown
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
import ApprovalDetailModal from "../components/ApprovalDetailModal";

// Status configuration
const STATUS_CONFIG = {
  pending: { 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    icon: Clock, 
    label: "Pending" 
  },
  approved: { 
    color: "bg-green-100 text-green-800 border-green-200", 
    icon: CheckCircle2, 
    label: "Approved" 
  },
  rejected: { 
    color: "bg-red-100 text-red-800 border-red-200", 
    icon: XCircle, 
    label: "Rejected" 
  },
  changes_requested: { 
    color: "bg-orange-100 text-orange-800 border-orange-200", 
    icon: AlertCircle, 
    label: "Changes Requested" 
  },
};

// Request type icons
const REQUEST_TYPE_CONFIG = {
  new_tool: { icon: Zap, label: "New Tool", color: "text-emerald-600" },
  update: { icon: Edit3, label: "Update", color: "text-blue-600" },
  activate: { icon: CheckCircle2, label: "Activate", color: "text-green-600" },
  delete: { icon: Trash2, label: "Delete", color: "text-red-600" },
  move: { icon: ArrowUpDown, label: "Move", color: "text-orange-600" },
};

// Format relative time
const formatRelativeTime = (dateString) => {
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

// Approval Card Component
const ApprovalCard = ({ approval, onAction, onViewDetails }) => {
  const statusConfig = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
  const requestConfig = REQUEST_TYPE_CONFIG[approval.request_type] || REQUEST_TYPE_CONFIG.new_tool;
  const StatusIcon = statusConfig.icon;
  const RequestIcon = requestConfig.icon;

  return (
    <div 
      className="bg-white border border-gray-100 rounded-xl p-5 hover:border-[#1FB58A]/30 hover:shadow-md transition-all"
      data-testid={`approval-card-${approval.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Request Type Icon */}
          <div className={`w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center ${requestConfig.color}`}>
            <RequestIcon className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.color} border`}>
                {requestConfig.label}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(approval.created_at)}
              </span>
            </div>
            
            {/* Tool Name */}
            <h3 className="font-semibold text-gray-900 mb-1">
              "{approval.tool_name}"
            </h3>
            
            {/* Meta */}
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {approval.requested_by_name}
              </span>
              <span className="text-gray-300">|</span>
              <span className="capitalize">{approval.unit.replace(/-/g, ' ')}</span>
            </div>
            
            {/* Summary */}
            <p className="text-sm text-gray-600 line-clamp-2">
              {approval.request_summary}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color} border`}>
          <StatusIcon className="w-4 h-4" />
          {statusConfig.label}
        </div>
      </div>

      {/* Actions */}
      {approval.status === 'pending' && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button
            size="sm"
            onClick={() => onAction(approval.id, 'approve')}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid={`approve-btn-${approval.id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(approval.id, 'reject')}
            className="border-red-200 text-red-600 hover:bg-red-50"
            data-testid={`reject-btn-${approval.id}`}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(approval.id, 'request_changes')}
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
            data-testid={`request-changes-btn-${approval.id}`}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Request Changes
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(approval)}
            data-testid={`view-details-btn-${approval.id}`}
          >
            Review Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* View conversation link for processed approvals */}
      {approval.status !== 'pending' && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            {approval.decided_by_name && (
              <span>
                {approval.status === 'approved' ? 'Approved' : approval.status === 'rejected' ? 'Rejected' : 'Changes requested'} by {approval.decided_by_name}
                {approval.decided_at && ` • ${formatRelativeTime(approval.decided_at)}`}
              </span>
            )}
          </div>
          <Link
            to={`/${approval.unit}/build/${approval.conversation_id}`}
            className="text-sm text-[#1FB58A] hover:underline flex items-center gap-1"
          >
            View Conversation
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

// Main Approval Queue Page
const ApprovalQueue = () => {
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, changes_requested: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Load approvals
  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const [approvalsData, statsData] = await Promise.all([
        flowforgeAPI.getApprovals({
          status: filter !== 'all' ? filter : undefined,
          unit: unitFilter !== 'all' ? unitFilter : undefined,
        }),
        flowforgeAPI.getApprovalStats(),
      ]);
      setApprovals(approvalsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load approvals:", error);
      toast.error("Failed to load approval queue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [filter, unitFilter]);

  // Handle approval action
  const handleAction = async (approvalId, action) => {
    if (action === 'reject' || action === 'request_changes') {
      // Show detail modal for note
      const approval = approvals.find(a => a.id === approvalId);
      setSelectedApproval({ ...approval, pendingAction: action });
      return;
    }

    try {
      setIsProcessing(true);
      await flowforgeAPI.processApproval(approvalId, action);
      toast.success(`Request ${action}d successfully`);
      loadApprovals();
    } catch (error) {
      console.error("Failed to process approval:", error);
      toast.error(`Failed to ${action} request`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle action with note
  const handleActionWithNote = async () => {
    if (!selectedApproval?.pendingAction) return;

    try {
      setIsProcessing(true);
      await flowforgeAPI.processApproval(
        selectedApproval.id, 
        selectedApproval.pendingAction,
        actionNote || null
      );
      toast.success(`Request ${selectedApproval.pendingAction === 'reject' ? 'rejected' : 'returned for changes'}`);
      setSelectedApproval(null);
      setActionNote("");
      loadApprovals();
    } catch (error) {
      console.error("Failed to process approval:", error);
      toast.error("Failed to process request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter options
  const filterOptions = [
    { value: "all", label: "All Requests" },
    { value: "pending", label: `Pending (${stats.pending})` },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "changes_requested", label: "Changes Requested" },
  ];

  const unitOptions = [
    { value: "all", label: "All Units" },
    { value: "talent", label: "Talent & Delivery" },
    { value: "sales", label: "Sales & Business Dev" },
    { value: "marketing", label: "Marketing & Brand" },
    { value: "advisory", label: "Advisory & Consulting" },
    { value: "technology", label: "Technology & Build" },
    { value: "operations", label: "Operations & Finance" },
    { value: "academy", label: "Academy & Learning" },
    { value: "client-delivery", label: "Client Delivery" },
    { value: "thco-hr", label: "Crowther HR" },
    { value: "project-management", label: "Project Management" },
    { value: "it-tools", label: "IT & Crowther Tools" },
  ];

  return (
    <div className="space-y-6" data-testid="approval-queue-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Approval Queue</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
          <p className="text-gray-500 mt-1">
            {stats.pending} pending • {stats.approved + stats.rejected + stats.changes_requested} processed today
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadApprovals}
          disabled={isLoading}
          data-testid="refresh-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              <p className="text-sm text-green-600">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              <p className="text-sm text-red-600">Rejected</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{stats.changes_requested}</p>
              <p className="text-sm text-orange-600">Changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter:</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[200px]" data-testid="unit-filter">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Approval List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1FB58A]" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FileCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No requests found</h3>
          <p className="text-gray-500 text-sm">
            {filter !== 'all' ? `No ${filter.replace('_', ' ')} requests` : 'No approval requests yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="approval-list">
          {approvals.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onAction={handleAction}
              onViewDetails={setSelectedApproval}
            />
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedApproval?.pendingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedApproval.pendingAction === 'reject' ? 'Reject Request' : 'Request Changes'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedApproval.pendingAction === 'reject' 
                ? 'Please provide a reason for rejection (required):' 
                : 'What changes are needed?'}
            </p>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={selectedApproval.pendingAction === 'reject' ? 'Reason for rejection...' : 'Describe the changes needed...'}
              className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A]"
              data-testid="action-note-input"
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedApproval(null);
                  setActionNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleActionWithNote}
                disabled={selectedApproval.pendingAction === 'reject' && !actionNote.trim()}
                className={selectedApproval.pendingAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
                data-testid="confirm-action-btn"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApproval && !selectedApproval.pendingAction && (
        <ApprovalDetailModal 
          approval={selectedApproval} 
          onClose={() => setSelectedApproval(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
};

export default ApprovalQueue;
