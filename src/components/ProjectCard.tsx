import type { Project } from '../types/project';
import { useCursorGlow } from '../hooks/useCursorGlow';
import ProjectPlaceholder from './ProjectPlaceholder';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const handleMouseMove = useCursorGlow();

  return (
    <article 
      className="relative h-full bg-linear-to-br from-gray-800/50 to-gray-900/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 group backdrop-blur-xs"
      onMouseMove={handleMouseMove}
    >
      {/* Cursor-following gradient effects */}
      <div className="cursor-glow w-[250px] h-[250px] bg-linear-to-r from-blue-500/20 via-purple-500/15 to-transparent rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="cursor-glow w-[150px] h-[150px] bg-linear-to-r from-blue-400/15 to-transparent rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Project Image */}
      {project.imageUrl ? (
        <img
          src={project.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <ProjectPlaceholder project={project} />
      )}

      {/* Project Content */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {project.title}
        </h3>
        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
          {project.description}
        </p>

        {/* Tags */}
        <ul className="flex flex-wrap gap-2 mb-4">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="px-3 py-1 bg-linear-to-r from-blue-500/10 to-purple-500/10 text-gray-300 rounded-md text-xs border border-blue-500/20 hover:border-blue-400/50 hover:text-blue-300 transition-all duration-200"
            >
              {tag}
            </li>
          ))}
        </ul>

        {/* Links and Status */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-110 p-1 hover:bg-blue-500/10 rounded-sm"
                aria-label="View source code"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                </svg>
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-110 p-3 hover:bg-blue-500/10 rounded-sm"
                aria-label="View live demo"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          
          {/* Status Badge */}
          {project.status && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all duration-300 ${
                project.status === 'completed'
                  ? 'bg-linear-to-r from-green-500/25 to-emerald-500/25 text-green-300 border border-green-400/40'
                  : project.status === 'in-progress'
                  ? 'bg-linear-to-r from-yellow-500/25 to-orange-500/25 text-yellow-300 border border-yellow-400/40'
                  : 'bg-linear-to-r from-blue-500/25 to-cyan-500/25 text-blue-300 border border-blue-400/40'
              }`}
            >
              {project.status === 'in-progress' ? 'In Progress' : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
