import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero';
import About from '../components/About';
import Projects from '../components/Projects';
import Connect from '../components/Connect';

export default function Home() {
	const location = useLocation();

	useEffect(() => {
		const state = location.state as { targetId?: string } | null;
		const targetId = state?.targetId || (window.location.hash ? window.location.hash.slice(1) : undefined);
		if (targetId) {
			const el = document.getElementById(targetId);
			if (el) {
				// slight delay to ensure elements are laid out
				setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 0);
			}
		}
	}, [location]);

	return (
		<main>
			<Hero />
			<About />
			<Projects />
			<Connect />
		</main>
	);
}
