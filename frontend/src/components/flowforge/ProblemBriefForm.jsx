import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Mic, Square, Loader2, Check, AlertCircle, Play, Pause, 
  RotateCcw, ChevronDown, X, Zap, HelpCircle
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { flowforgeAPI } from "../../lib/api";

// Unit-specific placeholders
const UNIT_PLACEHOLDERS = {
  talent: {
    problem: "e.g., I manually check for unresponsive candidates every morning and it takes 45 minutes, Scheduling interviews requires back-and-forth emails with 3 people",
    exceptions: "e.g., Skip candidates who already have an interview scheduled, Don't send emails on weekends, Exclude candidates marked as 'not interested'"
  },
  sales: {
    problem: "e.g., I forget to follow up with leads 3 days after sending proposals, Pipeline reporting takes half a day every Monday",
    exceptions: "e.g., Don't include deals already marked as closed-won or closed-lost, Only count leads from the last 90 days"
  },
  marketing: {
    problem: "e.g., I manually cross-post the same content to all 12 LinkedIn pages every day, Newsletter content aggregation takes 3 hours",
    exceptions: "e.g., Don't post on public holidays, Skip draft articles that haven't been reviewed"
  },
  advisory: {
    problem: "e.g., Client status reports take 2 hours to write because I gather updates from 4 team members manually",
    exceptions: "e.g., Skip engagements currently on hold, Only include milestones due in the next 2 weeks"
  },
  technology: {
    problem: "e.g., Deployment notifications are sent manually via Slack after every release, Error monitoring requires checking 3 dashboards",
    exceptions: "e.g., Don't alert for staging environment errors, Skip during scheduled maintenance windows"
  },
  operations: {
    problem: "e.g., Invoices are sent late because I manually track due dates in a spreadsheet, Expense approvals sit in email for days",
    exceptions: "e.g., Don't send reminders for invoices already marked as paid, Skip internal cost transfers"
  },
  academy: {
    problem: "e.g., Application screening is fully manual — I review 50+ applications per week by hand",
    exceptions: "e.g., Skip applicants who withdrew their application, Don't count incomplete assessments"
  },
  "client-delivery": {
    problem: "e.g., SLA breaches aren't caught until after they happen because we check manually",
    exceptions: "e.g., Exclude engagements in onboarding phase from SLA tracking, Don't escalate low-severity issues"
  },
  "thco-hr": {
    problem: "e.g., Leave requests sit unprocessed for days, Onboarding checklists are tracked manually",
    exceptions: "e.g., Flag requests that exceed balance, Skip contractors for certain policies"
  },
  "project-management": {
    problem: "e.g., Task deadlines are missed because reminders are manual, Weekly status takes hours to compile",
    exceptions: "e.g., Skip completed tasks, Don't include archived projects"
  },
  "it-tools": {
    problem: "e.g., Agent health isn't monitored proactively, Access requests require manual processing",
    exceptions: "e.g., Skip agents in maintenance mode, Batch non-critical alerts"
  }
};

// Trigger options
const TRIGGER_OPTIONS = [
  { value: "schedule", label: "On a schedule (runs at a set time)", placeholder: "e.g., Every weekday at 9 AM, Every Monday at 8 AM" },
  { value: "database", label: "When something changes in our database", placeholder: "e.g., When a new candidate is added, When status changes to 'interviewed'" },
  { value: "email", label: "When I receive an email", placeholder: "e.g., When I receive an email from a client with 'invoice' in the subject" },
  { value: "form", label: "When a form is submitted", placeholder: "e.g., When a contact form is submitted on our website" },
  { value: "manual", label: "When I manually trigger it", placeholder: null },
  { value: "message", label: "When a message is received (Slack/WhatsApp)", placeholder: "e.g., When someone posts in #support channel" },
  { value: "external", label: "When something happens in another tool", placeholder: "e.g., When a Stripe payment is received" },
  { value: "other", label: "Other", placeholder: "Describe what should trigger this automation" }
];

