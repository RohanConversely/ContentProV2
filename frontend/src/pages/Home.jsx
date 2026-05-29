import { useNavigate } from 'react-router-dom';
import ContentProHero from '../components/ContentProHero.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import ServicesMarquee from '../components/ServicesMarquee.jsx';
import { Pricing } from '../components/ui/single-pricing-card-1.jsx';

export default function Home() {
  const navigate = useNavigate();

  function openGenerator() {
    navigate('/generator');
  }

  return (
    <>
      <ContentProHero onSignupComplete={openGenerator} />
      <ServicesMarquee />
      <HowItWorks />
      <div className="bg-black">
        <Pricing onSignup={openGenerator} />
      </div>
    </>
  );
}
