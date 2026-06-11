import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Generator from './pages/Generator.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Results from './pages/Results.jsx';
import BatchUpload from './pages/BatchUpload.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/generator" element={<Generator />} />
        <Route path="/results" element={<Results />} />
        <Route path="/batch" element={<BatchUpload />} />
      </Routes>
    </BrowserRouter>
  );
}
