import EmailGate from "../components/EmailGate";
import AIBankingPresentation from "./AIBankingPresentation";

export default function AIBankingPresentationPublic() {
  return (
    <EmailGate proposalSlug="ai-banking" proposalTitle="AI for Banking — From Monitoring to Intelligence">
      <AIBankingPresentation />
    </EmailGate>
  );
}
