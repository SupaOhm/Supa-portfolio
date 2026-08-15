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

  it('defers loading and decoding so the below-the-fold cards do not block paint', () => {
    render(<ProjectCard project={project} />);

    // Projects sits far below the fold; eagerly fetching 11 images competes with
    // above-the-fold work. queryByRole cannot find it (alt="" makes it
    // presentational and removes it from the accessibility tree), so query the DOM.
    const image = document.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });
});
