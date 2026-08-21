// Opening and previewing a file that lives behind an authenticated endpoint.
//
// A plain <a href> cannot reach one. This client carries its session as a
// Bearer header from localStorage, and a browser navigation sends neither that
// header nor a cookie, so the request arrives unauthenticated. In development
// it fails more confusingly still: the relative URL hits the dev server on
// :3000, finds no such route, and falls through to the single-page app, so
// clicking a document lands on the dashboard with no error anywhere.
//
// So the bytes are fetched with the session attached and handed to the browser
// as a blob URL. The same reasoning already governs CVs, task attachments and
// thumbnails elsewhere in this app.

import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { deliveryAPI } from "@/lib/api";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
const PDF_EXTENSIONS = [".pdf"];

function extensionOf(name = "") {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isPreviewable(name) {
  const ext = extensionOf(name);
  return IMAGE_EXTENSIONS.includes(ext) || PDF_EXTENSIONS.includes(ext);
}

/**
 * A file's name, with a preview and a download beside it.
 *
 * `name` is what the reader sees; `fileUrl` is the API path the bytes live at.
 */
export default function FileLink({ fileUrl, name, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  // Every blob URL handed out is held so it can be revoked. Without this they
  // accumulate for the life of the tab, which on a project with many uploads
  // is a slow leak rather than a visible bug.
  const issued = useRef([]);

  useEffect(() => () => {
    issued.current.forEach((url) => URL.revokeObjectURL(url));
    issued.current = [];
  }, []);

  const fetchBlob = async () => {
    const url = await deliveryAPI.openFile(fileUrl);
    issued.current.push(url);
    return url;
  };

  const preview = async () => {
    if (previewUrl) { setPreviewUrl(null); return; }
    setBusy(true);
    try {
      setPreviewUrl(await fetchBlob());
    } catch (e) {
      toast.error("Could not open that file");
    } finally { setBusy(false); }
  };

  const download = async () => {
    setBusy(true);
    try {
      const url = await fetchBlob();
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error("Could not download that file");
    } finally { setBusy(false); }
  };

  const ext = extensionOf(name);
  const canPreview = isPreviewable(name);
  const isPdf = PDF_EXTENSIONS.includes(ext);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-900 flex-1 truncate" title={name}>{name}</span>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        {canPreview && (
          <button
            type="button"
            onClick={preview}
            data-testid="file-preview"
            title={previewUrl ? "Hide preview" : "Preview"}
            className="text-gray-400 hover:text-[#1B4332]"
          >
            {previewUrl ? <X className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={download}
          data-testid="file-download"
          title="Download"
          className="text-gray-400 hover:text-[#1B4332]"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {previewUrl && (
        <div className="mt-2 rounded-lg border border-[#EAE7E0] overflow-hidden bg-[#F7F6F3]">
          {isPdf ? (
            <iframe
              src={previewUrl}
              title={name}
              className="w-full h-[420px] border-0"
            />
          ) : (
            <img src={previewUrl} alt={name} className="w-full h-auto max-h-[420px] object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
