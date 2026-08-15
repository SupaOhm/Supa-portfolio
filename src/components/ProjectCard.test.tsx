// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ProjectCard from './ProjectCard';
import { PROJECTS } from '../data/projects';

afterEach(cleanup);

const project = PROJECTS[0];

describe('project tags', () => {
  it('exposes the tag row as a list with one item per tag', () => {
    render(<ProjectCard project={project} />);

    expect(screen.getAllByRole('list')).toHaveLength(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(project.tags.length);
  });
});

describe('project image', () => {
  it('marks the image decorative so the title is not announced twice', () => {
    render(<ProjectCard project={project} />);

    // The adjacent h3 already announces the title. An alt that repeats it makes
    // a screen reader say the project name twice in a row.
    expect(screen.getByRole('heading', { name: project.title, level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: project.title })).toBeNull();
  });
});
