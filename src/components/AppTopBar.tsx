import React, { type ReactNode } from 'react';
import { Top } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';

interface AppTopBarProps {
  title: string;
  backButton?: boolean;
  right?: ReactNode;
}

export function AppTopBar({ title, backButton = false, right }: AppTopBarProps): React.JSX.Element {
  const navigate = useNavigate();

  const handleBack = (): void => {
    try {
      navigate(-1);
    } catch {
      navigate('/');
    }
  };

  return (
    <Top title={title}>
      {backButton && (
        <button onClick={handleBack} aria-label="뒤로가기">
          ‹
        </button>
      )}
      <Top.TitleParagraph>{title}</Top.TitleParagraph>
      {right}
    </Top>
  );
}
