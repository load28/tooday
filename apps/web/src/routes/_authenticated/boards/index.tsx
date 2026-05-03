import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/boards/')({
  component: Boards,
});

function Boards() {
  return <div>Boards</div>;
}
