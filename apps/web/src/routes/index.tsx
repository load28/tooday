import { createFileRoute } from '@tanstack/react-router';
import * as styles from './index.css';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to TanStack Start</h1>
      <p className={styles.description}>
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
    </div>
  );
}
