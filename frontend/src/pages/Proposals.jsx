import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  FolderPlus, 
  Upload, 
  File, 
  FileText, 
  Presentation, 
  Table2,
  Trash2, 
  Copy, 
  Download, 
  ExternalLink,
  ChevronRight,
  Search,
  MoreHorizontal,
  RefreshCw,
  ArrowLeft,
  FolderOpen,
  Play,
  Sparkles,
  Users
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Progress } from "../components/ui/progress";
import { clientsAPI, proposalsAPI } from "../lib/api";
import { toast } from "sonner";

const Proposals = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [createClientModal, setCreateClientModal] = useState(false);
  const [deleteClientDialog, setDeleteClientDialog] = useState({ open: false, client: null });
  const [deleteProposalDialog, setDeleteProposalDialog] = useState({ open: false, proposal: null });
  
  // Form states
  const [newClientName, setNewClientName] = useState("");
  const [newClientDescription, setNewClientDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientsAPI.getAll();
      setClients(data);
    } catch (error) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async (clientId) => {
    try {
      setProposalsLoading(true);
      const data = await clientsAPI.getProposals(clientId);
      setProposals(data);
    } catch (error) {
      toast.error("Failed to load proposals");
    } finally {
      setProposalsLoading(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    fetchProposals(client.client_id);
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setProposals([]);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error("Client name is required");
      return;
    }

    try {
      const data = await clientsAPI.create({
        name: newClientName.trim(),
        description: newClientDescription.trim()
      });
      setClients([data, ...clients]);
      setCreateClientModal(false);
      setNewClientName("");
      setNewClientDescription("");
      toast.success(`Client "${data.name}" created successfully`);
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : "Failed to create client");
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteClientDialog.client) return;
    
    try {
      await clientsAPI.delete(deleteClientDialog.client.client_id);
      setClients(clients.filter(c => c.client_id !== deleteClientDialog.client.client_id));
      setDeleteClientDialog({ open: false, client: null });
      toast.success("Client deleted successfully");
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : "Failed to delete client");
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      toast.error(`File type not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const data = await clientsAPI.uploadProposal(
        selectedClient.client_id, 
        file,
        (progress) => setUploadProgress(progress)
      );
      
      setProposals([data, ...proposals]);
      setClients(clients.map(c => 
        c.client_id === selectedClient.client_id 
          ? { ...c, proposal_count: (c.proposal_count || 0) + 1 }
          : c
      ));
      setSelectedClient(prev => ({ ...prev, proposal_count: (prev.proposal_count || 0) + 1 }));
      
      toast.success("Proposal uploaded successfully");
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : "Failed to upload proposal");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProposal = async () => {
    if (!deleteProposalDialog.proposal) return;
    
    try {
      await proposalsAPI.delete(deleteProposalDialog.proposal.proposal_id);
      setProposals(proposals.filter(p => p.proposal_id !== deleteProposalDialog.proposal.proposal_id));
      setClients(clients.map(c => 
        c.client_id === selectedClient?.client_id 
          ? { ...c, proposal_count: Math.max(0, (c.proposal_count || 1) - 1) }
          : c
      ));
      setSelectedClient(prev => prev ? { ...prev, proposal_count: Math.max(0, (prev.proposal_count || 1) - 1) } : null);
      setDeleteProposalDialog({ open: false, proposal: null });
      toast.success("Proposal deleted successfully");
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : "Failed to delete proposal");
    }
  };

  const handleCopyLink = async (proposal) => {
    try {
      await navigator.clipboard.writeText(proposal.share_url);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleRegenerateLink = async (proposal) => {
    try {
      const data = await proposalsAPI.regenerateLink(proposal.proposal_id);
      setProposals(proposals.map(p => 
        p.proposal_id === proposal.proposal_id 
          ? { ...p, share_token: data.share_token, share_url: data.share_url }
          : p
      ));
      toast.success("Link regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate link");
    }
  };

  const handleDownload = (proposal) => {
    const downloadUrl = proposalsAPI.getDownloadUrl(proposal.share_token);
    window.open(downloadUrl, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'PowerPoint':
        return <Presentation className="w-5 h-5 text-orange-500" />;
      case 'Excel':
        return <Table2 className="w-5 h-5 text-green-500" />;
      case 'Word':
        return <File className="w-5 h-5 text-blue-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProposals = proposals.filter(proposal =>
    proposal.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-white rounded-2xl border border-gray-100"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="proposals-page">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {selectedClient && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToClients}
                className="rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                data-testid="back-to-clients-btn"
              >
                <ArrowLeft size={20} />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedClient ? selectedClient.name : "Proposals"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {selectedClient 
                  ? `${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} • ${selectedClient.description || 'No description'}`
                  : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder={selectedClient ? "Search proposals..." : "Search clients..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:bg-white focus:border-emerald-500"
                data-testid="search-input"
              />
            </div>
            
            {selectedClient ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  data-testid="file-input"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  data-testid="upload-proposal-btn"
                >
                  <Upload size={18} className="mr-2" />
                  Upload Proposal
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setCreateClientModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                data-testid="create-client-btn"
              >
                <FolderPlus size={18} className="mr-2" />
                New Client
              </Button>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-5 h-5 text-emerald-600 animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Uploading...</span>
              <span className="text-sm text-emerald-600 ml-auto">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Interactive Presentations Section - Only show when not viewing a client */}
      {!selectedClient && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900">Interactive Presentations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Procure AI Presentation - Page Based */}
            <Link
              to="/proposals/procure-ai"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-presentation-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E2761] to-[#0D9488] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <Play className="w-3 h-3" />
                    Slideshow
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Procure AI</h3>
                <p className="text-sm text-white/70 mb-4">
                  Process Flowcharts & Database Architecture for IHS Towers Nigeria
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>8 Sections</span>
                  <span>•</span>
                  <span>Page Navigation</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI Scroll Presentation */}
            <Link
              to="/proposals/procure-ai-scroll"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-scroll-presentation-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] to-[#1E2761] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <FolderOpen className="w-3 h-3" />
                    Scroll
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Procure AI (Scroll)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Vertical scroll presentation with animated sections
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>8 Sections</span>
                  <span>•</span>
                  <span>PDF Export</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI TWG Session - Technical Working Group */}
            <Link
              to="/proposals/procure-ai-twg"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-twg-presentation-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#EA580C] to-[#1E2761] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <FolderOpen className="w-3 h-3" />
                    Scroll
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">TWG Session (Scroll)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Technical Working Group - Architecture & Security Walkthrough
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>14 Sections</span>
                  <span>•</span>
                  <span>PDF Export</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI TWG Slideshow - Page-by-Page */}
            <Link
              to="/proposals/twg-slideshow"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-twg-slideshow-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0D9488] to-[#1E2761] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">TWG Slideshow</h3>
                <p className="text-sm text-white/70 mb-4">
                  Technical Working Group - Animated Page-by-Page Presentation
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>14 Slides</span>
                  <span>•</span>
                  <span>Keyboard Nav</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* AI Lab Venture — email-gated PDF */}
            <Link
              to="/proposals/view/JYLe33GgkcNbvIUcDLGTF3M7jOSxiV-kNkCOQy7w4eg"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#7C3AED] hover:shadow-lg transition-all"
              data-testid="ai-lab-venture-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] to-[#312E81] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/30 flex items-center justify-center">
                    <span className="text-[#C4B5FD] font-bold text-lg">AI</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#C4B5FD] bg-[#7C3AED]/30 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">AI Lab Venture</h3>
                <p className="text-sm text-white/70 mb-4">
                  Venture Document — Email-gated PDF
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>PDF</span>
                  <span>•</span>
                  <span>Email Required</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#7C3AED]/40 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* THE FORGE Presentation */}
            <Link
              to="/proposals/the-forge"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#E87A2A] hover:shadow-lg transition-all"
              data-testid="the-forge-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0E0C09] to-[#1A1610] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E87A2A]/20 flex items-center justify-center">
                    <span className="text-[#E87A2A] font-bold text-lg" style={{ fontFamily: 'serif' }}>F</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#E87A2A] bg-[#E87A2A]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">THE FORGE</h3>
                <p className="text-sm text-white/70 mb-4">
                  Fire and Memory — Lookbook & Proposal
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>24 Pages</span>
                  <span>•</span>
                  <span>Cinematic Deck</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#E87A2A]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* THE FORGE V2 Presentation */}
            <Link
              to="/proposals/the-forge-v2"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#E87A2A] hover:shadow-lg transition-all"
              data-testid="the-forge-v2-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A0705] to-[#1A1208] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E87A2A]/20 flex items-center justify-center">
                    <span className="text-[#E87A2A] font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }}>F2</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#E87A2A] bg-[#E87A2A]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">THE FORGE V2</h3>
                <p className="text-sm text-white/70 mb-4">
                  Fire and Memory — Industrial Edition
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>24 Pages</span>
                  <span>•</span>
                  <span>Cinematic Deck</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#E87A2A]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* TIDE WAR Presentation */}
            <Link
              to="/proposals/tide-war"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#D4860A] hover:shadow-lg transition-all"
              data-testid="tide-war-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#04080F] to-[#0A1018] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#D4860A]/20 flex items-center justify-center">
                    <span className="text-[#D4860A] font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>TW</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#D4860A] bg-[#D4860A]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">TIDE WAR</h3>
                <p className="text-sm text-white/70 mb-4">
                  Current Shift — Lookbook & Proposal
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>26 Pages</span>
                  <span>•</span>
                  <span>Cinematic Deck</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#D4860A]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Sagicor STEC Presentation */}
            <Link
              to="/proposals/sagicor-stec"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#00D4FF] hover:shadow-lg transition-all"
              data-testid="sagicor-stec-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] to-[#1A1A2E] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/15 flex items-center justify-center">
                    <span className="text-[#00D4FF] font-bold text-sm" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>ST</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">SAGICOR STEC</h3>
                <p className="text-sm text-white/70 mb-4">
                  Technology Capability Assessment
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>20 Slides</span>
                  <span>•</span>
                  <span>Executive Briefing</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#00D4FF]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* INGABO Presentation */}
            <Link
              to="/proposals/ingabo"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#C4933F] hover:shadow-lg transition-all"
              data-testid="ingabo-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#12121E] to-[#1a1a2e] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#C4933F]/20 flex items-center justify-center">
                    <span className="text-[#C4933F] font-bold text-lg" style={{ fontFamily: 'serif' }}>I</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#C4933F] bg-[#C4933F]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">INGABO</h3>
                <p className="text-sm text-white/70 mb-4">
                  Rise of the Thousand Hills — Lookbook & Proposal
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>24 Pages</span>
                  <span>•</span>
                  <span>Cinematic Deck</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#C4933F]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* GDL x Pebbles Presentation */}
            <Link
              to="/proposals/gdl-pebbles"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#B03140] hover:shadow-lg transition-all"
              data-testid="gdl-pebbles-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] to-[#132036] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#B03140] bg-[#B03140]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">GDL × Pebbles</h3>
                <p className="text-sm text-white/70 mb-4">
                  Strategic Assessment & Partnership Proposal
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>12 Slides</span>
                  <span>•</span>
                  <span>Executive Deck</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#B03140]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI EY Alignment */}
            <Link
              to="/proposals/procure-ai-ey"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#0D9488] hover:shadow-lg transition-all"
              data-testid="procure-ai-ey-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A2744] to-[#1E3A5F] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#0D9488] bg-[#0D9488]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Procure AI — EY Alignment</h3>
                <p className="text-sm text-white/70 mb-4">
                  PMO/TQA Alignment Session — IHS Towers
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>15 Slides</span>
                  <span>•</span>
                  <span>Enterprise PMO</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#0D9488]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI Meet the Team */}
            <Link
              to="/proposals/procure-ai-team"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#0D9488] hover:shadow-lg transition-all"
              data-testid="procure-ai-team-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E2761] to-[#263175] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#0D9488] bg-[#0D9488]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Procure AI — Meet the Team</h3>
                <p className="text-sm text-white/70 mb-4">
                  Delivery Team — IHS Towers Engagement
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>5 Slides</span>
                  <span>•</span>
                  <span>Team Profiles</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#0D9488]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Pebbles Brand Identity */}
            <Link
              to="/proposals/pebbles-brand"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#FF2D8A] hover:shadow-lg transition-all"
              data-testid="pebbles-brand-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0D0D0D] to-[#1A1A2E] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#FF2D8A] bg-[#FF2D8A]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Pebbles Brand Identity</h3>
                <p className="text-sm text-white/70 mb-4">
                  Brand Identity & Vision Presentation
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>8 Slides</span>
                  <span>•</span>
                  <span>Brand Book</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#FF2D8A]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* AI for Banking Presentation */}
            <Link
              to="/proposals/ai-banking"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#2E75B6] hover:shadow-lg transition-all"
              data-testid="ai-banking-presentation-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] to-[#1B3A5C] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#C5963A] bg-[#C5963A]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">AI for Banking</h3>
                <p className="text-sm text-white/70 mb-4">
                  From Monitoring to Intelligence — Executive Presentation
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>32 Slides</span>
                  <span>•</span>
                  <span>Cinematic Animated</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#C5963A]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* AFC Cross-Border Treasury System */}
            <Link
              to="/proposals/afc-treasury"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#1D9E75] hover:shadow-lg transition-all"
              data-testid="afc-treasury-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0B1120] to-[#0F3D2E] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/15 flex items-center justify-center">
                    <span className="text-[#1D9E75] font-bold text-sm" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em' }}>AFC</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">AFC Treasury System</h3>
                <p className="text-sm text-white/70 mb-4">
                  Cross-Border Treasury and Settlement System
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>20 Slides</span>
                  <span>•</span>
                  <span>Institutional Animated</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#1D9E75]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Winston Duke Brand Identity */}
            <Link
              to="/proposals/winston-duke"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#C9A84C] hover:shadow-lg transition-all"
              data-testid="winston-duke-link"
            >
              <div className="absolute inset-0 bg-black" />
              <div className="absolute inset-0 opacity-30">
                <img src="/winston-duke/Winston_Duke.webp.jpg" alt="" className="w-full h-full object-cover object-top" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#C9A84C]/15 flex items-center justify-center">
                    <span className="text-[#C9A84C] font-bold text-sm" style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.06em' }}>WD</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Winston Duke</h3>
                <p className="text-sm text-white/70 mb-4">
                  The Mark of Winston Duke — Brand Identity Reveal
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>29 Slides</span>
                  <span>•</span>
                  <span>Cinematic Brand Identity</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#C9A84C]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* THCO Town Hall 2026 - Internal Presentation */}
            <Link
              to="/proposals/town-hall-2026"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
              data-testid="thco-town-hall-2026-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0B0620] to-[#7C3AED] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">THCO Town Hall 2026</h3>
                <p className="text-sm text-white/70 mb-4">
                  Internal CEO presentation - The Future Is Now
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>33 Slides</span>
                  <span>•</span>
                  <span>Animated</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI GCIO Executive Pack */}
            <Link
              to="/proposals/gcio-pack"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-gcio-pack-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0D9488] to-[#1E2761] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">GCIO Executive Pack</h3>
                <p className="text-sm text-white/70 mb-4">
                  Strategic Validation Session - IHS Towers Nigeria
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>17 Slides</span>
                  <span>•</span>
                  <span>$167,500 Programme</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Sagicor Progress Dashboard */}
            <Link
              to="/proposals/sagicor-progress"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-[#D4A843] hover:shadow-lg transition-all"
              data-testid="sagicor-progress-dashboard-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1B3A5C] to-[#0F2440] opacity-95" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#D4A843] bg-[#D4A843]/15 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Sagicor Progress Dashboard</h3>
                <p className="text-sm text-white/70 mb-4">
                  Technology Capability Assessment - Executive View
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>8 Sections</span>
                  <span>•</span>
                  <span>Animated Dashboard</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[#D4A843]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI Executive Pack - GCIO Kick-Off */}
            <Link
              to="/proposals/procure-ai-executive"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-executive-presentation-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E2761] to-[#059669] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Premium
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Executive Kick-Off Pack</h3>
                <p className="text-sm text-white/70 mb-4">
                  Strategic validation session for Group CIO - IHS Towers
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>12 Slides</span>
                  <span>•</span>
                  <span>PDF Export</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI Executive Pack V3 - Previous Version */}
            <Link
              to="/proposals/procure-ai-executive-v3"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-executive-v3-presentation-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] to-[#1E2761] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <Play className="w-3 h-3" />
                    Slideshow
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Executive Pack (V3)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Previous executive presentation version
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>12 Slides</span>
                  <span>•</span>
                  <span>PDF Export</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>

            {/* Procure AI V1 - Original Version */}
            <Link
              to="/proposals/procure-ai-v1"
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-cyan-300 hover:shadow-lg transition-all"
              data-testid="procure-ai-v1-presentation-link"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0891B2] to-[#1E2761] opacity-90" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                    <Play className="w-3 h-3" />
                    Slideshow
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Procure AI (V1)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Original process flowchart presentation
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>8 Sections</span>
                  <span>•</span>
                  <span>Page Navigation</span>
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      {selectedClient ? (
        // Proposals View
        proposalsLoading ? (
          <div className="grid grid-cols-1 gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100"></div>
            ))}
          </div>
        ) : filteredProposals.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredProposals.map((proposal) => (
                <div 
                  key={proposal.proposal_id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                  data-testid={`proposal-item-${proposal.proposal_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      {getFileIcon(proposal.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {proposal.original_filename}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{proposal.file_type}</span>
                        <span>•</span>
                        <span>{formatFileSize(proposal.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(proposal.created_at)}</span>
                        <span>•</span>
                        <span>by {proposal.uploaded_by_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(proposal)}
                        className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50"
                        data-testid={`copy-link-btn-${proposal.proposal_id}`}
                      >
                        <Copy size={14} className="mr-1.5" />
                        Copy Link
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(proposal)}
                        className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50"
                        data-testid={`download-btn-${proposal.proposal_id}`}
                      >
                        <Download size={14} className="mr-1.5" />
                        Download
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          >
                            <MoreHorizontal size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border-gray-200 rounded-xl">
                          <DropdownMenuItem 
                            onClick={() => window.open(proposal.share_url, '_blank')}
                            className="text-gray-700 focus:bg-gray-50 cursor-pointer rounded-lg"
                          >
                            <ExternalLink size={14} className="mr-2" />
                            Open Share Link
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRegenerateLink(proposal)}
                            className="text-gray-700 focus:bg-gray-50 cursor-pointer rounded-lg"
                          >
                            <RefreshCw size={14} className="mr-2" />
                            Regenerate Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-100" />
                          <DropdownMenuItem 
                            onClick={() => setDeleteProposalDialog({ open: true, proposal })}
                            className="text-red-600 focus:bg-red-50 cursor-pointer rounded-lg"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <File className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No proposals yet</h3>
            <p className="text-gray-500 mb-6">Upload your first proposal to share with this client</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Upload size={18} className="mr-2" />
              Upload Proposal
            </Button>
          </div>
        )
      ) : (
        // Clients View
        filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <div
                key={client.client_id}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer group shadow-sm"
                onClick={() => handleSelectClient(client)}
                data-testid={`client-card-${client.client_id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-emerald-600" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-white border-gray-200 rounded-xl">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteClientDialog({ open: true, client });
                        }}
                        className="text-red-600 focus:bg-red-50 cursor-pointer rounded-lg"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
                  {client.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {client.description || "No description"}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {client.proposal_count || 0} proposal{(client.proposal_count || 0) !== 1 ? 's' : ''}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-500 mb-6">Create your first client folder to organize proposals</p>
            <Button
              onClick={() => setCreateClientModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <FolderPlus size={18} className="mr-2" />
              New Client
            </Button>
          </div>
        )
      )}

      {/* Create Client Modal */}
      <Dialog open={createClientModal} onOpenChange={setCreateClientModal}>
        <DialogContent className="bg-white border-gray-200 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create New Client</DialogTitle>
            <DialogDescription className="text-gray-500">
              Create a folder to organize proposals for this client
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="client-name" className="text-gray-700">Client Name *</Label>
              <Input
                id="client-name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:bg-white focus:border-emerald-500"
                data-testid="client-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client-description" className="text-gray-700">Description</Label>
              <Textarea
                id="client-description"
                value={newClientDescription}
                onChange={(e) => setNewClientDescription(e.target.value)}
                placeholder="Brief description of the client..."
                rows={3}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl resize-none focus:bg-white focus:border-emerald-500"
                data-testid="client-description-input"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setCreateClientModal(false)}
              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              data-testid="create-client-submit-btn"
            >
              Create Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation */}
      <AlertDialog 
        open={deleteClientDialog.open} 
        onOpenChange={(open) => setDeleteClientDialog({ open, client: deleteClientDialog.client })}
      >
        <AlertDialogContent className="bg-white border-gray-200 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete Client?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              This will permanently delete <span className="font-medium text-gray-700">{deleteClientDialog.client?.name}</span> and all its proposals. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              data-testid="confirm-delete-client-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Proposal Confirmation */}
      <AlertDialog 
        open={deleteProposalDialog.open} 
        onOpenChange={(open) => setDeleteProposalDialog({ open, proposal: deleteProposalDialog.proposal })}
      >
        <AlertDialogContent className="bg-white border-gray-200 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete Proposal?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              This will permanently delete <span className="font-medium text-gray-700">{deleteProposalDialog.proposal?.original_filename}</span>. The share link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProposal}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              data-testid="confirm-delete-proposal-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Proposals;
