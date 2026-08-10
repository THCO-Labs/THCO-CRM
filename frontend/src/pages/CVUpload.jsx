import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, File, X, Check, AlertCircle, ArrowLeft, HardDrive, FolderOpen, RefreshCw, FileText, Loader2, Download } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { talentAPI } from "../lib/api";
import { toast } from "sonner";

const CVUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveImporting, setDriveImporting] = useState(false);
  const [driveResults, setDriveResults] = useState(null);
  const fileInputRef = useRef();

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }
    setUploading(true);
    setResults(null);
    try {
      const data = await talentAPI.uploadBulkCV(files);
      setResults(data);
      const created = data.results.filter(r => r.status === "created").length;
      const updated = data.results.filter(r => r.status === "updated").length;
      const rejected = data.results.filter(r => r.status === "rejected").length;
      const flagged = data.results.filter(r => r.review_queued).length;

      // Rejected files were previously invisible in this summary, so a CV
      // that could not be read looked the same as one that imported.
      let summary = `${created} new, ${updated} updated`;
      if (rejected) summary += `, ${rejected} unreadable`;
      summary += ` from ${data.total} file${data.total === 1 ? "" : "s"}`;
      if (rejected) toast.warning(summary); else toast.success(summary);
      if (flagged) toast.info(`${flagged} possible duplicate${flagged === 1 ? "" : "s"} queued for review`);
      setFiles([]);
    } catch (err) {
      toast.error("Upload failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleListDriveFiles = async () => {
    setDriveLoading(true);
    setDriveFiles([]);
    try {
      const params = {};
      if (driveFolderId) params.folder_id = driveFolderId;
      const data = await talentAPI.listDriveFiles(params);
      setDriveFiles(data.files || []);
      if (data.files?.length === 0) {
        toast.info("No CV files found in the specified folder");
      }
    } catch (err) {
      toast.error("Failed to list Drive files: " + (err.response?.data?.detail || err.message));
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveImport = async () => {
    setDriveImporting(true);
    setDriveResults(null);
    try {
      const data = await talentAPI.importFromDrive({
        folder_id: driveFolderId || undefined,
      });
      setDriveResults(data);
      const created = data.results.filter(r => r.status === "created").length;
      const updated = data.results.filter(r => r.status === "updated").length;
      const failed = data.results.filter(r => r.status === "failed").length;
      toast.success(`Imported: ${created} new, ${updated} updated, ${failed} failed`);
    } catch (err) {
      toast.error("Drive import failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setDriveImporting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6" data-testid="cv-upload-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/talent" className="text-gray-500 hover:text-gray-900">Talent</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/talent/candidates" className="text-gray-500 hover:text-gray-900">Candidates</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-medium">Upload CVs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload CVs</h1>
          <p className="text-gray-500 mt-1">Upload resumes to build your internal talent database</p>
        </div>
        <Link to="/talent/candidates">
          <Button variant="outline" data-testid="back-to-database-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Database
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "upload" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload className="w-4 h-4" />
          Direct Upload
        </button>
        <button
          onClick={() => setActiveTab("drive")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "drive" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Google Drive
        </button>
      </div>

      {activeTab === "upload" ? (
        <>
          {/* Upload Zone */}
          <div
            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#1FB58A] transition-colors p-12 text-center cursor-pointer"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            data-testid="cv-drop-zone"
          >
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Drag & drop CV files here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse. Supports PDF, DOCX, TXT</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="cv-file-input"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{files.length} file{files.length !== 1 ? 's' : ''} selected</h3>
                <Button onClick={handleUpload} disabled={uploading} data-testid="upload-files-btn">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Parse All
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[400px]">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Upload Results</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {r.status === "created" ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : r.status === "updated" ? (
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.name || r.candidate_id}</p>
                        {/* An update now says what the newer CV actually added,
                            rather than only that something happened. */}
                        <p className="text-xs text-gray-500">
                          {r.status === "updated" && r.changes?.length > 0
                            ? `updated · ${r.changes.join(", ")}`
                            : r.status === "updated"
                            ? `updated · no new details`
                            : r.status === "rejected"
                            ? r.reason || "could not be read"
                            : r.status}
                          {r.version > 1 && ` · resume v${r.version}`}
                        </p>
                      </div>
                    </div>
                    {r.review_queued && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        possible duplicate
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      ) : (
        <>
          {/* Google Drive Tab */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-6">
              <HardDrive className="w-8 h-8 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">
                  Enter your Google Drive folder ID containing CV files. The service account must have read access.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Google Drive folder ID (from folder URL)"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    className="h-10 flex-1"
                    data-testid="drive-folder-id-input"
                  />
                  <Button onClick={handleListDriveFiles} disabled={driveLoading} data-testid="list-drive-btn">
                    {driveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4 mr-2" />}
                    {driveLoading ? "Loading..." : "List Files"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Drive Files */}
            {driveFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{driveFiles.length} CV files found</p>
                  <Button onClick={handleDriveImport} disabled={driveImporting} data-testid="import-drive-btn">
                    {driveImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Import All
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {driveFiles.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{f.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatFileSize(f.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drive Results */}
            {driveResults && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-4 border-t border-gray-100"
              >
                <h3 className="font-semibold text-gray-900 mb-3">Import Results ({driveResults.total} files)</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {driveResults.results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {r.status === "created" ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : r.status === "updated" ? (
                          <RefreshCw className="w-4 h-4 text-blue-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-900">{r.candidate_id || r.file_id}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === "created" ? "bg-emerald-100 text-emerald-700" :
                        r.status === "updated" ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CVUpload;
