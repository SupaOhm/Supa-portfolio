import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero';
import About from '../components/About';
import Skills from '../components/Skills';
import Projects from '../components/Projects';
import Connect from '../components/Connect';
import { scrollToSection } from '../hooks/useActiveSection';
import PageAtmosphere from '../components/PageAtmosphere';
import { useCursorGlow } from '../hooks/useCursorGlow';

export default function Home() {
	const location = useLocation();
	const handleGlow = useCursorGlow();

	useEffect(() => {
		const state = location.state as { targetId?: string } | null;
		const targetId = state?.targetId || (window.location.hash ? window.location.hash.slice(1) : undefined);
		if (targetId) {
			scrollToSection(targetId);
		}
	}, [location]);

	return (
		/* onMouseMove here rather than per section: the atmosphere is one layer
		   now, so there is one writer for --glow-x / --glow-y and it lives at
		   the same level the layer does. Four section-level writers would each
		   set the property on their own subtree and the fixed layer, which is
		   not inside any of them, would never see it. */
		<main onMouseMove={handleGlow}>
			<PageAtmosphere />
			<Hero />
			<About />
			<Skills />
			<Projects />
			<Connect />
		</main>
	);
}
