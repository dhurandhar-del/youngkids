import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { StageApp } from './stage/StageApp';
import { ConsoleApp } from './console/ConsoleApp';
import { PlayApp } from './play/PlayApp';

// /         self-serve: each player types their name on their own laptop and plays
// /console  facilitator console (roster), /stage  facilitator-driven stage
const path = window.location.pathname;
const mode = path.startsWith('/console') ? 'console' : path.startsWith('/stage') ? 'stage' : 'play';
document.body.classList.add(mode === 'console' ? 'is-console' : 'is-stage');

createRoot(document.getElementById('root')!).render(
  // StrictMode is skipped on the Stage and Play pages: it double-mounts effects, which would open the mic/camera twice.
  mode === 'console' ? (
    <StrictMode>
      <ConsoleApp />
    </StrictMode>
  ) : mode === 'stage' ? (
    <StageApp />
  ) : (
    <PlayApp />
  ),
);
