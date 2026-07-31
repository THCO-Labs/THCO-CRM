import EmailGate from "../components/EmailGate";
import ProcureAIEYPresentation from "./ProcureAIEYPresentation";

export default function ProcureAIEYPresentationPublic() {
  return (
    <EmailGate proposalSlug="procure-ai-ey" proposalTitle="Procure AI — PMO/TQA Alignment Session">
      <ProcureAIEYPresentation />
    </EmailGate>
  );
}
