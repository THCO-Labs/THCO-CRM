import EmailGate from '../components/EmailGate';
import MobileWrapper from '../components/MobileWrapper';
import ProcureAIScrollPresentation from './ProcureAIScrollPresentation';

const ProcureAIScrollPublic = () => {
  return (
    <EmailGate 
      proposalSlug="procure-ai-scroll" 
      proposalTitle="Procure AI - Scroll Presentation"
    >
      <MobileWrapper presentationTitle="Procure AI - Scroll Presentation">
        <ProcureAIScrollPresentation />
      </MobileWrapper>
    </EmailGate>
  );
};

export default ProcureAIScrollPublic;
