import { Link } from "react-router-dom";
import { 
  X, 
  User, 
  Calendar, 
  Zap, 
  Database, 
  Mail, 
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileCode,
  ExternalLink,
  PlugZap
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

// Integration icon mapping
const INTEGRATION_ICONS = {
  supabase: Database,
  gmail: Mail,
  slack: MessageSquare,
  anthropic: Zap,
};

const ApprovalDetailModal = ({ approval, onClose, onAction }) => {
  if (!approval) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const requestDetails = approval.request_details || {};
  const impactAssessment = approval.impact_assessment || {};

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {approval.request_type === 'new_tool' ? 'New Tool Request' : 'Update Request'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  #{approval.id.slice(0, 8).toUpperCase()}
                </DialogDescription>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              approval.status === 'pending' 
                ? 'bg-yellow-100 text-yellow-700' 
                : approval.status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              {approval.status === 'pending' ? 'Pending Review' : approval.status}
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Meta Info */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDate(approval.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {approval.requested_by_name}
            </span>
            <span className="capitalize">
              {approval.unit.replace(/-/g, ' ')}
            </span>
          </div>

          {/* Tool Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-[#1FB58A]" />
              Tool Details
            </h3>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Name:</span>
                <p className="font-medium text-gray-900">{approval.tool_name}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Description:</span>
                <p className="text-gray-700">{approval.request_summary}</p>
              </div>
            </div>
          </div>

          {/* Integrations Required */}
          {requestDetails.integrations && requestDetails.integrations.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <PlugZap className="w-5 h-5 text-[#1FB58A]" />
                Integrations Required
              </h3>
              
              <div className="space-y-2">
                {requestDetails.integrations.map((integration, idx) => {
                  const Icon = INTEGRATION_ICONS[integration.type] || PlugZap;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{integration.display_name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        integration.status === 'connected' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {integration.status === 'connected' ? 'Connected' : 'Needs Setup'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workflow Steps */}
          {requestDetails.steps && requestDetails.steps.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Workflow Steps</h3>
              
              <div className="space-y-2">
                {requestDetails.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-[#1FB58A]/10 text-[#1FB58A] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {step.step_number || idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{step.name}</p>
                      {step.description && (
                        <p className="text-sm text-gray-500">{step.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Assessment */}
          {(impactAssessment.risk || impactAssessment.estimated_impact) && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Impact Assessment</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {impactAssessment.risk && (
                  <div>
                    <span className="text-sm text-gray-500">Risk Level:</span>
                    <p className={`font-medium ${
                      impactAssessment.risk === 'LOW' ? 'text-green-600' :
                      impactAssessment.risk === 'MEDIUM' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {impactAssessment.risk}
                    </p>
                  </div>
                )}
                {impactAssessment.estimated_impact && (
                  <div>
                    <span className="text-sm text-gray-500">Estimated Impact:</span>
                    <p className="font-medium text-gray-700">{impactAssessment.estimated_impact}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Similar Tools Found */}
          {approval.similar_tools_found && approval.similar_tools_found.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Similar Tools Detected
              </h3>
              
              <div className="space-y-2">
                {approval.similar_tools_found.map((tool, idx) => (
                  <div key={idx} className="text-sm text-yellow-700">
                    <span className="font-medium">{tool.name}</span>
                    {tool.similarity_score && (
                      <span className="text-yellow-600 ml-2">({tool.similarity_score}% match)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Conversation Link */}
          <Link
            to={`/${approval.unit}/build/${approval.conversation_id}`}
            className="flex items-center justify-center gap-2 py-3 text-[#1FB58A] hover:bg-emerald-50 rounded-lg transition-colors"
            onClick={onClose}
          >
            <MessageSquare className="w-4 h-4" />
            View Full Conversation
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Action Footer */}
        {approval.status === 'pending' && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
            <Button
              onClick={() => {
                onClose();
                onAction(approval.id, 'approve');
              }}
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              data-testid="modal-approve-btn"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve & Deploy
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onAction(approval.id, 'reject');
              }}
              className="border-red-200 text-red-600 hover:bg-red-50 flex-1"
              data-testid="modal-reject-btn"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onAction(approval.id, 'request_changes');
              }}
              className="border-orange-200 text-orange-600 hover:bg-orange-50 flex-1"
              data-testid="modal-changes-btn"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Request Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalDetailModal;
