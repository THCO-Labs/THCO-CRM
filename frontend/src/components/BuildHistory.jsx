import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Zap,
  Clock,
  MessageSquare,
  ChevronRight,
  Loader2,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Play,
  XCircle,
  Edit3
} from "lucide-react";
import { flowforgeAPI } from "../lib/api";

// Status configuration
const STATUS_CONFIG = {
  building: { color: "bg-blue-500", textColor: "text-blue-600", bgColor: "bg-blue-50", label: "Building", icon: Edit3 },
  ready: { color: "bg-emerald-500", textColor: "text-emerald-600", bgColor: "bg-emerald-50", label: "Ready", icon: FileCode },
  pending_approval: { color: "bg-yellow-500", textColor: "text-yellow-600", bgColor: "bg-yellow-50", label: "Pending", icon: Clock },
  changes_requested: { color: "bg-orange-500", textColor: "text-orange-600", bgColor: "bg-orange-50", label: "Changes Requested", icon: AlertCircle },
  deployed: { color: "bg-green-500", textColor: "text-green-600", bgColor: "bg-green-50", label: "Deployed", icon: CheckCircle2 },
  active: { color: "bg-green-600", textColor: "text-green-700", bgColor: "bg-green-50", label: "Active", icon: Play },
  inactive: { color: "bg-gray-500", textColor: "text-gray-600", bgColor: "bg-gray-50", label: "Inactive", icon: XCircle },
  error: { color: "bg-red-500", textColor: "text-red-600", bgColor: "bg-red-50", label: "Error", icon: AlertCircle },
  draft: { color: "bg-gray-400", textColor: "text-gray-500", bgColor: "bg-gray-50", label: "Draft", icon: FileCode },
};

// Build History Item Component
const BuildHistoryItem = ({ conversation, unit }) => {
  const config = STATUS_CONFIG[conversation.status] || STATUS_CONFIG.building;
  const Icon = config.icon;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link 
      to={`/${unit}/build/${conversation.id}`}
      className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-[#1FB58A]/30 hover:shadow-md transition-all group"
      data-testid={`build-history-item-${conversation.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <Zap className={`w-5 h-5 ${config.textColor}`} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-800 group-hover:text-[#1FB58A] transition-colors">
                {conversation.tool_name || "Untitled Tool"}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                <Icon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
            
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">
              {conversation.description || "No description yet"}
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(conversation.updated_at)}
              </span>
              {conversation.execution_count > 0 && (
                <span className="flex items-center gap-1">
                  <Play className="w-3.5 h-3.5" />
                  {conversation.execution_count} executions
                </span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#1FB58A] transition-colors" />
      </div>
    </Link>
  );
};

// Main Build History Component
const BuildHistory = ({ unit }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await flowforgeAPI.getConversations({ unit });
        setConversations(data);
      } catch (err) {
        console.error("Failed to load build history:", err);
        if (err.response?.status === 503 || err.response?.data?.detail?.includes("table")) {
          setError("FlowForge is being set up. This feature will be available soon.");
        } else {
          setError("Failed to load build history");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [unit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#1FB58A]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <FileCode className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No builds yet</h3>
        <p className="text-gray-500 text-sm mb-4">
          Start building your first automation tool with FlowForge
        </p>
        <Link
          to={`/${unit}/build/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1FB58A] text-white rounded-lg hover:bg-[#179C76] transition-colors"
          data-testid="start-first-build"
        >
          <Zap className="w-4 h-4" />
          Build Your First Tool
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="build-history-list">
      {conversations.map((conv) => (
        <BuildHistoryItem key={conv.id} conversation={conv} unit={unit} />
      ))}
    </div>
  );
};

export default BuildHistory;
