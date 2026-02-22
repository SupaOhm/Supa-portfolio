export type ProjectCategory =
  | 'All'
  | 'Web'
  | 'Mobile'
  | 'Backend'
  | 'Database'
  | 'Tools'
  | 'Embedded'
  | 'Security'
  | 'Cloud'
  | 'AI'
  | 'Design';

export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  demoUrl?: string;
  githubUrl?: string;
  status?: 'completed' | 'in-progress' | 'planned';
  categories: ProjectCategory[];
}
