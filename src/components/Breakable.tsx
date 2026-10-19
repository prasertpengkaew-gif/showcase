import { Fragment, type ReactNode } from 'react';

/**
 * Thai has no spaces between words, and some browsers wrap Thai mid-word. Text containing
 * ​ (zero-width space) is split into unbreakable segments that wrap only at those marks.
 */
export function breakable(text: ReactNode): ReactNode {
  if (typeof text !== 'string' || !text.includes('​')) return text;
  return text.split('​').map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      <span className="whitespace-nowrap">{part}</span>
    </Fragment>
  ));
}
