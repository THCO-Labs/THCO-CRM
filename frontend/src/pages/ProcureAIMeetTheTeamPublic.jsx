import EmailGate from "../components/EmailGate";
import ProcureAIMeetTheTeam from "./ProcureAIMeetTheTeam";

export default function ProcureAIMeetTheTeamPublic() {
  return (
    <EmailGate proposalSlug="procure-ai-team" proposalTitle="Procure AI — Meet the Team">
      <ProcureAIMeetTheTeam />
    </EmailGate>
  );
}
