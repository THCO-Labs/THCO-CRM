import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import DynamicFormRenderer from "./DynamicFormRenderer";
import { flowforgeAPI } from "../../lib/api";
import { toast } from "sonner";

/**
 * UseToolModal - Modal for using a deployed tool
 * 
 * Fetches form fields from the backend, renders them dynamically,
 * and executes the tool via the portal-native API (not n8n forms).
 */
const UseToolModal = ({ 
  isOpen, 
  onClose, 
  toolId, 
  toolName = "Tool",
  onExecutionComplete 
}) => {
  const [loading, setLoading] = useState(true);
  const [formFields, setFormFields] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && toolId) {
      loadFormFields();
    }
    // Reset state when modal closes
    if (!isOpen) {
      setExecutionResult(null);
      setError(null);
      setFormFields([]);
    }
  }, [isOpen, toolId]);

  const loadFormFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await flowforgeAPI.getToolFormFields(toolId);
      setFormFields(data.form_fields || []);
    } catch (err) {
      console.error("Failed to load form fields:", err);
      setError("Failed to load tool configuration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const result = await flowforgeAPI.executeTool(toolId, formData);
      
      setExecutionResult({
        success: true,
        message: result.message || "Tool executed successfully!",
        data: result.result,
        executionId: result.execution_id
      });
      
      toast.success("Tool executed successfully!");
      
      if (onExecutionComplete) {
        onExecutionComplete(result);
      }
    } catch (err) {
      console.error("Tool execution failed:", err);
      const errorMessage = err.response?.data?.detail || "Tool execution failed. Please try again.";
      setError(errorMessage);
      setExecutionResult({
        success: false,
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyResult = () => {
    if (executionResult?.data) {
      navigator.clipboard.writeText(
        typeof executionResult.data === 'string' 
          ? executionResult.data 
          : JSON.stringify(executionResult.data, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Result copied to clipboard");
    }
  };

  const handleRunAgain = () => {
    setExecutionResult(null);
    setError(null);
  };

  const renderContent = () => {
    // Loading state
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1FB58A] mb-4" />
          <p className="text-gray-500">Loading tool configuration...</p>
        </div>
      );
    }

    // Error state (initial load)
    if (error && !executionResult) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-600 text-center mb-4">{error}</p>
          <Button variant="outline" onClick={loadFormFields}>
            Try Again
          </Button>
        </div>
      );
    }

    // Execution result state
    if (executionResult) {
      return (
        <div className="py-4">
          {executionResult.success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {executionResult.message}
              </h3>
              
              {executionResult.executionId && (
                <p className="text-sm text-gray-500 mb-4">
                  Execution ID: {executionResult.executionId}
                </p>
              )}

              {/* Display result data if available */}
              {executionResult.data && (
                <div className="mt-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Result:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyResult}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {typeof executionResult.data === 'string' 
                        ? executionResult.data 
                        : JSON.stringify(executionResult.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3 mt-6">
                <Button variant="outline" onClick={handleRunAgain}>
                  Run Again
                </Button>
                <Button onClick={onClose} className="bg-[#1FB58A] hover:bg-[#6B54EE]">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Execution Failed
              </h3>
              <p className="text-red-600 mb-6">{executionResult.message}</p>
              
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={handleRunAgain}>
                  Try Again
                </Button>
                <Button onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Form state
    return (
      <DynamicFormRenderer
        formFields={formFields}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Run Tool"
        onCancel={onClose}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
        data-testid="use-tool-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1FB58A] to-[#9C8CFF] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {toolName}
          </DialogTitle>
          <DialogDescription>
            {executionResult 
              ? "View the results of your tool execution"
              : "Fill in the required information to run this tool"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UseToolModal;
