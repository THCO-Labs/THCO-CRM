// Discussion on one card.
//
// The person doing a piece of work is usually not the person who wrote the
// card, and until now they had nowhere to say "blocked on the staging key"
// that the project could see — so it was said in a chat app instead, where it
// is invisible to anybody reading the card later.
//
// Anybody on the project may comment. You may edit only your own, because
// correcting somebody else's words in place would make the thread useless as a
// record. Deleting is yours, or a board manager's tidying up.

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { tasksAPI } from "../../lib/api";
import { useUser } from "../../context/UserContext";

function timeAgo(iso) {
  if (!iso) return "";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined,
    { day: "numeric", month: "short", year: "numeric" });
}

const initials = (name) =>
  (name || "?").split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

export default function CardComments({ cardId, canEdit = true }) {
  const user = useUser();
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await tasksAPI.listComments(cardId));
    } catch {
      setItems([]);
    }
  }, [cardId]);

  useEffect(() => { load(); }, [load]);

  const post = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      const created = await tasksAPI.addComment(cardId, body);
      setItems((list) => [...(list || []), created]);
      setDraft("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not post that");
    } finally { setBusy(false); }
  };

  const saveEdit = async (comment) => {
    const body = editDraft.trim();
    if (!body) return;
    setBusy(true);
    try {
      const updated = await tasksAPI.editComment(comment.comment_id, body);
      setItems((list) => list.map((c) =>
        c.comment_id === comment.comment_id ? { ...c, ...updated } : c));
      setEditingId(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save that");
    } finally { setBusy(false); }
  };

  const remove = async (comment) => {
    if (!window.confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      await tasksAPI.deleteComment(comment.comment_id);
      setItems((list) => list.filter((c) => c.comment_id !== comment.comment_id));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not delete that");
    } finally { setBusy(false); }
  };

  // Enter posts; Shift+Enter is a new line. A comment is usually one line, and
  // reaching for the mouse for each one is what stops people writing them.
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); }
  };

  return (
    <div data-testid="card-comments">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2
                    flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        Comments{items?.length ? ` (${items.length})` : ""}
      </p>

      {items === null ? (
        <div className="py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 italic mb-2">
          No comments yet. Progress, blockers, questions — anything the next person needs.
        </p>
      ) : (
        <ul className="space-y-2.5 mb-3">
          {items.map((c) => {
            const mine = c.author_id === user?.user_id;
            return (
              <li key={c.comment_id} className="flex gap-2.5" data-testid="card-comment">
                <span className="w-6 h-6 shrink-0 rounded-full bg-[#1B4332]/10 text-[#1B4332]
                                 text-[10px] font-semibold flex items-center justify-center mt-0.5">
                  {initials(c.author_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-gray-900">{c.author_name}</span>
                    <span className="text-[11px] text-gray-400">
                      {timeAgo(c.created_at)}{c.edited_at ? " · edited" : ""}
                    </span>
                  </div>

                  {editingId === c.comment_id ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c); }}
                        className="flex-1 px-2 py-1 text-[13px] rounded border border-[#EAE7E0]
                                   bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
                      />
                      <button onClick={() => saveEdit(c)} disabled={busy}
                              className="text-[11px] text-[#1B4332] hover:underline">Save</button>
                      <button onClick={() => setEditingId(null)}
                              className="text-[11px] text-gray-400 hover:text-gray-700">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-700 whitespace-pre-wrap break-words">
                      {c.body}
                    </p>
                  )}

                  {canEdit && editingId !== c.comment_id && (
                    <div className="flex gap-3 mt-0.5">
                      {mine && (
                        <button
                          onClick={() => { setEditingId(c.comment_id); setEditDraft(c.body); }}
                          className="text-[11px] text-gray-400 hover:text-gray-700"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => remove(c)}
                        disabled={busy}
                        title="Delete this comment"
                        className="text-[11px] text-gray-400 hover:text-red-600 inline-flex items-center gap-1"
                        data-testid={`delete-comment-${c.comment_id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add a comment…"
            data-testid="card-comment-input"
            className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <button
            type="button"
            onClick={post}
            disabled={busy || !draft.trim()}
            data-testid="card-comment-post"
            className="px-3 rounded-lg bg-[#1B4332] text-white hover:bg-[#14342A]
                       disabled:opacity-40 flex items-center"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
