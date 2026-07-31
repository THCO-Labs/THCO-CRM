import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Loader2 } from "lucide-react";

/**
 * DynamicFormRenderer - Renders a form from a JSON schema
 * 
 * Form field schema:
 * {
 *   name: string,        // Field identifier
 *   label: string,       // Display label
 *   type: string,        // text, textarea, email, number, select, date
 *   required: boolean,   // Whether field is required
 *   placeholder?: string,// Placeholder text
 *   options?: string[],  // Options for select type
 *   description?: string // Help text
 * }
 */
const DynamicFormRenderer = ({ 
  formFields = [], 
  onSubmit, 
  isSubmitting = false,
  submitLabel = "Submit",
  onCancel 
}) => {
  const [formData, setFormData] = useState(() => {
    // Initialize form data with empty values
    const initial = {};
    formFields.forEach(field => {
      initial[field.name] = field.defaultValue || "";
    });
    return initial;
  });
  
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    formFields.forEach(field => {
      if (field.required && !formData[field.name]?.toString().trim()) {
        newErrors[field.name] = `${field.label || field.name} is required`;
      }
      // Email validation
      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = "Please enter a valid email address";
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (field) => {
    const fieldId = `field-${field.name}`;
    const hasError = !!errors[field.name];
    
    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              data-testid={`form-field-${field.name}`}
              placeholder={field.placeholder}
              value={formData[field.name] || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={`min-h-[100px] ${hasError ? 'border-red-500' : ''}`}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.name]}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={formData[field.name] || ""}
              onValueChange={(value) => handleChange(field.name, value)}
            >
              <SelectTrigger 
                id={fieldId}
                data-testid={`form-field-${field.name}`}
                className={hasError ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.name]}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              data-testid={`form-field-${field.name}`}
              type="email"
              placeholder={field.placeholder}
              value={formData[field.name] || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.name]}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              data-testid={`form-field-${field.name}`}
              type="number"
              placeholder={field.placeholder}
              value={formData[field.name] || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.name]}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              data-testid={`form-field-${field.name}`}
              type="date"
              placeholder={field.placeholder}
              value={formData[field.name] || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.name]}</p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              data-testid={`form-field-${field.name}`}
              type="text"
              placeholder={field.placeholder}
              value={formData[field.name] || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.name]}</p>
            )}
          </div>
        );
    }
  };

  if (!formFields || formFields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No form fields configured for this tool.</p>
        <p className="text-sm mt-1">The tool can still be executed with default settings.</p>
        <div className="mt-4 flex justify-center gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={() => onSubmit({})}
            disabled={isSubmitting}
            className="bg-[#1FB58A] hover:bg-[#6B54EE]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="dynamic-form">
      {formFields.map(renderField)}
      
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#1FB58A] hover:bg-[#6B54EE]"
          data-testid="form-submit-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
};

export default DynamicFormRenderer;
