import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/boards/cards/$card')({ component: Card });

function Card() {
  return <>Card</>;
}
