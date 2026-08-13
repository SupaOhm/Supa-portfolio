import type { Project, ProjectCategory, ProjectStatus } from '../types/project';

/**
 * Filters projects by category and status.
 *
 * An empty set means "no filter applied" (pass everything), NOT "match
 * nothing". Values OR together within each group and the two groups AND
 * together. A project without a `status` is excluded whenever any status
 * filter is active, because `status` is optional on the Project type.
 */
export function filterProjects(
  projects: readonly Project[],
  categories: ReadonlySet<ProjectCategory>,
  statuses: ReadonlySet<ProjectStatus>,
): Project[] {
  return projects.filter((project) => {
    const categoryOk =
      categories.size === 0 || project.categories.some((c) => categories.has(c));
    const statusOk =
      statuses.size === 0 || (project.status != null && statuses.has(project.status));
    return categoryOk && statusOk;
  });
}
