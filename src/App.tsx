import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import RedirectToSection from './pages/RedirectToSection';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<RedirectToSection id="about" />} />
        <Route path="/projects" element={<RedirectToSection id="projects" />} />
        <Route path="/connect" element={<RedirectToSection id="connect" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
