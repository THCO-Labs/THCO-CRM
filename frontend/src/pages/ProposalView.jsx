import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { AlertCircle, Mail, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { proposalsAPI } from "../lib/api";
import apiClient from "../lib/api";

// Use the worker bundled by react-pdf via CDN — matches installed pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ProposalView = () => {
  const { shareToken } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Email gate state
  const [emailUnlocked, setEmailUnlocked] = useState(false);
  const [viewerEmail, setViewerEmail] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [viewerCompany, setViewerCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [isInternal, setIsInternal] = useState(false);

  // PDF state
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const data = await proposalsAPI.getShared(shareToken);
        setProposal(data);
        setIsInternal(!!data.is_internal_viewer);
        const cached = localStorage.getItem(`proposal_viewer_${shareToken}`);
        if (data.is_internal_viewer || !data.require_email || cached) {
          setEmailUnlocked(true);
          if (cached) setViewerEmail(cached);
        }
      } catch (err) {
        setError("This proposal link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };

    if (shareToken) fetchProposal();
  }, [shareToken]);

  // Fetch PDF as blob once the viewer is unlocked (internal user OR email-gate passed)
  useEffect(() => {
    if (!emailUnlocked || !proposal || proposal.file_type !== "PDF") return;
    let cancelled = false;
    setPdfLoading(true);
    (async () => {
      try {
        let blob;
        if (isInternal) {
          // Authenticated stream
          const resp = await apiClient.get(`/proposals/shared/${shareToken}/stream`, { responseType: "blob" });
          blob = new Blob([resp.data], { type: "application/pdf" });
        } else {
          // Public stream with ?email=
          const url = `${process.env.REACT_APP_BACKEND_URL}/api/proposals/shared/${shareToken}/stream?email=${encodeURIComponent(viewerEmail)}`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          blob = await resp.blob();
        }
        if (cancelled) return;
        setPdfBlob(blob);
      } catch (e) {
        if (!cancelled) setError("Failed to load presentation.");
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emailUnlocked, isInternal, proposal, shareToken, viewerEmail]);

  // Responsive page sizing
  const measureWidth = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      // Cap max width on large desktops; otherwise fit container with side padding
      setPageWidth(Math.min(w - 24, 1100));
    }
  }, []);

  useEffect(() => {
    measureWidth();
    window.addEventListener("resize", measureWidth);
    return () => window.removeEventListener("resize", measureWidth);
  }, [measureWidth]);

  const submitEmailGate = async (e) => {
    e.preventDefault();
    setGateError(null);
    if (!viewerEmail || !viewerEmail.includes("@")) {
      setGateError("Please enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/proposals/shared/${shareToken}/register`, {
        email: viewerEmail.trim().toLowerCase(),
        name: viewerName.trim(),
        company: viewerCompany.trim(),
      });
      localStorage.setItem(`proposal_viewer_${shareToken}`, viewerEmail.trim().toLowerCase());
      setEmailUnlocked(true);
    } catch (err) {
      setGateError(err.response?.data?.detail || "Could not register your email — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
    // Re-measure after document loads (in case container resized)
    setTimeout(measureWidth, 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center p-4">
        <div className="bg-[#1a1f36] rounded-2xl border border-white/10 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link Not Found</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Email gate (public viewers only — internal viewers skip this)
  if (!emailUnlocked) {
    return (
      <div className="min-h-screen bg-[#0f1219] flex items-center justify-center p-4" data-testid="proposal-view-page">
        <div className="bg-[#1a1f36] rounded-2xl border border-white/10 p-8 max-w-lg w-full">
          <div className="flex justify-center mb-8">
            <img
              src="https://customer-assets.emergentagent.com/job_internal-thco/artifacts/bvr2l293_THCO%20Logo_Navy%20soft%20purple.png"
              alt="THCO"
              className="h-10 brightness-0 invert"
            />
          </div>

          <div className="text-center mb-6">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
              {proposal.client_name}
            </span>
            <h2 className="text-lg font-semibold text-white mt-4 break-all">{proposal.filename}</h2>
          </div>

          <form onSubmit={submitEmailGate} className="space-y-3" data-testid="email-gate-form">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-start gap-2 mb-2">
              <Lock className="w-4 h-4 text-emerald-300 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-200">Enter your details to view this document.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-300 uppercase tracking-wider">Email *</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={viewerEmail}
                  onChange={(e) => setViewerEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-3 py-3 bg-[#0f1219] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  data-testid="viewer-email-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={viewerName}
                onChange={(e) => setViewerName(e.target.value)}
                placeholder="Name (optional)"
                className="px-3 py-2.5 bg-[#0f1219] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                data-testid="viewer-name-input"
              />
              <input
                type="text"
                value={viewerCompany}
                onChange={(e) => setViewerCompany(e.target.value)}
                placeholder="Company (optional)"
                className="px-3 py-2.5 bg-[#0f1219] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                data-testid="viewer-company-input"
              />
            </div>
            {gateError && (
              <p className="text-xs text-red-400 text-center" data-testid="email-gate-error">{gateError}</p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base"
              data-testid="email-gate-submit"
            >
              {submitting ? "Verifying..." : "Continue to Document"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-6">Powered by THCO Group</p>
        </div>
      </div>
    );
  }

  // Inline PDF viewer (internal users and post-gate external users — no download UI)
  return (
    <div className="min-h-screen bg-[#0f1219] flex flex-col" data-testid="proposal-inline-viewer">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-[#1a1f36] border-b border-white/10">
        <img
          src="https://customer-assets.emergentagent.com/job_internal-thco/artifacts/bvr2l293_THCO%20Logo_Navy%20soft%20purple.png"
          alt="THCO"
          className="h-6 sm:h-7 brightness-0 invert flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-emerald-400 truncate">{proposal.client_name}</p>
          <h2 className="text-xs sm:text-sm font-semibold text-white truncate">{proposal.filename}</h2>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#1a1a1a] py-3 px-2 sm:px-4"
        data-testid="pdf-scroll-container"
      >
        {pdfLoading || !pdfBlob ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-400">Loading presentation...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3" data-testid="pdf-pages">
            <Document
              file={pdfBlob}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm text-gray-400">Rendering...</p>
                </div>
              }
              error={
                <div className="text-center py-12 text-red-400">
                  <p>Could not render PDF.</p>
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={`page_${i + 1}`} className="shadow-lg shadow-black/40 mb-1">
                  <Page
                    pageNumber={i + 1}
                    width={pageWidth || undefined}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </div>
              ))}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalView;
