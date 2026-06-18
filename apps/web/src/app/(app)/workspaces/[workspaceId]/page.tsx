import { WorkspaceView } from '@/components/workspaces/workspace-view';

type Props = { params: Promise<{ workspaceId: string }> };

export default async function WorkspacePage({ params }: Props) {
  const { workspaceId } = await params;
  return <WorkspaceView workspaceId={workspaceId} />;
}
