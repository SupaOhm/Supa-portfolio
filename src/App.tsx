import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import RedirectToSection from './pages/RedirectToSection';
import NotFound from './pages/NotFound';

function App() {
  return (
    /* No background on this wrapper. `body` already paints the same colour in
       index.css, and a body background propagates to the canvas -- which is
       painted before everything, including negative-z layers. A background on
       THIS element is painted as an ordinary in-flow box instead, so it covers
       the fixed -z-10 atmosphere completely. Removing it changes nothing
       visually and is the difference between the backdrop existing and not. */
    <div className="min-h-screen text-white">
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