// Frequency options
const FREQUENCY_OPTIONS = [
  { value: "realtime", label: "Real-time (every time the trigger event happens)", placeholder: "e.g., Within 5 minutes of the event, Immediately" },
  { value: "multiple_daily", label: "Multiple times a day", placeholder: "e.g., Every 2 hours during business hours (9 AM - 6 PM)" },
  { value: "daily", label: "Once a day", placeholder: "e.g., Every weekday at 9 AM, Every day at midnight" },
  { value: "few_weekly", label: "A few times a week", placeholder: "e.g., Monday, Wednesday, Friday at 9 AM" },
  { value: "weekly", label: "Once a week", placeholder: "e.g., Every Monday at 9 AM" },
  { value: "bimonthly", label: "Twice a month", placeholder: "e.g., 1st and 15th of every month" },
  { value: "monthly", label: "Once a month", placeholder: "e.g., First Monday of every month at 9 AM" },
  { value: "on_demand", label: "On demand (only when I trigger it)", placeholder: null },
  { value: "other", label: "Other", placeholder: "Describe the schedule" }
];

// System options with icons
const SYSTEM_OPTIONS = [
  { value: "database", label: "Database (our data)", icon: "🗄️" },
  { value: "email_gmail", label: "Email (Gmail)", icon: "📧" },
  { value: "slack", label: "Slack", icon: "💬" },
  { value: "whatsapp", label: "WhatsApp", icon: "📱" },
  { value: "google_sheets", label: "Google Sheets", icon: "📊" },
  { value: "google_calendar", label: "Google Calendar", icon: "📅" },
  { value: "linkedin", label: "LinkedIn", icon: "🔗" },
  { value: "ai_text", label: "AI Text Generation", icon: "🤖" },
  { value: "google_docs", label: "Google Docs", icon: "📄" },
  { value: "zoom", label: "Zoom", icon: "🎥" },
  { value: "hubspot", label: "HubSpot", icon: "📈" },
  { value: "stripe", label: "Stripe", icon: "💳" },
  { value: "notion", label: "Notion", icon: "📋" },
  { value: "airtable", label: "Airtable", icon: "📦" },
  { value: "external_api", label: "External Website/API", icon: "🌐" },
  { value: "other", label: "Other", icon: "➕" }
];

