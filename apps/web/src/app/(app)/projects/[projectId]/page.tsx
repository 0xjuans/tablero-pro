import { BoardView } from '@/components/kanban/board-view';

type Props = { params: Promise<{ projectId: string }> };

export default async function BoardPage({ params }: Props) {
  const { projectId } = await params;
  return <BoardView projectId={projectId} />;
}
