import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Upload, Trash2, Loader2, FileText, ImageIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { tasksAPI } from "../../lib/api";

/**
 * The files attached to one task.
 *
 * As many as the work needs -- there is no cap on how many a card may carry.
 * Each file is uploaded on its own request, so selecting twenty and having one
 * of them rejected still leaves the other nineteen attached; sending them as a
 * single request would lose the lot to one bad file.
 *
 * Images are fetched as blobs rather than linked to. This client sends its
 * session as a Bearer header, which an <img src> does not carry, so a direct
 * URL would arrive unauthenticated.
 */
export default function CardAttachments({ cardId, canEdit = true }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);          // uploads still in flight
  const [previews, setPreviews] = useState({}); // attachment_id -> blob url
  const fileRef = useRef(null);
  const madeUrls = useRef([]);

  const load = useCallback(async () => {
    try {
      setItems(await tasksAPI.listCardAttachments(cardId));
    } catch {
      toast.error("Could not load attachments");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => { load(); }, [load]);

  // Thumbnails for the images among them.
  useEffect(() => {
    let live = true;
    (async () => {
      for (const a of items) {
        if (!(a.content_type || "").startsWith("image/")) continue;
        if (previews[a.attachment_id]) continue;
        try {
          const url = await tasksAPI.openCardAttachment(a.attachment_id);
          if (!live) { URL.revokeObjectURL(url); return; }
          madeUrls.current.push(url);
          setPreviews((p) => ({ ...p, [a.attachment_id]: url }));
        } catch { /* a thumbnail is a nicety; the row still works without it */ }
      }
    })();
    return () => { live = false; };
  }, [items, previews]);

  // Blob URLs are held by the browser until told otherwise.
  useEffect(() => () => {
    madeUrls.current.forEach((u) => URL.revokeObjectURL(u));
    madeUrls.current = [];
  }, []);

  const upload = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setBusy(files.length);
    let ok = 0;
    // Sequentially: a burst of large parallel uploads is what makes the server
    // time out, and the count is unbounded by design.
    for (const f of files) {
      try {
        await tasksAPI.uploadCardAttachment(cardId, f);
        ok += 1;
      } catch (e) {
        toast.error(e.response?.data?.detail || `Could not attach ${f.name}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (ok) toast.success(ok === 1 ? "Attached" : `${ok} files attached`);
    load();
  };

  const remove = async (a) => {
    try {
      await tasksAPI.deleteCardAttachment(a.attachment_id);
      setItems((prev) => prev.filter((x) => x.attachment_id !== a.attachment_id));
      toast.success("Attachment removed");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not remove it");
    }
  };

  const open = async (a) => {
    try {
      const url = previews[a.attachment_id] || (await tasksAPI.openCardAttachment(a.attachment_id));
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open that file");
    }
  };

  return (
    <div
      onDragOver={canEdit ? (e) => e.preventDefault() : undefined}
      onDrop={canEdit ? (e) => { e.preventDefault(); upload(e.dataTransfer.files); } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Paperclip className="w-4 h-4 text-gray-400" />
          Attachments
          {items.length > 0 && <span className="text-gray-400">({items.length})</span>}
        </h4>
        {canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { upload(e.target.files); e.target.value = ""; }}
              data-testid="attachment-input"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy > 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-[#EAE7E0] text-gray-700 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors disabled:opacity-50"
              data-testid="attachment-add"
            >
              {busy > 0
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{busy} uploading…</>
                : <><Upload className="w-3.5 h-3.5" />Add files</>}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">
          {canEdit ? "No files yet — add as many as you need, or drop them here." : "No files."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => {
            const isImage = (a.content_type || "").startsWith("image/");
            const thumb = previews[a.attachment_id];
            return (
              <li
                key={a.attachment_id}
                className="group/att flex items-center gap-2.5 p-1.5 rounded-lg border border-transparent hover:border-[#EAE7E0] hover:bg-[#F7F6F3] transition-colors"
                data-testid={`attachment-${a.attachment_id}`}
              >
                <button
                  type="button"
                  onClick={() => open(a)}
                  className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-[#F7F6F3] border border-[#EAE7E0] flex items-center justify-center"
                  title={`Open ${a.filename}`}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : isImage ? (
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => open(a)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-[13px] text-gray-900 truncate">{a.filename}</span>
                  <span className="block text-[11px] text-gray-400">
                    {formatSize(a.size)}
                    {a.uploaded_by_name ? ` · ${a.uploaded_by_name}` : ""}
                  </span>
                </button>

                <a
                  href={thumb || undefined}
                  onClick={(e) => { e.preventDefault(); open(a); }}
                  className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 opacity-0 group-hover/att:opacity-100 transition-opacity"
                  title="Open"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-600 opacity-0 group-hover/att:opacity-100 transition-opacity"
                    title="Remove"
                    data-testid={`attachment-remove-${a.attachment_id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
