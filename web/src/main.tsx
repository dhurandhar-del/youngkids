import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { StageApp } from './stage/StageApp';
import { ConsoleApp } from './console/ConsoleApp';

const isStage = window.location.pathname.startsWith('/stage');
document.body.classList.add(isStage ? 'is-stage' : 'is-console');

createRoot(document.getElementById('root')!).render(
  // StrictMode is skipped on the Stage: it double-mounts effects, which would open the mic/camera twice.
  isStage ? (
    <StageApp />
  ) : (
    <StrictMode>
      <ConsoleApp />
    </StrictMode>
  ),
);
