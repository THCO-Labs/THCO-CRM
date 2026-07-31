import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, X, Check, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { flowforgeAPI } from "../../lib/api";

const VoiceRecorder = ({ onTranscriptionComplete, onCancel, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Update waveform visualization
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Sample 20 bars from the frequency data
    const barCount = 20;
    const samplesPerBar = Math.floor(bufferLength / barCount);
    const bars = [];
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        sum += dataArray[i * samplesPerBar + j];
      }
      // Normalize to 0-100 range
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
      
      // Set up audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start waveform animation
      updateWaveform();
      
    } catch (error) {
      console.error("Failed to start recording:", error);
      if (error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please allow microphone access to record.");
      } else {
        toast.error("Failed to start recording. Please try again.");
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Transcribe the recorded audio
  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    try {
      const result = await flowforgeAPI.transcribeAudio(audioBlob);
      setTranscription(result.text);
      setIsEditing(true);
    } catch (error) {
      console.error("Transcription failed:", error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Use the transcription
  const useTranscription = () => {
    if (transcription.trim()) {
      onTranscriptionComplete(transcription.trim(), recordingTime);
    }
    resetRecorder();
  };

  // Reset the recorder
  const resetRecorder = () => {
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setIsTranscribing(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setTranscription("");
    setIsEditing(false);
    setWaveformData([]);
    chunksRef.current = [];
  };

  // Handle cancel
  const handleCancel = () => {
    resetRecorder();
    if (onCancel) onCancel();
  };

  // Render waveform bars
  const renderWaveform = () => {
    const bars = isRecording ? waveformData : Array(20).fill(10);
    return (
      <div className="flex items-center justify-center gap-0.5 h-12" data-testid="voice-waveform">
        {bars.map((height, index) => (
          <div
            key={index}
            className={`w-1 rounded-full transition-all duration-75 ${
              isRecording ? 'bg-red-500' : audioBlob ? 'bg-[#1FB58A]' : 'bg-gray-300'
            }`}
            style={{ height: `${Math.max(4, height * 0.4)}px` }}
          />
        ))}
      </div>
    );
  };

  // If editing transcription
  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg" data-testid="voice-transcription-editor">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Edit Transcription</span>
          <span className="text-xs text-gray-400">{formatTime(recordingTime)}</span>
        </div>
        
        <textarea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1FB58A]/20 focus:border-[#1FB58A] text-sm"
          rows={3}
          placeholder="Transcribed text will appear here..."
          data-testid="transcription-textarea"
        />
        
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            data-testid="cancel-transcription-btn"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={useTranscription}
            disabled={!transcription.trim()}
            className="bg-[#1FB58A] hover:bg-[#179C76] text-white"
            data-testid="use-transcription-btn"
          >
            <Check className="w-4 h-4 mr-1" />
            Use This
          </Button>
        </div>
      </div>
    );
  }

  // If we have a recording, show transcribe UI
  if (audioBlob && !isTranscribing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg" data-testid="voice-recorded">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Recording Complete</span>
          <span className="text-sm font-mono text-[#1FB58A]">{formatTime(recordingTime)}</span>
        </div>
        
        {renderWaveform()}
        
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={resetRecorder}
            data-testid="discard-recording-btn"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={transcribeAudio}
            className="bg-[#1FB58A] hover:bg-[#179C76] text-white"
            data-testid="transcribe-recording-btn"
          >
            <Check className="w-4 h-4 mr-1" />
            Transcribe
          </Button>
        </div>
      </div>
    );
  }

  // If transcribing
  if (isTranscribing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg" data-testid="voice-transcribing">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1FB58A]" />
          <span className="text-sm text-gray-600">Processing your voice...</span>
        </div>
      </div>
    );
  }

  // Recording UI
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg" data-testid="voice-recorder">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          {isRecording ? 'Recording...' : 'Ready to Record'}
        </span>
        <span className={`text-sm font-mono ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
          {formatTime(recordingTime)}
        </span>
      </div>
      
      {renderWaveform()}
      
      <div className="flex justify-center gap-2 mt-4">
        {!isRecording ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              data-testid="cancel-recording-btn"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={startRecording}
              disabled={disabled}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="start-recording-btn"
            >
              <Mic className="w-4 h-4 mr-1" />
              Start Recording
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white"
            data-testid="stop-recording-btn"
          >
            <Square className="w-4 h-4 mr-1" />
            Stop Recording
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
