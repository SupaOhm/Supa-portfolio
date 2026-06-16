import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero';
import About from '../components/About';
import Skills from '../components/Skills';
import Projects from '../components/Projects';
import Connect from '../components/Connect';
import { scrollToSection } from '../hooks/useActiveSection';

export default function Home() {
	const location = useLocation();

	useEffect(() => {
		const state = location.state as { targetId?: string } | null;
		const targetId = state?.targetId || (window.location.hash ? window.location.hash.slice(1) : undefined);
		if (targetId) {
			scrollToSection(targetId);
		}
	}, [location]);

	return (
		<main>
			<Hero />
			<About />
			<Skills />
			<Projects />
			<Connect />
		</main>
	);
}
