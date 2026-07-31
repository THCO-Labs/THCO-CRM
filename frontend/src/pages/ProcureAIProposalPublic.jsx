import EmailGate from '../components/EmailGate';
import MobileWrapper from '../components/MobileWrapper';
import ProcureAIProposalV2 from './ProcureAIProposalV2';

const ProcureAIProposalPublic = () => {
  return (
    <EmailGate 
      proposalSlug="procure-ai" 
      proposalTitle="Procure AI - Process Flowcharts"
    >
      <MobileWrapper presentationTitle="Procure AI - Process Flowcharts">
        <ProcureAIProposalV2 />
      </MobileWrapper>
    </EmailGate>
  );
};

export default ProcureAIProposalPublic;
