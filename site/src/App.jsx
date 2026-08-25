import { useStatus } from './hooks/useStatus';
import { Background } from './components/Background';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Ticker } from './components/Ticker';
import { HowItWorks } from './components/HowItWorks';
import { Compare } from './components/Compare';
import { TokenStrip } from './components/TokenStrip';
import { TerminalDashboard } from './components/TerminalDashboard';
import { Footer } from './components/Footer';

export default function App() {
  const status = useStatus();

  return (
    <>
      <Background />
      <Nav {...status} />
      <Hero {...status} />
      <Ticker />
      <HowItWorks />
      <Compare />
      <TokenStrip />
      <TerminalDashboard {...status} />
      <Footer />
    </>
  );
}
