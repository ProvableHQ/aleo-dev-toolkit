import './App.css';
import { WalletWrapper } from "./components/WalletWrapper";
import HooksDisplay from "./components/HooksDisplay";
import { AleoHooksProvider } from '@provablehq/aleo-hooks';
function App() {
  return (
    <WalletWrapper>
      <AleoHooksProvider>
        <HooksDisplay />
      </AleoHooksProvider>
    </WalletWrapper>
  );
}

export default App; 