import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import NewProjectForm from "./NewProjectForm";

/**
 * Open a project without leaving the page you are on.
 *
 * The dashboard's "New Project" button used to navigate into Flow, which meant
 * losing the dashboard to fill in a short form and then having to find the way
 * back. The work being created is the same work -- it is only the interruption
 * that was unnecessary.
 *
 * Once saved, the dialog closes and the dashboard stays put. Going straight to
 * the new project would be the same interruption arriving a step later, so the
 * caller is told what was created and can refresh what it shows.
 */
export default function NewProjectDialog({ open, onClose, onCreated }) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* The surface colour is stated here rather than inherited. `bg-background`
          resolves to a dark value on bare :root, so a dialog that does not say
          otherwise comes out dark in light mode as well as dark mode -- which
          is why every other dialog in the app names it too. `bg-white` and
          `text-gray-900` both have html.dark overrides, so this follows the
          theme in the direction it is meant to. */}
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[#EAE7E0] text-gray-900"
        data-testid="new-project-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] text-gray-900">
            New Project
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Starts at Stage 1 (Prospect). You can add the rest in Flow later.
          </p>
        </DialogHeader>

        <NewProjectForm
          compact
          onCancel={onClose}
          onCreated={(created) => {
            onClose();
            // The caller refreshes its own counts; it knows what it is showing.
            onCreated?.(created);
          }}
        />

        <button
          type="button"
          onClick={() => navigate("/flow/projects")}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 mx-auto"
        >
          Open the full pipeline instead
        </button>
      </DialogContent>
    </Dialog>
  );
}
