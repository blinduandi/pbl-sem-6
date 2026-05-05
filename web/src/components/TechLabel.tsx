import type { ReactNode } from 'react';

interface TechLabelProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p';
  style?: React.CSSProperties;
}

export default function TechLabel({
  children,
  as = 'span',
  style,
}: TechLabelProps): JSX.Element {
  const Tag = as;
  return (
    <Tag className="tech-label" style={style}>
      {children}
    </Tag>
  );
}
