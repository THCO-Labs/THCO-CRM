import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { tasksAPI } from "../../lib/api";

/**
 * Choose the picture a task shows on the board.
 *
 * The pool holds as many images as anyone uploads. An image belongs to one
 * task at a time: once a task takes it, it stops appearing for every other
 * task, and putting it back makes it available again.
 *
 * Two people can open this on different tasks at the same moment and see the
 * same free image. The server settles that with a unique index rather than a
 * check, so the second claim comes back 409 and is reported as somebody having
 * got there first -- not as a failure to try again blindly.
 */
export default function ThumbnailPicker({
  cardId,
  ownerId,
  currentThumbnailId,
  onChange,
  canEdit = true,
  // On a create form there is nothing to claim against yet: the choice is
  // remembered and claimed once the thing being created exists.
  deferClaim = false,
}) {
  const owner = ownerId || cardId;
  const [pool, setPool] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const made = useRef([]);

  const load = useCallback(async () => {
    try {
      setPool(await tasksAPI.listThumbnails(owner));
    } catch {
      toast.error("Could not load the picture library");
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let live = true;
    (async () => {
      for (const t of pool) {
        if (urls[t.thumbnail_id]) continue;
        try {
          const url = await tasksAPI.openThumbnail(t.thumbnail_id);
          if (!live) { URL.revokeObjectURL(url); return; }
          made.current.push(url);
          setUrls((u) => ({ ...u, [t.thumbnail_id]: url }));
        } catch { /* one missing preview should not stop the rest */ }
      }
    })();
    return () => { live = false; };
  }, [pool, urls]);

  useEffect(() => () => {
    made.current.forEach((u) => URL.revokeObjectURL(u));
    made.current = [];
  }, []);

  const upload = async (files) => {
    const list = [...files];
    if (!list.length) return;
    setBusy(true);
    let ok = 0;
    for (const f of list) {
      try { await tasksAPI.uploadThumbnail(f); ok += 1; }
      catch (e) { toast.error(e.response?.data?.detail || `Could not add ${f.name}`); }
    }
    setBusy(false);
    if (ok) toast.success(ok === 1 ? "Picture added" : `${ok} pictures added`);
    load();
  };

  const choose = async (t) => {
    if (!canEdit) return;

    // Nothing to claim against yet -- just remember it.
    if (deferClaim) {
      onChange?.(t.thumbnail_id === currentThumbnailId ? null : t.thumbnail_id);
      return;
    }

    setBusy(true);
    try {
      if (t.thumbnail_id === currentThumbnailId) {
        await tasksAPI.releaseThumbnail(owner);
        onChange?.(null);
        toast.success("Picture removed");
      } else {
        await tasksAPI.claimThumbnail(owner, t.thumbnail_id);
        onChange?.(t.thumbnail_id);
        toast.success("Picture set");
      }
      load();
    } catch (e) {
      // 409 is the expected outcome of two people choosing at once.
      toast.error(e.response?.data?.detail || "Could not set that picture");
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-gray-400">
          Each picture belongs to one task. Choosing one takes it out of the library.
        </p>
        {canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { upload(e.target.files); e.target.value = ""; }}
              data-testid="thumbnail-input"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-[#EAE7E0] text-gray-700 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors disabled:opacity-50"
              data-testid="thumbnail-add"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              Add pictures
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-3">Loading…</p>
      ) : pool.length === 0 ? (
        <p className="text-xs text-gray-400 py-3">
          The library is empty — every picture is already in use, or none has been added yet.
        </p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#D8D4CC_transparent]">
          {pool.map((t) => {
            const chosen = t.thumbnail_id === currentThumbnailId;
            return (
              <button
                key={t.thumbnail_id}
                type="button"
                onClick={() => choose(t)}
                disabled={!canEdit || busy}
                title={chosen ? "Remove this picture" : t.filename}
                data-testid={`thumbnail-${t.thumbnail_id}`}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 disabled:opacity-60
                  ${chosen
                    ? "border-[#1B4332] ring-2 ring-[#1B4332]/20"
                    : "border-[#EAE7E0] hover:border-[#C6A15B] hover:-translate-y-0.5 hover:shadow-md"}`}
              >
                {urls[t.thumbnail_id] ? (
                  <img src={urls[t.thumbnail_id]} alt={t.filename} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full bg-[#F7F6F3] block" />
                )}
                {chosen && (
                  <span className="absolute inset-0 bg-[#1B4332]/35 flex items-center justify-center">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[#1B4332]" strokeWidth={3} />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
