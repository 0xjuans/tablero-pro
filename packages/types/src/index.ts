// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: Role;
  createdAt: Date;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  coverUrl: string | null;
  memberCount: number;
  taskCount: number;
  createdAt: Date;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface TaskDto {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  order: number;
  dueDate: Date | null;
  assignee: UserDto | null;
  createdBy: UserDto;
  tags: TaskTagDto[];
  attachments: AttachmentDto[];
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskTagDto {
  id: string;
  label: string;
  color: string;
}

export interface AttachmentDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Url: string;
  createdAt: Date;
}

// ─── Column ───────────────────────────────────────────────────────────────────

export interface ColumnDto {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color: string | null;
  tasks: TaskDto[];
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ─── Enums (mirrored from Prisma) ─────────────────────────────────────────────

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'COMMENT_ADDED'
  | 'PROJECT_INVITE'
  | 'WORKSPACE_INVITE';

// ─── SSE Events ───────────────────────────────────────────────────────────────

export type SseEventType =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.deleted'
  | 'comment.added'
  | 'notification.new';

export interface SseEvent<T = unknown> {
  type: SseEventType;
  payload: T;
  projectId?: string;
}
