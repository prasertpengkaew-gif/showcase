import { PROJECT_CATEGORIES, type ProjectCategory } from '../types/project';

export const categoryToParam = (c: ProjectCategory): string => c.toLowerCase().replace(/\s+/g, '-');

export const paramToCategory = (param: string | null): ProjectCategory | null =>
  PROJECT_CATEGORIES.find((c) => categoryToParam(c) === param) ?? null;
