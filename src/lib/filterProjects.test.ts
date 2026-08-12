import { describe, it, expect } from 'vitest';
import { filterProjects } from './filterProjects';
import type { Project, ProjectCategory, ProjectStatus } from '../types/project';

/**
 * Uses its own fixture rather than importing PROJECTS, for two reasons:
 * the tests stay stable as real project data changes, and all 12 current
 * PROJECTS entries supply a `status`, so the status-less rule below has no
 * real-world example to exercise it.
 */
const FIXTURE: Project[] = [
  {
    id: '1',
    title: 'Web Completed',
    description: '',
    tags: [],
    categories: ['Web'],
    status: 'completed',
  },
  {
    id: '2',
    title: 'Mobile In Progress',
    description: '',
    tags: [],
    categories: ['Mobile'],
    status: 'in-progress',
  },
  {
    id: '3',
    title: 'Web And Backend Planned',
    description: '',
    tags: [],
    categories: ['Web', 'Backend'],
    status: 'planned',
  },
  {
    id: '4',
    title: 'Tools No Status',
    description: '',
    tags: [],
    categories: ['Tools'],
    // deliberately no `status` - the Project type marks it optional
  },
];

const cats = (...values: ProjectCategory[]) => new Set<ProjectCategory>(values);
const stats = (...values: ProjectStatus[]) => new Set<ProjectStatus>(values);
const titles = (result: Project[]) => result.map((p) => p.title);

describe('filterProjects', () => {
  it('returns every project when both filter sets are empty', () => {
    expect(filterProjects(FIXTURE, cats(), stats())).toHaveLength(4);
  });

  it('matches a project if ANY of its categories is selected', () => {
    expect(titles(filterProjects(FIXTURE, cats('Web'), stats()))).toEqual([
      'Web Completed',
      'Web And Backend Planned',
    ]);
  });

  it('ORs within the category group', () => {
    expect(titles(filterProjects(FIXTURE, cats('Mobile', 'Tools'), stats()))).toEqual([
      'Mobile In Progress',
      'Tools No Status',
    ]);
  });

  it('ORs within the status group', () => {
    expect(titles(filterProjects(FIXTURE, cats(), stats('completed', 'planned')))).toEqual([
      'Web Completed',
      'Web And Backend Planned',
    ]);
  });

  it('ANDs across the category and status groups', () => {
    expect(titles(filterProjects(FIXTURE, cats('Web'), stats('planned')))).toEqual([
      'Web And Backend Planned',
    ]);
  });

  it('EXCLUDES a project with no status whenever any status filter is active', () => {
    // The status-less project is returned when no status filter is set...
    expect(titles(filterProjects(FIXTURE, cats('Tools'), stats()))).toEqual([
      'Tools No Status',
    ]);
    // ...but disappears as soon as one is, for every possible status value.
    expect(filterProjects(FIXTURE, cats('Tools'), stats('completed'))).toEqual([]);
    expect(filterProjects(FIXTURE, cats('Tools'), stats('in-progress'))).toEqual([]);
    expect(filterProjects(FIXTURE, cats('Tools'), stats('planned'))).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterProjects(FIXTURE, cats('Security'), stats())).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const copy = [...FIXTURE];
    filterProjects(FIXTURE, cats('Web'), stats());
    expect(FIXTURE).toEqual(copy);
  });
});
