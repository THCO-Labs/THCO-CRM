import { useState, useEffect, useRef, useMemo } from "react";
import IconBadge, { accentFromClass } from "../components/ui/icon-badge";
import { useNavigate, useLocation } from "react-router-dom";
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
  Users,
  LayoutTemplate,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { clientsAPI, proposalsAPI } from "../lib/api";
import { toast } from "sonner";

const PRESENTATION_CATEGORIES = [
  { value: "All", label: "All" },
  { value: "Slideshow", label: "Slideshow" },
  { value: "Scroll", label: "Scroll" },
  { value: "New", label: "New" },
  { value: "Premium", label: "Premium" },
];

const categoryClass = (category) => {
  const base = "text-xs font-medium px-2.5 py-1 rounded-full border";
  const styles = {
    Slideshow: `${base} text-emerald-700 bg-emerald-50 border-emerald-100`,
    Scroll: `${base} text-blue-700 bg-blue-50 border-blue-100`,
    New: `${base} text-amber-700 bg-amber-50 border-amber-100`,
    Premium: `${base} text-purple-700 bg-purple-50 border-purple-100`,
  };
  return styles[category] || styles.New;
};

const shortDescription = (category) => {
  const map = {
    Slideshow: "Interactive page-based deck experience.",
    Scroll: "Long-form document-style flow.",
    New: "Recently published presentation.",
    Premium: "Featured or premium material.",
  };
  return map[category] || "Presentation file.";
};

const accentClass = (category) => {
  const styles = {
    Slideshow: "from-emerald-500/25 to-emerald-500/0 border-emerald-200 hover:border-emerald-300",
    Scroll: "from-blue-500/25 to-blue-500/0 border-blue-200 hover:border-blue-300",
    New: "from-amber-500/25 to-amber-500/0 border-amber-200 hover:border-amber-300",
    Premium: "from-purple-500/25 to-purple-500/0 border-purple-200 hover:border-purple-300",
  };
  return styles[category] || styles.New;
};

const textForAccent = (category) => {
  const styles = {
    Slideshow: "text-emerald-900",
    Scroll: "text-blue-900",
    New: "text-amber-900",
    Premium: "text-purple-900",
  };
  return styles[category] || "text-gray-900";
};

const mutedForAccent = (category) => {
  const styles = {
    Slideshow: "text-emerald-700",
    Scroll: "text-blue-700",
    New: "text-amber-700",
    Premium: "text-purple-700",
  };
  return styles[category] || "text-gray-700";
};

