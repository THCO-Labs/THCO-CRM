import { useState, useEffect } from "react";
import { toast } from "sonner";
import { flowAPI, deliveryAPI } from "../../lib/api";
import { Button } from "../ui/button";
import { useUser, canManageUsers } from "../../context/UserContext";
import ThumbnailPicker from "../tasks/ThumbnailPicker";

/**
 * Opening a project: the fields, the rules about who may open one and under
 * which unit, and the save.
 *
 * Lives here rather than on the Flow page because the dashboard offers the
 * same action and has to be able to do it without sending anybody to Flow.
 * One implementation, deliberately: a second copy of this form would drift
 * from the first, and the rules it enforces -- a manager may only open work
 * under a unit they run -- are not rules to have two versions of.
 *
 * The caller decides what happens next. The Flow page opens the new project;
 * the dashboard dialog closes and stays put, which is the point of being
 * there.
 */
export default function NewProjectForm({ onCreated, onCancel, compact = false }) {
  const user = useUser();
  const isAdmin = canManageUsers(user);

  const [form, setForm] = useState({
    name: "",
    client_name: "",
    website: "",
    description: "",
    project_type: "new_client",
    source: "",
    notes: "",
    thumbnail_id: null,
    // The intake form is the formal entry point to the lifecycle, so what the
    // commercial side already knows is captured here rather than chased later.
    desired_outcome: "",
    original_brief: "",
    transcripts: [],
    // Naming the TSD here settles stage 2 on the spot.
    tsd_id: "",
    // And the architect, when the Senior Partner already knows.
    architect_id: "",
  });
  // Files that arrived with the brief. Attached after the project exists,
  // because an upload needs something to belong to.
  const [files, setFiles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [architects, setArchitects] = useState([]);
  // Conversations that have already happened. The source and date matter:
  // "what did the client actually say" is unanswerable without knowing which
  // call it was said on.
  const [transcript, setTranscript] = useState({ source_label: "", source_date: "", content: "" });
  // Held as raw files rather than read client-side, since PDF/DOCX text
  // extraction is a server job (`cv_parser.extract_text`) -- uploaded once
  // the project exists, same as the brief documents above.
  const [transcriptFiles, setTranscriptFiles] = useState([]);
  const [transcriptTab, setTranscriptTab] = useState("paste");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // `users-by-function` rather than the raw staff list: it returns the
        // people who hold the TSD role first, flagged, then everybody else
        // active. Filtering the raw list by `function_role === "tsd"` -- which
        // this did -- produced an empty dropdown, because no account has yet
        // been granted a function role. An empty picker is not a safeguard,
        // it is a dead end with no explanation.
        setStaff(await flowAPI.usersByFunction("tsd"));
      } catch { /* the selector simply stays empty */ }
      try {
        // Engineers carrying `can_architect`. Genuinely empty is a real
        // state here, and the field says so rather than pretending.
        setArchitects(await flowAPI.architectCandidates());
      } catch { /* the selector simply stays empty */ }
    })();
  }, []);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Project name required"); return; }
    if (!form.client_name.trim()) { toast.error("Client name required"); return; }
    setSubmitting(true);
    try {
      const created = await flowAPI.createProject(form);

      // Attached after the project exists, because an upload needs something
      // to belong to. A file that fails to attach does not undo the project:
      // the work of describing it is worth more than one document, and the
      // person is told which one did not make it.
      for (const file of files) {
        try {
          await deliveryAPI.uploadDocument(created.id, file, file.name, "brief");
        } catch {
          toast.error(`${file.name} could not be attached. Add it from the project.`);
        }
      }
      for (const t of transcriptFiles) {
        try {
          await deliveryAPI.uploadTranscript(created.id, t.file, t.source_label, t.source_date);
        } catch {
          toast.error(`${t.file.name} could not be attached. Add it from the project.`);
        }
      }
      toast.success(`Project created — ${created.project_id_display}`);
      // The picture is claimed on save, so it can be taken in between.
      if (form.thumbnail_id && created.thumbnail_unavailable) {
        toast.warning("Someone used that picture first — the project was created without one.");
      }
      onCreated?.(created);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create project");
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-4" : "space-y-5"} data-testid="new-project-form">
      <Field label="Project Name" required>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} data-testid="np-name" placeholder="e.g. Acme Q2 Platform Build" />
      </Field>

      <Field label="Client Name" required>
        <input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={inputCls} data-testid="np-client" placeholder="Free text — type the client" />
      </Field>

      {/* The project's picture. Chosen here and claimed when the project is
          saved -- there is nothing for it to belong to until then. */}
      <Field label="Project Picture (optional)">
        <ThumbnailPicker
          deferClaim
          currentThumbnailId={form.thumbnail_id}
          onChange={(id) => set("thumbnail_id", id)}
        />
      </Field>

      {/* The single "who" that matters at intake: the TSD who will own and
          run the project. Naming them here settles stage 2 on the spot;
          left blank, the project waits at stage 2 for one to be assigned.
          Collaborators are added later, once there's a project to add them
          to -- a second "who's working on this" picker at creation time
          only asked the same question twice. */}
      <Field label="Select TSD (optional)">
        <select
          value={form.tsd_id}
          onChange={(e) => set("tsd_id", e.target.value)}
          className={inputCls}
          data-testid="np-tsd"
        >
          <option value="">— decide later —</option>
          {staff.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.name}
              {s.holds_function ? "" : " (not a TSD)"}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {form.tsd_id
            ? "The project opens at stage 3, already assigned."
            : "Left blank, the project waits at stage 2 for a TSD."}
        </p>
      </Field>

      {/* Naming the architect is the Senior Partner's, wherever it happens, so
          this only appears for them. When it is already decided -- an expansion
          for a client somebody already architects -- there is no reason to make
          the project travel to stage 6 to record it. */}
      {isAdmin && (
        <Field label="Select Solution Architect (optional)">
          <select
            value={form.architect_id}
            onChange={(e) => set("architect_id", e.target.value)}
            className={inputCls}
            data-testid="np-architect"
          >
            <option value="">— decide at stage 6 —</option>
            {architects.map((a) => (
              <option key={a.user_id} value={a.user_id}>{a.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {architects.length === 0
              ? "Nobody is marked as able to architect yet — an administrator grants that on an engineer's account."
              : form.architect_id
                ? "They are told straight away, and added to the pod."
                : "Only the Senior Partner and administrators can name one."}
          </p>
        </Field>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Project Type">
          <select value={form.project_type} onChange={(e) => set("project_type", e.target.value)} className={inputCls} data-testid="np-type">
            <option value="new_client">New Client Project</option>
            <option value="existing_expansion">Existing Client Expansion</option>
          </select>
        </Field>
        <Field label="Source (who brought it in)">
          <input value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls} data-testid="np-source" placeholder="Network, Outbound, Referral..." />
        </Field>
      </div>

      <Field label="Company Website (optional)">
        <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls} placeholder="https://example.com" data-testid="np-website" />
      </Field>

      <Field label="Description (optional, 500 chars)">
        <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value.slice(0, 500))} className={inputCls + " resize-none"} data-testid="np-description" />
        <p className="text-xs text-gray-400 mt-1">{form.description.length}/500</p>
      </Field>

      <Field label="Initial Notes (optional)">
        <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls + " resize-none"} data-testid="np-notes" placeholder="Initial intake notes, what we know..." />
      </Field>

      {/* What the client actually asked for. This is a gate condition on
          stage 1, so a project cannot leave intake without it. */}
      <Field label="Desired outcome" required>
        <textarea
          rows={2}
          value={form.desired_outcome}
          onChange={(e) => set("desired_outcome", e.target.value)}
          className={inputCls + " resize-none"}
          data-testid="np-outcome"
          placeholder="A proposal, a further meeting, a build..."
        />
        <p className="text-xs text-gray-400 mt-1">
          What did they ask us for? Stage 1 will not close without it.
        </p>
      </Field>

      <Field label="The brief as received (optional)">
        <textarea
          rows={4}
          value={form.original_brief}
          onChange={(e) => set("original_brief", e.target.value)}
          className={inputCls + " resize-none"}
          data-testid="np-brief"
          placeholder="Paste what they sent, in their words."
        />
      </Field>

      {/* Transcripts are stored as documents on the project, so that whoever
          picks it up later reads the source rather than a summary of it. */}
      <Field label="Document flow — what the client has sent or said (optional)">
        {(form.transcripts.length > 0 || transcriptFiles.length > 0) && (
          <ul className="mb-2 space-y-1">
            {form.transcripts.map((t, i) => (
              <li key={`p${i}`} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[#F7F6F3] border border-[#EAE7E0]">
                <span className="text-gray-800">
                  {t.source_label}
                  {t.source_date && <span className="text-gray-500"> · {t.source_date}</span>}
                  <span className="text-gray-400"> · {t.content.length} characters</span>
                </span>
                <button
                  type="button"
                  onClick={() => set("transcripts", form.transcripts.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-600 text-xs"
                >
                  remove
                </button>
              </li>
            ))}
            {transcriptFiles.map((t, i) => (
              <li key={`f${i}`} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[#F7F6F3] border border-[#EAE7E0]">
                <span className="text-gray-800">
                  {t.source_label}
                  {t.source_date && <span className="text-gray-500"> · {t.source_date}</span>}
                  <span className="text-gray-400"> · {t.file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTranscriptFiles(transcriptFiles.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-600 text-xs"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 p-3 rounded-lg border border-[#EAE7E0] bg-white">
          <div className="flex gap-2">
            <input
              value={transcript.source_label}
              onChange={(e) => setTranscript({ ...transcript, source_label: e.target.value })}
              className={inputCls}
              data-testid="np-transcript-label"
              placeholder="Where it came from, e.g. Initial call"
            />
            <input
              type="date"
              value={transcript.source_date}
              onChange={(e) => setTranscript({ ...transcript, source_date: e.target.value })}
              className={inputCls}
              data-testid="np-transcript-date"
            />
          </div>

          <div className="flex gap-1">
            <button type="button" onClick={() => setTranscriptTab("paste")}
                    className={`text-xs px-2 py-1 rounded ${transcriptTab === "paste" ? "bg-gray-200 text-gray-900" : "text-gray-500"}`}>
              Paste text
            </button>
            <button type="button" onClick={() => setTranscriptTab("file")}
                    className={`text-xs px-2 py-1 rounded ${transcriptTab === "file" ? "bg-gray-200 text-gray-900" : "text-gray-500"}`}>
              Upload a file
            </button>
          </div>

          {transcriptTab === "paste" ? (
            <>
              <textarea
                rows={3}
                value={transcript.content}
                onChange={(e) => setTranscript({ ...transcript, content: e.target.value })}
                className={inputCls + " resize-none"}
                data-testid="np-transcript-content"
                placeholder="Paste a call transcript, an email, meeting notes — anything the client sent or said."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!transcript.source_label.trim() || !transcript.content.trim()}
                data-testid="np-transcript-add"
                onClick={() => {
                  set("transcripts", [...form.transcripts, { ...transcript }]);
                  setTranscript({ source_label: "", source_date: "", content: "" });
                }}
              >
                Add this conversation
              </Button>
            </>
          ) : (
            <>
              <input
                type="file"
                accept=".txt,.md,.pdf,.docx,.doc"
                data-testid="np-transcript-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!transcript.source_label.trim()) {
                    toast.error("Say where this conversation came from first"); e.target.value = ""; return;
                  }
                  setTranscriptFiles([...transcriptFiles, { file, source_label: transcript.source_label, source_date: transcript.source_date }]);
                  setTranscript({ source_label: "", source_date: "", content: "" });
                  e.target.value = "";
                }}
                className="block w-full text-sm text-gray-600
                           file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                           file:bg-[#1B4332] file:text-white file:text-sm
                           hover:file:bg-[#14342A]"
              />
              <p className="text-xs text-gray-400">
                Attached once the project is saved. Text is pulled out of the file, same as a pasted one.
              </p>
            </>
          )}
        </div>
      </Field>

      {/* B4. A brief that arrived as a PDF should be attachable at the moment
          it is being described, not chased afterwards. */}
      <Field label="Documents (optional)">
        <input
          type="file"
          multiple
          data-testid="np-documents"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="block w-full text-sm text-gray-600
                     file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                     file:bg-[#1B4332] file:text-white file:text-sm
                     hover:file:bg-[#14342A]"
        />
        {files.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {files.length} file{files.length === 1 ? "" : "s"} will be attached:{" "}
            {files.map((f) => f.name).join(", ")}
          </p>
        )}
      </Field>

      <div className={onCancel ? "flex gap-3" : ""}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting} className="flex-1 py-6 text-base">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className={`${onCancel ? "flex-1" : "w-full"} bg-[#1B4332] hover:bg-[#1B4332]/90 text-white py-6 text-base font-semibold`}
          data-testid="np-submit"
        >
          {submitting ? "Creating..." : "Create Project (Stage 1)"}
        </Button>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Project starts at Stage 1 (Prospect). Qualifiers will be notified by email.
      </p>
    </form>
  );
}

// `bg-white` and `text-gray-900` are named rather than left to the browser
// because the dark-mode rules key on them: the override is `html.dark
// input.bg-white`. Without the class the field kept the browser's white
// background while its text followed the theme to near-white, which is
// unreadable -- and the same fields on the Flow page have the same problem.
const inputCls = "w-full px-3 py-2 bg-white text-gray-900 border border-[#EAE7E0] rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none";

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);
