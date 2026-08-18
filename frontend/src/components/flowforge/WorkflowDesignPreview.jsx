import { useState } from "react";
import {
  Check,
  X,
  Edit3,
  Zap,
  Database,
  Mail,
  Calendar,
  MessageSquare,
  Globe,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
  ExternalLink
} from "lucide-react";
import { Button } from "../ui/button";

// Integration icons
const INTEGRATION_ICONS = {
  gmail: Mail,
  google_sheets: Database,
  google_drive: FileText,
  anthropic_ai: Zap,
  openai: Zap,
  http_request: Globe,
  code: FileText,
  database: Database,
  slack: MessageSquare,
  calendar: Calendar,
};

// Field type icons
const FIELD_TYPE_ICONS = {
  text: FileText,
  textarea: FileText,
  email: Mail,
  select: ChevronDown,
  number: FileText,
  date: Calendar,
};

const WorkflowDesignPreview = ({ 
  design, 
  onApprove, 
  onEdit, 
  onReject,
  isApproving = false 
}) => {
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);

  if (!design || !design.workflow_design) {
    return null;
  }

  const { analysis, workflow_design, user_message } = design;
  const { name, description, trigger_type, form_fields, steps, integrations_needed } = workflow_design;

  return (
    <div className="bg-white border-2 border-[#1FB58A]/20 rounded-2xl overflow-hidden shadow-lg" data-testid="workflow-design-preview">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{name}</h3>
            <p className="text-sm text-white/80">{description}</p>
          </div>
        </div>
      </div>

      {/* AI Message */}
      {user_message && (
        <div className="px-6 py-4 bg-[#1FB58A]/5 border-b border-[#1FB58A]/10">
          <p className="text-sm text-gray-700">{user_message}</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Integrations Needed */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#1FB58A]" />
            Integrations
          </h4>
          <div className="flex flex-wrap gap-2">
            {integrations_needed?.map((integration, idx) => {
              const Icon = INTEGRATION_ICONS[integration.id] || Zap;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    integration.configured
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{integration.display_name}</span>
                  {integration.configured ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="text-xs">(needs setup)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Fields Preview */}
        {form_fields && form_fields.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1FB58A]" />
              Form Fields ({form_fields.length})
            </h4>
            <div className="space-y-2">
              {(showAllFields ? form_fields : form_fields.slice(0, 4)).map((field, idx) => {
                const Icon = FIELD_TYPE_ICONS[field.type] || FileText;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{field.label}</span>
                      {field.required && (
                        <span className="text-xs text-red-500">*</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{field.type}</span>
                  </div>
                );
              })}
              {form_fields.length > 4 && (
                <button
                  onClick={() => setShowAllFields(!showAllFields)}
                  className="text-sm text-[#1FB58A] hover:underline flex items-center gap-1"
                >
                  {showAllFields ? (
                    <>Show less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show all {form_fields.length} fields <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Workflow Steps */}
        {steps && steps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-[#1FB58A]" />
              Workflow Steps ({steps.length})
            </h4>
            <div className="space-y-2">
              {(showAllSteps ? steps : steps.slice(0, 4)).map((step, idx) => {
                const Icon = INTEGRATION_ICONS[step.integration] || Zap;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-[#1FB58A] text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {step.step_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{step.name}</span>
                        {step.integration && (
                          <span className="text-xs px-2 py-0.5 bg-[#1FB58A]/10 text-[#1FB58A] rounded">
                            {step.integration.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                );
              })}
              {steps.length > 4 && (
                <button
                  onClick={() => setShowAllSteps(!showAllSteps)}
                  className="text-sm text-[#1FB58A] hover:underline flex items-center gap-1"
                >
                  {showAllSteps ? (
                    <>Show less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show all {steps.length} steps <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Trigger Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded-lg">
          <Clock className="w-4 h-4" />
          <span className="font-medium">Trigger:</span>
          <span className="capitalize">{trigger_type}</span>
          {workflow_design.trigger_description && (
            <span className="text-gray-400">— {workflow_design.trigger_description}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="text-gray-500 hover:text-red-600"
          data-testid="reject-design-btn"
        >
          <X className="w-4 h-4 mr-1" />
          Start Over
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-[#1FB58A] border-[#1FB58A] hover:bg-[#1FB58A]/5"
            data-testid="edit-design-btn"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Make Changes
          </Button>

          <Button
            size="sm"
            onClick={onApprove}
            disabled={isApproving}
            className="bg-[#1FB58A] hover:bg-[#6B54EE] text-white"
            data-testid="approve-design-btn"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Approve & Deploy
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDesignPreview;
