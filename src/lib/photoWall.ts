export interface Post {
  id: number;
  name: string;
  text: string;
  photo: string | null;
  hidden: boolean;
  at: number;
}

export interface WallState {
  posts: Post[];
  nextId: number;
}

export const MAX_TEXT = 120;
export const MAX_NAME = 30;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const createWall = (): WallState => ({ posts: [], nextId: 1 });

/** Only common photo formats, and not huge. SVG is refused on purpose. */
export const photoOk = (type: string, size: number) => ['image/jpeg', 'image/png', 'image/webp'].includes(type) && size > 0 && size <= MAX_PHOTO_BYTES;

/** A post needs a message or a photo; a missing name becomes "Guest". */
export const post = (state: WallState, input: { name: string; text: string; photo: string | null }, at: number): WallState => {
  const text = input.text.trim();
  if ((!text && !input.photo) || text.length > MAX_TEXT) return state;
  const name = input.name.trim().slice(0, MAX_NAME) || 'Guest';
  return { posts: [...state.posts, { id: state.nextId, name, text, photo: input.photo, hidden: false, at }], nextId: state.nextId + 1 };
};

export const setHidden = (state: WallState, id: number, hidden: boolean): WallState => ({ ...state, posts: state.posts.map((p) => (p.id === id ? { ...p, hidden } : p)) });

/** What the big screen shows: newest first, hidden posts left out. */
export const onWall = (state: WallState, limit = 8): Post[] => state.posts.filter((p) => !p.hidden).sort((a, b) => b.at - a.at || b.id - a.id).slice(0, limit);
