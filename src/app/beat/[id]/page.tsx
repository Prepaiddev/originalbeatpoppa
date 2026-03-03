import BeatDetailsClient from './BeatDetailsClient';

export default async function BeatDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BeatDetailsClient id={id} />;
}
