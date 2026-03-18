export const PROJECT_CATEGORIES = [
  'Web',
  'Mobile',
  'Backend',
  'Database',
  'Tools',
  'Embedded',
  'Security',
  'Cloud',
  'AI',
  'Design',
  'Data',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_STATUSES = ['completed', 'in-progress', 'planned'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  demoUrl?: string;
  githubUrl?: string;
  status?: ProjectStatus;
  categories: ProjectCategory[];
}
