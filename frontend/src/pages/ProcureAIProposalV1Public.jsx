import EmailGate from '../components/EmailGate';
import MobileWrapper from '../components/MobileWrapper';
import ProcureAIProposal from './ProcureAIProposal';

const ProcureAIProposalV1Public = () => {
  return (
    <EmailGate 
      proposalSlug="procure-ai-v1" 
      proposalTitle="Procure AI V1 - Original Presentation"
    >
      <MobileWrapper presentationTitle="Procure AI V1">
        <ProcureAIProposal />
      </MobileWrapper>
    </EmailGate>
  );
};

export default ProcureAIProposalV1Public;
