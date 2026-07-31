import EmailGate from '../components/EmailGate';
import MobileWrapper from '../components/MobileWrapper';
import ProcureAIExecutivePackV4 from './ProcureAIExecutivePackV4';

const ProcureAIExecutivePackPublic = () => {
  return (
    <EmailGate 
      proposalSlug="procure-ai-executive" 
      proposalTitle="Executive Kick-Off Pack - IHS Towers"
    >
      <MobileWrapper presentationTitle="Executive Kick-Off Pack">
        <ProcureAIExecutivePackV4 />
      </MobileWrapper>
    </EmailGate>
  );
};

export default ProcureAIExecutivePackPublic;
