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
