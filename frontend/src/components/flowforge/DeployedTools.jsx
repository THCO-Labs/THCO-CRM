import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Calendar,
  Mail,
  Database,
  MessageSquare,
  Globe,
  User
} from "lucide-react";
import { Button } from "../ui/button";
import { flowforgeAPI } from "../../lib/api";
import { toast } from "sonner";
import UseToolModal from "./UseToolModal";

// Icon mapping for systems
const SYSTEM_ICONS = {
  "Email Sending": Mail,
  "Gmail": Mail,
  "Database Access": Database,
  "Database": Database,
  "Team Notifications": MessageSquare,
  "Slack": MessageSquare,
  "Calendar Access": Calendar,
  "Google Calendar": Calendar,
  "Spreadsheet Access": Globe,
  "Google Sheets": Globe,
  "AI Text Generation": Zap,
  "AI": Zap,
  "External API": Globe,
  "HTTP": Globe,
};

const DeployedTools = ({ unit, limit = 10 }) => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState(null);
  const [useToolModal, setUseToolModal] = useState({ open: false, toolId: null, toolName: "" });

  useEffect(() => {
    loadTools();
  }, [unit]);

  const loadTools = async () => {
    try {
      setLoading(true);
      const data = await flowforgeAPI.getDeployedTools({ unit, limit });
      setTools(data);
    } catch (error) {
      console.error("Failed to load deployed tools:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (toolId, currentActive) => {
    try {
      setActivatingId(toolId);
      await flowforgeAPI.activateTool(toolId, !currentActive);
      toast.success(`Tool ${currentActive ? 'deactivated' : 'activated'} successfully`);
      loadTools(); // Reload to get updated status
    } catch (error) {
      console.error("Failed to activate tool:", error);
      toast.error("Failed to update tool status");
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#1FB58A]" />
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No deployed tools yet</p>
        <p className="text-sm mt-1">Tools you build and approve will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="deployed-tools-list">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          data-testid={`deployed-tool-${tool.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Tool Name & Status */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{tool.tool_name}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    tool.is_active
                      ? "bg-green-100 text-green-700"
                      : tool.status === "deployed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tool.is_active ? "Active" : tool.status === "deployed" ? "Ready" : tool.status}
                </span>
              </div>

              {/* Description */}
              {tool.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {tool.description}
                </p>
              )}

              {/* Trigger & Stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                {tool.trigger_description && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{tool.trigger_description}</span>
                  </div>
                )}
                
                {tool.execution_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    <span>{tool.execution_count} runs</span>
                  </div>
                )}

                {tool.success_count > 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{tool.success_count} successful</span>
                  </div>
                )}

                {tool.error_count > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>{tool.error_count} errors</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>by {tool.created_by_name}</span>
                </div>
              </div>

              {/* Systems Used */}
              {tool.systems_used && tool.systems_used.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {tool.systems_used.slice(0, 4).map((system, idx) => {
                    const Icon = SYSTEM_ICONS[system] || Zap;
                    return (
                      <span
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                      >
                        <Icon className="w-3 h-3" />
                        {system}
                      </span>
                    );
                  })}
                  {tool.systems_used.length > 4 && (
                    <span className="text-xs text-gray-400">
                      +{tool.systems_used.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {/* Use Tool Button - Opens portal-native form modal */}
              {(tool.status === 'deployed' || tool.status === 'active') && (
                <Button
                  size="sm"
                  className="bg-[#1FB58A] hover:bg-[#6B54EE] text-white"
                  onClick={() => setUseToolModal({ 
                    open: true, 
                    toolId: tool.id, 
                    toolName: tool.tool_name 
                  })}
                  data-testid={`use-tool-btn-${tool.id}`}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Use Tool
                </Button>
              )}

              {/* Activate/Deactivate Button (Admin only) */}
              {tool.engine_workflow_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleActivate(tool.id, tool.is_active)}
                  disabled={activatingId === tool.id}
                  className={tool.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
                >
                  {activatingId === tool.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : tool.is_active ? (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
              )}

              {/* Open in n8n */}
              {tool.engine_workflow_url && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={tool.engine_workflow_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </Button>
              )}

              {/* View Conversation */}
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link to={`/${unit}/build/${tool.id}`}>
                  View
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Use Tool Modal */}
      <UseToolModal
        isOpen={useToolModal.open}
        onClose={() => setUseToolModal({ open: false, toolId: null, toolName: "" })}
        toolId={useToolModal.toolId}
        toolName={useToolModal.toolName}
        onExecutionComplete={() => loadTools()} // Reload to update stats
      />
    </div>
  );
};

export default DeployedTools;
