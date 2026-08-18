import { useState } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Calendar,
  ChevronDown,
  X
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

// Field type to icon mapping
const FIELD_ICONS = {
  text: FileText,
  textarea: FileText,
  email: Mail,
  select: ChevronDown,
  number: FileText,
  date: Calendar,
};

const ToolExecutionForm = ({ 
  tool, 
  formFields = [], 
  onClose,
  onSuccess 
}) => {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = formFields
      .filter(f => f.required && !formData[f.name])
      .map(f => f.label);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(", ")}`);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    
    try {
      // Call the backend to execute the tool
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/flowforge/tools/${tool.id}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("session_token")}`
        },
        body: JSON.stringify({
          form_data: formData
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Tool executed successfully!",
          data: data.result
        });
        toast.success("Tool executed successfully!");
        if (onSuccess) onSuccess(data);
      } else {
        throw new Error(data.detail || "Failed to execute tool");
      }
    } catch (err) {
      console.error("Tool execution error:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field) => {
    const Icon = FIELD_ICONS[field.type] || FileText;
    
    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Icon className="w-4 h-4 text-gray-400" />
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1FB58A] focus:border-transparent resize-none"
              rows={4}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
              value={formData[field.name] || ""}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={field.required}
            />
            {field.help_text && (
              <p className="text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );
      
      case "select":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Icon className="w-4 h-4 text-gray-400" />
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1FB58A] focus:border-transparent"
              value={formData[field.name] || ""}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={field.required}
            >
              <option value="">Select {field.label.toLowerCase()}...</option>
              {field.options?.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      
      case "email":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-gray-400" />
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="email"
              placeholder={field.placeholder || "email@example.com"}
              value={formData[field.name] || ""}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        );
      
      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Icon className="w-4 h-4 text-gray-400" />
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="number"
              placeholder={field.placeholder || "0"}
              value={formData[field.name] || ""}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        );
      
      default: // text
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Icon className="w-4 h-4 text-gray-400" />
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="text"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
              value={formData[field.name] || ""}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={field.required}
            />
            {field.help_text && (
              <p className="text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-lg w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{tool.tool_name}</h3>
              <p className="text-sm text-white/80">Fill out the form to run this tool</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {formFields.length > 0 ? (
          formFields.map(renderField)
        ) : (
          <p className="text-gray-500 text-center py-4">
            This tool doesn't require any input. Click "Run Tool" to execute.
          </p>
        )}

        {/* Result Display */}
        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">{result.message}</p>
                {result.data && (
                  <pre className="mt-2 text-xs text-green-700 bg-green-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Execution Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#1FB58A] hover:bg-[#6B54EE] text-white py-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Tool
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ToolExecutionForm;