const STATUS_META = {
  PDF: { icon: "📄", color: "text-red-500 bg-red-50 border-red-100" },
  PowerPoint: { icon: "🎞️", color: "text-orange-500 bg-orange-50 border-orange-100" },
  Excel: { icon: "📊", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  Word: { icon: "📝", color: "text-blue-600 bg-blue-50 border-blue-100" },
  default: { icon: "📎", color: "text-gray-600 bg-gray-50 border-gray-100" },
};

const FALLBACK_PRESENTATIONS = [
  {
    id: "procure-ai-slideshow",
    title: "Procure AI",
    category: "Slideshow",
    client: "IHS Towers Nigeria",
    lastModified: "Jul 27, 2026",
    status: "Published",
    description: "Process Flowcharts & Database Architecture for IHS Towers Nigeria",
    meta: "8 Sections • Page Navigation",
    features: "Page-by-page navigation with animated process flows and database architecture walkthroughs.",
    gradient: "from-teal-500/25 to-emerald-500/20",
    accentText: "text-teal-900",
    accentMuted: "text-teal-700",
  },
  {
    id: "procure-ai-scroll",
    title: "Procure AI (Scroll)",
    category: "Scroll",
    client: "IHS Towers Nigeria",
    lastModified: "Jul 27, 2026",
    status: "Published",
    description: "Vertical scroll presentation with animated sections",
    meta: "8 Sections • PDF Export",
    features: "Continuous narrative flow with animated scroll sections and export-ready PDF packaging.",
    gradient: "from-blue-500/25 to-indigo-500/20",
    accentText: "text-blue-900",
    accentMuted: "text-blue-700",
  },
  {
    id: "twg-session-scroll",
    title: "TWG Session (Scroll)",
    category: "Scroll",
    client: "Technical Working Group",
    lastModified: "Jul 26, 2026",
    status: "Draft",
    description: "Technical Working Group – Architecture & Security Walkthrough",
    meta: "14 Sections • PDF Export",
    features: "Long-form architecture review with security controls, assumptions, and implementation notes.",
    gradient: "from-orange-500/25 to-amber-500/20",
    accentText: "text-orange-900",
    accentMuted: "text-orange-700",
  },
  {
    id: "twg-slideshow",
    title: "TWG Slideshow",
    category: "Slideshow",
    client: "Technical Working Group",
    lastModified: "Jul 26, 2026",
    status: "Draft",
    description: "Technical Working Group – Animated Page-by-Page Presentation",
    meta: "14 Slides • Keyboard Nav",
    features: "Keyboard-navigable deck with animated transitions and presenter notes for live review.",
    gradient: "from-emerald-500/25 to-teal-500/20",
    accentText: "text-emerald-900",
    accentMuted: "text-emerald-700",
  },
  {
    id: "ai-lab-venture",
    title: "AI Lab Venture",
    category: "New",
    client: "Venture Track",
    lastModified: "Jul 25, 2026",
    status: "Review",
    description: "Venture Document — Email-gated PDF",
    meta: "PDF • Email Required",
    features: "Gated distribution document with lead-capture form and branded PDF delivery.",
    gradient: "from-purple-500/25 to-violet-500/20",
    accentText: "text-purple-900",
    accentMuted: "text-purple-700",
  },
  {
    id: "the-forge",
    title: "THE FORGE",
    category: "New",
    client: "Brand Studio",
    lastModified: "Jul 24, 2026",
    status: "Published",
    description: "Fire and Memory — Lookbook & Proposal",
    meta: "24 Pages • Cinematic Deck",
    features: "Cinematic lookbook with mood-driven layouts, narrative pacing, and proposal-ready sections.",
    gradient: "from-gray-700/40 to-gray-900/30",
    accentText: "text-gray-900",
    accentMuted: "text-gray-700",
  },
  {
    id: "the-forge-v2",
    title: "THE FORGE V2",
    category: "New",
    client: "Brand Studio",
    lastModified: "Jul 24, 2026",
    status: "Draft",
    description: "Updated lookbook and proposal deck — V2",
    meta: "24 Pages • Cinematic Deck",
    features: "Revised cinematic lookbook with updated imagery, pacing, and executive proposal pages.",
    gradient: "from-stone-700/40 to-stone-900/30",
    accentText: "text-stone-900",
    accentMuted: "text-stone-700",
  },
  {
    id: "tide-war",
    title: "TIDE WAR",
    category: "New",
    client: "Brand Studio",
    lastModified: "Jul 24, 2026",
    status: "Draft",
    description: "Competitive brand narrative and commercial deck",
    meta: "Campaign Deck • Market Review",
    features: "Comparative narrative layout with campaign messaging, market context, and brand positioning.",
    gradient: "from-amber-700/30 to-orange-900/30",
    accentText: "text-amber-900",
    accentMuted: "text-amber-700",
  },
  {
    id: "sagicor-stec",
    title: "SAGICOR STEC",
    category: "Premium",
    client: "Sagicor",
    lastModified: "Jul 23, 2026",
    status: "Review",
    description: "Executive proposal and engineering review pack",
    meta: "Premium • Executive Review",
    features: "Premium executive package with engineering review sections, pricing models, and approval flow.",
    gradient: "from-indigo-500/25 to-purple-500/20",
    accentText: "text-indigo-900",
    accentMuted: "text-indigo-700",
  },
];

const Proposals = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const view = useMemo(() => {
    if (location.pathname === "/proposals/presentations") return "presentations";
    if (location.pathname === "/proposals/clients") return "clients";
    return "landing";
  }, [location.pathname]);

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presentationsLoading, setPresentationsLoading] = useState(false);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [createClientModal, setCreateClientModal] = useState(false);
  const [deleteClientDialog, setDeleteClientDialog] = useState({ open: false, client: null });
  const [deleteProposalDialog, setDeleteProposalDialog] = useState({ open: false, proposal: null });

  const [newClientName, setNewClientName] = useState("");
  const [newClientDescription, setNewClientDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchClients();
    fetchPresentations();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientsAPI.getAll();
      setClients(Array.isArray(data) ? data : []);
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
      setProposals(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load proposals");
    } finally {
      setProposalsLoading(false);
    }
  };

  const fetchPresentations = async () => {
    try {
      setPresentationsLoading(true);
      const [allProposals] = await Promise.all([proposalsAPI.getAll()]);
      const rows = Array.isArray(allProposals) ? allProposals : [];
      const apiItems = rows.map((item, idx) => {
        const fileTypeRaw = String(item.file_type || "").toLowerCase();
        let category = "New";
        if (["powerpoint", "ppt", "pptx", "deck", "slideshow", "presentation"].some((t) => fileTypeRaw.includes(t))) {
          category = "Slideshow";
        } else if (["pdf", "word", "excel", "document", "doc", "docx", "xls", "xlsx"].some((t) => fileTypeRaw.includes(t))) {
          category = "Scroll";
        } else {
          category = "New";
        }
        return {
          id: item.id || item.proposal_id || `fallback-${idx}`,
          title: item.title || item.original_filename || `Untitled Presentation ${idx + 1}`,
          category,
          client: item.client_name,
          lastModified: item.created_at || item.updated_at,
          status: item.status || "Draft",
        };
      });

      const apiIds = new Set(apiItems.map((item) => item.id));
      const mergedFallback = FALLBACK_PRESENTATIONS.filter((item) => !apiIds.has(item.id));
      setPresentations([...apiItems, ...mergedFallback]);
    } catch {
      setPresentations([...FALLBACK_PRESENTATIONS]);
    } finally {
      setPresentationsLoading(false);
    }
  };

  useEffect(() => {
    if (view === "presentations") fetchPresentations();
  }, [view]);

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
        description: newClientDescription.trim(),
      });
      setClients([data, ...clients]);
      setCreateClientModal(false);
      setNewClientName("");
      setNewClientDescription("");
      toast.success(`Client "${data.name}" created successfully`);
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === "string" ? error.response.data.detail : "Failed to create client");
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteClientDialog.client) return;
    try {
      await clientsAPI.delete(deleteClientDialog.client.client_id);
      setClients(clients.filter((c) => c.client_id !== deleteClientDialog.client.client_id));
      setDeleteClientDialog({ open: false, client: null });
      toast.success("Client deleted successfully");
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === "string" ? error.response.data.detail : "Failed to delete client");
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    const allowedExtensions = [".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx"];
    const fileExt = "." + file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      toast.error(`File type not allowed. Allowed: ${allowedExtensions.join(", ")}`);
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
      setClients(
        clients.map((c) =>
          c.client_id === selectedClient.client_id
            ? { ...c, proposal_count: (c.proposal_count || 0) + 1 }
            : c
        )
      );
      setSelectedClient((prev) => (prev ? { ...prev, proposal_count: (prev.proposal_count || 0) + 1 } : null));

      toast.success("Proposal uploaded successfully");
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === "string" ? error.response.data.detail : "Failed to upload proposal");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteProposal = async () => {
    if (!deleteProposalDialog.proposal) return;

    try {
      await proposalsAPI.delete(deleteProposalDialog.proposal.proposal_id);
      setProposals(proposals.filter((p) => p.proposal_id !== deleteProposalDialog.proposal.proposal_id));
      setClients(
        clients.map((c) =>
          c.client_id === selectedClient?.client_id
            ? { ...c, proposal_count: Math.max(0, (c.proposal_count || 1) - 1) }
            : c
        )
      );
      setSelectedClient((prev) =>
        prev ? { ...prev, proposal_count: Math.max(0, (prev.proposal_count || 1) - 1) } : null
      );
      setDeleteProposalDialog({ open: false, proposal: null });
      toast.success("Proposal deleted successfully");
    } catch (error) {
      toast.error(typeof error.response?.data?.detail === "string" ? error.response.data.detail : "Failed to delete proposal");
    }
  };

  const handleCopyLink = async (proposal) => {
    try {
      await navigator.clipboard.writeText(proposal.share_url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRegenerateLink = async (proposal) => {
    try {
      const data = await proposalsAPI.regenerateLink(proposal.proposal_id);
      setProposals(
        proposals.map((p) =>
          p.proposal_id === proposal.proposal_id
            ? { ...p, share_token: data.share_token, share_url: data.share_url }
            : p
        )
      );
      toast.success("Link regenerated successfully");
    } catch {
      toast.error("Failed to regenerate link");
    }
  };

  const handleDownload = (proposal) => {
    const downloadUrl = proposalsAPI.getDownloadUrl(proposal.share_token);
    window.open(downloadUrl, "_blank");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getFileIcon = (fileType) => {
    const map = {
      PDF: <FileText className="w-5 h-5 text-red-500" />,
      PowerPoint: <Presentation className="w-5 h-5 text-orange-500" />,
      Excel: <Table2 className="w-5 h-5 text-emerald-500" />,
      Word: <File className="w-5 h-5 text-blue-500" />,
    };
    return map[fileType] || <File className="w-5 h-5 text-gray-500" />;
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPresentations = presentations.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProposals = proposals.filter((proposal) =>
    proposal.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && view !== "presentations") {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-white rounded-2xl border border-gray-100" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-40 bg-white rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="proposals-page">
      {view === "landing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
            <p className="text-sm text-gray-500 mt-1">
              Choose an entry point to browse presentations or client folders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => navigate("/proposals/presentations")}
              className="text-left"
            >
              <Card className="h-full rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <IconBadge icon={Presentation} accent={accentFromClass("bg-emerald-600")} size={44} />
                    <div>
                      <CardTitle className="text-gray-900">Presentations</CardTitle>
                      <CardDescription className="text-gray-600">
                        Browse all proposal presentations in one place.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {presentations.length > 0 ? (
                    <p className="text-sm font-semibold text-gray-900">
                      {presentations.length} presentation{presentations.length === 1 ? "" : "s"} available
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700">
                      Open the presentations board to filter by Slideshow, Scroll, New, or Premium.
                    </p>
                  )}
                </CardContent>
              </Card>
            </button>

            <button
              type="button"
              onClick={() => navigate("/proposals/clients")}
              className="text-left"
            >
              <Card className="h-full rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <IconBadge icon={FolderOpen} accent={accentFromClass("bg-blue-600")} size={44} />
                    <div>
                      <CardTitle className="text-gray-900">Clients</CardTitle>
                      <CardDescription className="text-gray-600">
                        Open client folders to manage proposals by client.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {loading ? (
                    <div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse" />
                  ) : (
                    <p className="text-sm font-semibold text-gray-900">
                      <span className="font-semibold text-gray-900">{clients.length}</span>{" "}
                      {clients.length === 1 ? "client" : "clients"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </button>
          </div>
        </div>
      )}

      {view === "presentations" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/proposals")}
                  className="rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Browse presentations by format and importance.
                  </p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Search presentations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="All" className="w-full">
            <TabsList className="bg-gray-100 p-1 rounded-xl">
              {PRESENTATION_CATEGORIES.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {PRESENTATION_CATEGORIES.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {presentationsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="h-44 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  (() => {
                    const source = (filteredPresentations.length > 0 ? filteredPresentations : FALLBACK_PRESENTATIONS);
                    const items = tab.value === "All" ? source : source.filter((p) => p.category === tab.value);
                    if (items.length === 0) {
                      return (
                        <Card className="mt-4 rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                          <CardContent>
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">📭</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No presentations here yet</h3>
                            <p className="text-sm text-gray-500">Once items are tagged as {tab.label}, they will appear here.</p>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {items.map((item) => {
                          const cardCategory = item.category || "New";
                          const cardGradient = item.gradient || accentClass(cardCategory);
                          const cardAccentText = item.accentText || textForAccent(cardCategory);
                          const cardAccentMuted = item.accentMuted || mutedForAccent(cardCategory);
                          return (
                            <div
                              key={item.id}
                              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cardGradient} transition-all hover:shadow-lg`}
                            >
                              <div className="relative p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                                    <LayoutTemplate className="w-5 h-5 text-gray-900" />
                                  </div>
                                  <span className={categoryClass(cardCategory)}>{cardCategory}</span>
                                </div>
                                <h3 className={`text-lg font-semibold mb-1 ${cardAccentText}`}>{item.title}</h3>
                                <p className={`text-sm mb-4 ${cardAccentMuted}`}>{item.description || shortDescription(cardCategory)}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{item.client || "Unassigned client"}</span>
                                  <span>{item.lastModified ? formatDate(item.lastModified) : ""}</span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <span className="text-xs font-medium px-2 py-1 rounded-full border border-gray-200 bg-white/70 text-gray-700">
                                    {item.meta || item.status || "Presentation"}
                                  </span>
                                </div>
                                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center group-hover:bg-white transition-colors">
                                  <ChevronRight className="w-4 h-4 text-gray-900" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {view === "clients" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/proposals")}
                  className="rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedClient ? selectedClient.name : "Clients"}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedClient
                      ? `${proposals.length} proposal${proposals.length !== 1 ? "s" : ""} • ${
                          selectedClient.description || "No description"
                        }`
                      : "Browse client folders and open proposals"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {view !== "landing" && selectedClient ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      placeholder="Search proposals..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:bg-white focus:border-emerald-500"
                      data-testid="search-input"
                    />
                  </div>
                ) : null}
                {view !== "landing" && selectedClient ? (
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
                ) : null}
              </div>
            </div>

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

          {selectedClient ? (
            proposalsLoading ? (
              <div className="grid grid-cols-1 gap-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-28 bg-white rounded-2xl border border-gray-100" />
                ))}
              </div>
            ) : filteredProposals.length > 0 ? (
              <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                          <h3 className="font-medium text-gray-900 truncate">{proposal.original_filename}</h3>
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
                          >
                            <Copy size={14} className="mr-1.5" />
                            Copy Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(proposal)}
                            className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50"
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
                                onClick={() => window.open(proposal.share_url, "_blank")}
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
              </Card>
            ) : (
              <Card className="rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <CardContent>
                  <IconBadge icon={File} accent="#8E8A82" size={64} />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No proposals yet</h3>
                  <p className="text-gray-500 mb-6">Upload your first proposal to share with this client</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    <Upload size={18} className="mr-2" />
                    Upload Proposal
                  </Button>
                </CardContent>
              </Card>
            )
          ) : filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <div
                  key={client.client_id}
                  className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer group shadow-sm"
                  onClick={() => handleSelectClient(client)}
                  data-testid={`client-card-${client.client_id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
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
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{client.description || "No description"}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {client.proposal_count || 0} proposal{(client.proposal_count || 0) !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatDate(client.updated_at)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <CardContent>
                <IconBadge icon={FolderOpen} accent="#8E8A82" size={64} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
                <p className="text-gray-500 mb-6">Create your first client folder to organize proposals</p>
                <Button
                  onClick={() => setCreateClientModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  <FolderPlus size={18} className="mr-2" />
                  New Client
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
