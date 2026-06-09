import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Generator from './pages/Generator.jsx';
import Home from './pages/Home.jsx';
import Results from './pages/Results.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/generator" element={<Generator />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}