const ProblemBriefForm = ({ unit, unitDisplayName, onSubmit, onCancel }) => {
  // Form state
  const [formData, setFormData] = useState({
    toolName: "",
    problem: "",
    triggerType: "",
    triggerDetail: "",
    steps: "",
    outcome: "",
    whoInvolved: "",
    frequency: "",
    frequencyDetail: "",
    systems: [],
    systemsOther: "",
    exceptions: "",
    anythingElse: ""
  });

  // Validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showSmartPrompts, setShowSmartPrompts] = useState({});

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceConfirmed, setVoiceConfirmed] = useState(false);
  const [waveformData, setWaveformData] = useState([]);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get unit-specific placeholders
  const placeholders = UNIT_PLACEHOLDERS[unit] || UNIT_PLACEHOLDERS.talent;

  // Validation rules
  const validateField = (name, value) => {
    switch (name) {
      case "toolName":
        if (!value || value.length < 3) return "Tool name must be at least 3 characters";
        if (value.length > 60) return "Tool name must be under 60 characters";
        return null;
      case "problem":
        if (!value || value.length < 20) return "Please describe the problem in more detail (min 20 characters)";
        return null;
      case "triggerType":
        if (!value) return "Please select a trigger type";
        return null;
      case "triggerDetail":
        const trigger = TRIGGER_OPTIONS.find(t => t.value === formData.triggerType);
        if (trigger?.placeholder && (!value || value.length < 5)) {
          return "Please provide more detail about the trigger";
        }
        return null;
      case "steps":
        if (!value || value.length < 30) return "Please describe the steps in more detail (min 30 characters)";
        return null;
      case "outcome":
        if (!value || value.length < 15) return "Please describe the expected outcome (min 15 characters)";
        return null;
      case "frequency":
        if (!value) return "Please select how often this should run";
        return null;
      case "frequencyDetail":
        const freq = FREQUENCY_OPTIONS.find(f => f.value === formData.frequency);
        if (freq?.placeholder && (!value || value.length < 5)) {
          return "Please provide more detail about the schedule";
        }
        return null;
      default:
        return null;
    }
  };

  // Handle field change
  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // Handle field blur
  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Toggle system selection
  const toggleSystem = (system) => {
    setFormData(prev => ({
      ...prev,
      systems: prev.systems.includes(system)
        ? prev.systems.filter(s => s !== system)
        : [...prev.systems, system]
    }));
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup recording resources
  const cleanupRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    return cleanupRecording;
  }, [cleanupRecording]);

  // Update waveform
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const barCount = 30;
    const samplesPerBar = Math.floor(bufferLength / barCount);
    const bars = [];
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        sum += dataArray[i * samplesPerBar + j];
      }
      bars.push(Math.min(100, (sum / samplesPerBar / 255) * 150));
    }
    
    setWaveformData(bars);
    animationRef.current = requestAnimationFrame(updateWaveform);
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setVoiceConfirmed(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          // Max 5 minutes
          if (prev >= 300) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      updateWaveform();
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Microphone access denied. Please allow microphone access.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      cleanupRecording();
    }
  };

  // Transcribe audio
  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    try {
      const result = await flowforgeAPI.transcribeAudio(audioBlob);
      setTranscription(result.text);
    } catch (error) {
      console.error("Transcription failed:", error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Re-record
  const handleReRecord = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription("");
    setVoiceConfirmed(false);
    setRecordingTime(0);
    setWaveformData([]);
  };

  // Confirm voice note
  const handleConfirmVoice = () => {
    setVoiceConfirmed(true);
    toast.success("Voice note confirmed!");
  };

  // Play/pause audio
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['toolName', 'problem', 'triggerType', 'steps', 'outcome', 'frequency'];
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    
    // Check conditional fields
    const trigger = TRIGGER_OPTIONS.find(t => t.value === formData.triggerType);
    if (trigger?.placeholder) {
      const error = validateField('triggerDetail', formData.triggerDetail);
      if (error) newErrors.triggerDetail = error;
    }
    
    const freq = FREQUENCY_OPTIONS.find(f => f.value === formData.frequency);
    if (freq?.placeholder) {
      const error = validateField('frequencyDetail', formData.frequencyDetail);
      if (error) newErrors.frequencyDetail = error;
    }
    
    // Check voice note
    if (!audioBlob) {
      newErrors.voice = "Please record a voice note";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('[data-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Build submission data
      const submissionData = {
        form_data: {
          tool_name: formData.toolName,
          problem: formData.problem,
          trigger_type: formData.triggerType,
          trigger_detail: formData.triggerDetail,
          steps: formData.steps,
          outcome: formData.outcome,
          who_involved: formData.whoInvolved,
          frequency: formData.frequency,
          frequency_detail: formData.frequencyDetail,
          systems: formData.systems,
          systems_other: formData.systemsOther || null,
          exceptions: formData.exceptions,
          anything_else: formData.anythingElse,
          voice_recording: {
            duration_seconds: recordingTime,
            transcription: transcription
          }
        },
        unit: unit,
        submitted_at: new Date().toISOString()
      };
      
      // Call parent onSubmit
      await onSubmit(submissionData, audioBlob);
      
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error("Failed to submit brief. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form can be submitted
  const canSubmit = formData.toolName.length >= 3 && 
    formData.problem.length >= 20 && 
    formData.triggerType && 
    formData.steps.length >= 30 && 
    formData.outcome.length >= 15 && 
    formData.frequency && 
    audioBlob;

  // Render waveform
  const renderWaveform = () => {
    const bars = isRecording ? waveformData : Array(30).fill(10);
    return (
      <div className="flex items-center justify-center gap-0.5 h-16">
        {bars.map((height, idx) => (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-75 ${
              isRecording ? 'bg-red-500' : audioBlob ? 'bg-[#1FB58A]' : 'bg-gray-300'
            }`}
            style={{ height: `${Math.max(4, height * 0.5)}px` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden" data-testid="problem-brief-form">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] px-6 py-4">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-white" />
          <span className="font-semibold text-white text-lg">New Tool Brief — {unitDisplayName}</span>
        </div>
        <p className="text-white/80 text-sm mt-1">
          Fill out the details below and record a voice note. Both are required — typed answers give structure, voice gives context.
        </p>
      </div>

      {/* Form Body */}
      <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
        
        {/* 1. Tool Name */}
        <div data-error={!!errors.toolName && touched.toolName}>
          <Label className="text-sm font-medium text-gray-800">
            Tool Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={formData.toolName}
            onChange={(e) => handleChange('toolName', e.target.value)}
            onBlur={() => handleBlur('toolName')}
            placeholder="e.g., Auto Candidate Follow-Up, Weekly Pipeline Report"
            className={`mt-1 ${errors.toolName && touched.toolName ? 'border-red-500' : ''}`}
            maxLength={60}
            data-testid="field-tool-name"
          />
          <p className="text-xs text-gray-500 mt-1">Give it a clear, descriptive name</p>
          {errors.toolName && touched.toolName && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.toolName}
            </p>
          )}
        </div>

        {/* 2. The Problem */}
        <div data-error={!!errors.problem && touched.problem}>
          <Label className="text-sm font-medium text-gray-800">
            The Problem <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={formData.problem}
            onChange={(e) => handleChange('problem', e.target.value)}
            onBlur={() => handleBlur('problem')}
            placeholder={placeholders.problem}
            className={`mt-1 w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] min-h-[100px] ${
              errors.problem && touched.problem ? 'border-red-500' : 'border-gray-200'
            }`}
            data-testid="field-problem"
          />
          <p className="text-xs text-gray-500 mt-1">What's painful, slow, or broken right now?</p>
          {errors.problem && touched.problem && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.problem}
            </p>
          )}
        </div>

        {/* 3. The Trigger */}
        <div data-error={!!errors.triggerType && touched.triggerType}>
          <Label className="text-sm font-medium text-gray-800">
            The Trigger <span className="text-red-500">*</span>
          </Label>
          <div className="relative mt-1">
            <select
              value={formData.triggerType}
              onChange={(e) => handleChange('triggerType', e.target.value)}
              onBlur={() => handleBlur('triggerType')}
              className={`w-full px-3 py-2 border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] bg-white ${
                errors.triggerType && touched.triggerType ? 'border-red-500' : 'border-gray-200'
              }`}
              data-testid="field-trigger-type"
            >
              <option value="">Select what starts this automation...</option>
              {TRIGGER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.triggerType && touched.triggerType && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.triggerType}
            </p>
          )}
          
          {/* Conditional trigger detail */}
          {TRIGGER_OPTIONS.find(t => t.value === formData.triggerType)?.placeholder && (
            <div className="mt-2">
              <Input
                value={formData.triggerDetail}
                onChange={(e) => handleChange('triggerDetail', e.target.value)}
                onBlur={() => handleBlur('triggerDetail')}
                placeholder={TRIGGER_OPTIONS.find(t => t.value === formData.triggerType)?.placeholder}
                className={errors.triggerDetail && touched.triggerDetail ? 'border-red-500' : ''}
                data-testid="field-trigger-detail"
              />
              {errors.triggerDetail && touched.triggerDetail && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.triggerDetail}
                </p>
              )}
            </div>
          )}
          {formData.triggerType === 'manual' && (
            <p className="text-xs text-gray-500 mt-2">You'll be able to trigger this from the tool library with one click.</p>
          )}
        </div>

        {/* 4. The Steps */}
        <div data-error={!!errors.steps && touched.steps}>
          <Label className="text-sm font-medium text-gray-800">
            The Steps <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={formData.steps}
            onChange={(e) => handleChange('steps', e.target.value)}
            onBlur={() => handleBlur('steps')}
            placeholder={"Walk through what should happen from start to finish, e.g.:\n1. Check database for candidates with no response in 3+ days\n2. Filter out anyone with an interview scheduled\n3. Generate a personalized follow-up email\n4. Send the email via Gmail\n5. Update their status in the database\n6. Post a summary to Slack"}
            className={`mt-1 w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] min-h-[150px] ${
              errors.steps && touched.steps ? 'border-red-500' : 'border-gray-200'
            }`}
            data-testid="field-steps"
          />
          <p className="text-xs text-gray-500 mt-1">Number your steps if you can. What data, decisions, and actions?</p>
          {errors.steps && touched.steps && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.steps}
            </p>
          )}
        </div>

        {/* 5. The Outcome */}
        <div data-error={!!errors.outcome && touched.outcome}>
          <Label className="text-sm font-medium text-gray-800">
            The Outcome <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={formData.outcome}
            onChange={(e) => handleChange('outcome', e.target.value)}
            onBlur={() => handleBlur('outcome')}
            placeholder="e.g., All cold candidates get a follow-up email within 24 hours, their status is updated automatically, and I get a daily Slack summary"
            className={`mt-1 w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] min-h-[80px] ${
              errors.outcome && touched.outcome ? 'border-red-500' : 'border-gray-200'
            }`}
            data-testid="field-outcome"
          />
          <p className="text-xs text-gray-500 mt-1">What exists at the end that doesn't exist now?</p>
          {errors.outcome && touched.outcome && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.outcome}
            </p>
          )}
        </div>

        {/* 6. Who Is Involved (optional) */}
        <div>
          <Label className="text-sm font-medium text-gray-800">
            Who Is Involved
            <span className="ml-2 text-xs text-gray-400 font-normal">Optional but helpful</span>
          </Label>
          <textarea
            value={formData.whoInvolved}
            onChange={(e) => handleChange('whoInvolved', e.target.value)}
            placeholder="e.g., I trigger it, candidates receive the emails, the #talent Slack channel gets a summary"
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] min-h-[60px]"
            data-testid="field-who-involved"
          />
        </div>

        {/* 7. How Often */}
        <div data-error={!!errors.frequency && touched.frequency}>
          <Label className="text-sm font-medium text-gray-800">
            How Often <span className="text-red-500">*</span>
          </Label>
          <div className="relative mt-1">
            <select
              value={formData.frequency}
              onChange={(e) => handleChange('frequency', e.target.value)}
              onBlur={() => handleBlur('frequency')}
              className={`w-full px-3 py-2 border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] bg-white ${
                errors.frequency && touched.frequency ? 'border-red-500' : 'border-gray-200'
              }`}
              data-testid="field-frequency"
            >
              <option value="">Select frequency...</option>
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.frequency && touched.frequency && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.frequency}
            </p>
          )}
          
          {/* Conditional frequency detail */}
          {FREQUENCY_OPTIONS.find(f => f.value === formData.frequency)?.placeholder && (
            <div className="mt-2">
              <Input
                value={formData.frequencyDetail}
                onChange={(e) => handleChange('frequencyDetail', e.target.value)}
                onBlur={() => handleBlur('frequencyDetail')}
                placeholder={FREQUENCY_OPTIONS.find(f => f.value === formData.frequency)?.placeholder}
                className={errors.frequencyDetail && touched.frequencyDetail ? 'border-red-500' : ''}
                data-testid="field-frequency-detail"
              />
              {errors.frequencyDetail && touched.frequencyDetail && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.frequencyDetail}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 8. Systems & Tools */}
        <div>
          <Label className="text-sm font-medium text-gray-800">
            Systems & Tools Involved
            <span className="ml-2 text-xs text-gray-400 font-normal">Optional but helpful</span>
          </Label>
          <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {SYSTEM_OPTIONS.map(sys => (
              <button
                key={sys.value}
                type="button"
                onClick={() => toggleSystem(sys.value)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  formData.systems.includes(sys.value)
                    ? 'bg-[#1FB58A] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid={`system-${sys.value}`}
              >
                {sys.icon} {sys.label}
              </button>
            ))}
          </div>
          {formData.systems.includes('other') && (
            <Input
              value={formData.systemsOther}
              onChange={(e) => handleChange('systemsOther', e.target.value)}
              placeholder="What other system or tool?"
              className="mt-2"
              data-testid="field-systems-other"
            />
          )}
        </div>

        {/* 9. Exceptions & Edge Cases */}
        <div>
          <Label className="text-sm font-medium text-gray-800">
            Exceptions & Edge Cases
            <span className="ml-2 text-xs text-gray-400 font-normal">Optional but helpful</span>
          </Label>
          <textarea
            value={formData.exceptions}
            onChange={(e) => handleChange('exceptions', e.target.value)}
            placeholder={placeholders.exceptions}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] min-h-[80px]"
            data-testid="field-exceptions"
          />
          <p className="text-xs text-gray-500 mt-1">What should be skipped, handled differently, or avoided?</p>
        </div>

        {/* 10. Anything Else */}
        <div>
          <Label className="text-sm font-medium text-gray-800">
            Anything Else
            <span className="ml-2 text-xs text-gray-400 font-normal">Optional</span>
          </Label>
          <textarea
            value={formData.anythingElse}
            onChange={(e) => handleChange('anythingElse', e.target.value)}
            placeholder="Any other context — tone preferences, deadlines, similar tools you've seen, constraints"
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] min-h-[80px]"
            data-testid="field-anything-else"
          />
        </div>

        {/* 11. Voice Note (Required) */}
        <div className="bg-gray-50 -mx-6 px-6 py-5 border-t border-b border-gray-100" data-error={!!errors.voice}>
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-5 h-5 text-[#1FB58A]" />
            <Label className="text-sm font-medium text-gray-800">
              Voice Note <span className="text-red-500">*</span>
            </Label>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Required.</strong> Walk through this problem in your own words. Add the context that's hard to type — the <em>why</em> behind the problem, what you've tried before, how your team handles it now. <strong>Minimum 30 seconds.</strong>
          </p>
          
          {/* Guided prompts */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">In your voice note, try to cover:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Why does this problem matter? What's the impact on you or your team?</li>
              <li>• How do you or your team handle this manually today?</li>
              <li>• What have you tried before to solve this?</li>
              <li>• Are there any nuances or team dynamics that affect how this should work?</li>
              <li>• What would your ideal solution look like?</li>
            </ul>
          </div>

          {/* Recording UI */}
          {!audioBlob ? (
            <div className="text-center py-4">
              {!isRecording ? (
                <>
                  <button
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full bg-[#1FB58A] hover:bg-[#179C76] text-white flex items-center justify-center mx-auto transition-all shadow-lg hover:shadow-xl"
                    data-testid="start-recording-btn"
                  >
                    <Mic className="w-8 h-8" />
                  </button>
                  <p className="text-sm text-gray-500 mt-3">Tap to start recording</p>
                </>
              ) : (
                <>
                  {renderWaveform()}
                  <p className="text-2xl font-mono text-red-500 mt-2">{formatTime(recordingTime)}</p>
                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center mx-auto mt-4 transition-all animate-pulse"
                    data-testid="stop-recording-btn"
                  >
                    <Square className="w-6 h-6" />
                  </button>
                  <p className="text-sm text-gray-500 mt-2">Tap to stop</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Audio player */}
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
                <button
                  onClick={togglePlayback}
                  className="w-10 h-10 rounded-full bg-[#1FB58A] text-white flex items-center justify-center"
                  data-testid="play-pause-btn"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div className="flex-1">
                  <div className="h-1 bg-gray-200 rounded-full">
                    <div className="h-1 bg-[#1FB58A] rounded-full w-0" />
                  </div>
                </div>
                <span className="text-sm text-gray-500 font-mono">{formatTime(recordingTime)}</span>
                <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
              </div>

              {/* Transcription */}
              {isTranscribing ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1FB58A]" />
                  <span className="text-sm text-gray-600">Transcribing...</span>
                </div>
              ) : transcription ? (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">📝 Transcription Preview</span>
                    <button
                      onClick={() => setIsEditingTranscription(!isEditingTranscription)}
                      className="text-xs text-[#1FB58A] hover:underline"
                    >
                      {isEditingTranscription ? 'Done editing' : 'Edit transcription'}
                    </button>
                  </div>
                  {isEditingTranscription ? (
                    <textarea
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      className="w-full text-sm text-gray-600 border border-gray-200 rounded p-2 min-h-[100px]"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{transcription}</p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={transcribeAudio}
                  variant="outline"
                  className="w-full"
                  data-testid="transcribe-btn"
                >
                  Transcribe Recording
                </Button>
              )}

              {/* Recording info */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Duration: {formatTime(recordingTime)} | Recorded just now</span>
                {recordingTime < 30 && (
                  <span className="text-amber-600">⚠️ Recording is short (aim for 30+ seconds)</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReRecord}
                  className="flex-1"
                  data-testid="re-record-btn"
                >
                  <RotateCcw className="w-4 h-4 mr-1" /> Re-record
                </Button>
                {transcription && (
                  <Button
                    onClick={handleConfirmVoice}
                    disabled={voiceConfirmed}
                    className={`flex-1 ${voiceConfirmed ? 'bg-green-500' : 'bg-[#1FB58A] hover:bg-[#179C76]'} text-white`}
                    data-testid="confirm-voice-btn"
                  >
                    {voiceConfirmed ? (
                      <><Check className="w-4 h-4 mr-1" /> Confirmed</>
                    ) : (
                      <><Check className="w-4 h-4 mr-1" /> Looks good</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {errors.voice && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.voice}
            </p>
          )}
        </div>
      </div>

      {/* Footer / Submit */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`w-full h-12 text-base font-medium ${
            canSubmit && !isSubmitting
              ? 'bg-[#1FB58A] hover:bg-[#179C76] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          data-testid="submit-brief-btn"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
          ) : (
            <><Check className="w-5 h-5 mr-2" /> Submit Brief</>
          )}
        </Button>
        {!canSubmit && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Complete all required fields and record a voice note to submit
          </p>
        )}
      </div>
    </div>
  );
};

export default ProblemBriefForm;
