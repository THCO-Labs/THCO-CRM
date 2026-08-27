// Files hanging off something small — a piece of client feedback, a milestone.
//
// Deliberately not the Documents drawer. A screenshot the client marked up
// belongs *with* the comment it arrived with, and a signed deliverable belongs
// *with* the milestone it satisfies; putting both in the general document pile
// is how somebody later ends up asking which comment the screenshot went with.
//
// One row, inline, no modal: it sits inside a list of feedback items or
// milestones, and anything heavier would compete with the thing it belongs to.

import { useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import FileLink from "./FileLink";

export default function AttachmentStrip({
  attachments = [],
  onUpload,          // async (file) => attachment
  onRemove,          // async (attachmentId) => void   — omit to hide removal
  label = "Attach a file",
  disabled = false,
  testId = "attachments",
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const upload = async (files) => {
    const list = [...files];
    if (!list.length) return;
    setBusy(true);
    for (const file of list) {
      try {
        await onUpload(file);
      } catch (e) {
        toast.error(e.response?.data?.detail || `Could not attach ${file.name}`);
      }
    }
    setBusy(false);
    toast.success(list.length === 1 ? "Attached" : `${list.length} files attached`);
  };

  const remove = async (attachment) => {
    if (!window.confirm(`Remove "${attachment.filename}"?`)) return;
    setBusy(true);
    try {
      await onRemove(attachment.attachment_id);
      toast.success("Removed");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not remove it");
    } finally { setBusy(false); }
  };

  return (
    <div data-testid={testId}>
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-1.5">
          {attachments.map((a) => (
            <li key={a.attachment_id}
                className="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full
                           border border-[#EAE7E0] bg-[#F7F6F3] text-[11px] max-w-full">
              <Paperclip className="w-2.5 h-2.5 text-gray-400 shrink-0" />
              {/* `fileUrl` and `name`, not children -- FileLink fetches the
                  bytes with the session attached rather than rendering an
                  anchor, so it takes the path and the label as props. */}
              <FileLink fileUrl={a.file_url} name={a.filename} className="min-w-0" />
              {onRemove && !disabled && (
                <button
                  type="button"
                  onClick={() => remove(a)}
                  disabled={busy}
                  title="Remove this file"
                  className="text-gray-300 hover:text-red-600 shrink-0"
                  data-testid={`${testId}-remove-${a.attachment_id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { upload(e.target.files); e.target.value = ""; }}
            data-testid={`${testId}-input`}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] text-[#1B4332] hover:underline
                       disabled:opacity-50"
            data-testid={`${testId}-add`}
          >
            {busy
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Paperclip className="w-3 h-3" />}
            {label}
          </button>
        </>
      )}
    </div>
  );
}
