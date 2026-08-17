import { useNavigate } from "react-router-dom";
import FlowShell from "./FlowShell";
import NewProjectForm from "../../components/flow/NewProjectForm";

/**
 * The full-page way to open a project. The form itself lives in
 * `NewProjectForm`, because the dashboard offers the same action in a dialog
 * and the two must not be able to disagree about who may create what.
 */
export default function FlowNewProject() {
  const navigate = useNavigate();

  return (
    <FlowShell title="New Project (Stage 1 — Prospect)">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-2xl shadow-sm">
        <NewProjectForm onCreated={(created) => navigate(`/flow/projects/${created.id}`)} />
      </div>
    </FlowShell>
  );
}
