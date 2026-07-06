export interface Workspace {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface Document {
  id: string;
  workspaceId: string;
  filename: string;
  contentHash: string;
  status: "processing" | "processed" | "error";
  createdAt: string;
}

export interface Citation {
  number: number;
  filename: string;
  snippet: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  workspaceId: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface ToolLog {
  id: string;
  workspaceId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: "success" | "error";
  createdAt: string;
}

export const mockWorkspaces: Workspace[] = [
  {
    id: "ws-1",
    name: "Product Team",
    userId: "user-1",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "ws-2",
    name: "Personal Research",
    userId: "user-1",
    createdAt: "2024-02-20T14:30:00Z",
  },
];

export const mockDocuments: Document[] = [
  {
    id: "doc-1",
    workspaceId: "ws-1",
    filename: "Q3-Product-Roadmap.pdf",
    contentHash: "a1b2c3",
    status: "processed",
    createdAt: "2024-03-01T09:00:00Z",
  },
  {
    id: "doc-2",
    workspaceId: "ws-1",
    filename: "User-Research-Synthesis.md",
    contentHash: "d4e5f6",
    status: "processed",
    createdAt: "2024-03-05T11:15:00Z",
  },
  {
    id: "doc-3",
    workspaceId: "ws-1",
    filename: "Competitive-Analysis-Q2.pdf",
    contentHash: "g7h8i9",
    status: "processed",
    createdAt: "2024-03-10T16:45:00Z",
  },
  {
    id: "doc-4",
    workspaceId: "ws-2",
    filename: "ML-Papers-Collection.txt",
    contentHash: "j0k1l2",
    status: "processed",
    createdAt: "2024-03-12T08:20:00Z",
  },
];

export const mockChatHistory: ChatMessage[] = [
  {
    id: "msg-1",
    workspaceId: "ws-1",
    role: "user",
    content: "What are our top priorities for Q3 based on the roadmap?",
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "msg-2",
    workspaceId: "ws-1",
    role: "assistant",
    content:
      "Based on the Q3 Product Roadmap [1], the top priorities are:\n\n1. **Launch the mobile app v2.0** — This has been flagged as revenue-critical by leadership.\n2. **Refactor the billing system** — Required to support new pricing tiers.\n3. **Improve onboarding funnel** — Target is to reduce drop-off by 20%.\n\nThe User Research Synthesis [2] also confirms that mobile performance is the #1 user complaint.",
    citations: [
      {
        number: 1,
        filename: "Q3-Product-Roadmap.pdf",
        snippet:
          "Priority 1: Mobile app v2.0 launch (revenue-critical). Priority 2: Billing refactor. Priority 3: Onboarding improvement (20% drop-off target).",
        similarity: 0.92,
      },
      {
        number: 2,
        filename: "User-Research-Synthesis.md",
        snippet:
          "Top user pain point: mobile app performance (loading times >3s). 78% of surveyed users rated this as 'very important'.",
        similarity: 0.87,
      },
    ],
    createdAt: "2024-03-15T10:00:05Z",
  },
  {
    id: "msg-3",
    workspaceId: "ws-1",
    role: "user",
    content: "Who are our main competitors and how do we compare?",
    createdAt: "2024-03-15T10:05:00Z",
  },
  {
    id: "msg-4",
    workspaceId: "ws-1",
    role: "assistant",
    content:
      "The Competitive Analysis [3] identifies three key competitors:\n\n- **Competitor A**: Stronger in enterprise features, weaker in UX.\n- **Competitor B**: Better mobile experience, but higher pricing.\n- **Competitor C**: Similar feature set, lagging in AI integrations.\n\nOur main advantage is the integrated AI assistant, which none of them offer natively.",
    citations: [
      {
        number: 3,
        filename: "Competitive-Analysis-Q2.pdf",
        snippet:
          "Competitor A: Enterprise strong, UX weak. Competitor B: Mobile leader, premium pricing. Competitor C: Feature parity, no AI. Our edge: integrated AI.",
        similarity: 0.89,
      },
    ],
    createdAt: "2024-03-15T10:05:04Z",
  },
  {
    id: "msg-5",
    workspaceId: "ws-1",
    role: "user",
    content: "What is the company's revenue for 2025?",
    createdAt: "2024-03-15T10:10:00Z",
  },
  {
    id: "msg-6",
    workspaceId: "ws-1",
    role: "assistant",
    content:
      "I don't have any information about the company's revenue for 2025 in the documents uploaded to this workspace. The available materials focus on product roadmap, user research, and competitive analysis.",
    createdAt: "2024-03-15T10:10:02Z",
  },
  {
    id: "msg-7",
    workspaceId: "ws-1",
    role: "user",
    content: "Save a task to follow up on the mobile app performance issues.",
    createdAt: "2024-03-15T10:15:00Z",
  },
  {
    id: "msg-8",
    workspaceId: "ws-1",
    role: "assistant",
    content:
      "I've saved that task for you. You can view it in the Tasks section.",
    createdAt: "2024-03-15T10:15:03Z",
  },
];

export const mockTasks: Task[] = [
  {
    id: "task-1",
    workspaceId: "ws-1",
    title: "Follow up on mobile app performance issues",
    description:
      "Address loading times >3s reported by 78% of users. Target: <1.5s.",
    createdAt: "2024-03-15T10:15:00Z",
  },
  {
    id: "task-2",
    workspaceId: "ws-1",
    title: "Prepare competitive positioning deck",
    description: "Highlight AI integration advantage vs Competitors A, B, and C.",
    createdAt: "2024-03-14T09:30:00Z",
  },
  {
    id: "task-3",
    workspaceId: "ws-1",
    title: "Review Q3 onboarding metrics",
    description: "Check current drop-off rate and validate 20% improvement target.",
    createdAt: "2024-03-13T14:00:00Z",
  },
  {
    id: "task-4",
    workspaceId: "ws-2",
    title: "Summarize transformer architecture papers",
    description: "Focus on attention mechanisms and efficiency improvements.",
    createdAt: "2024-03-12T11:00:00Z",
  },
];

export const mockToolLogs: ToolLog[] = [
  {
    id: "tool-1",
    workspaceId: "ws-1",
    toolName: "save_task",
    arguments: {
      title: "Follow up on mobile app performance issues",
      description: "Address loading times >3s reported by 78% of users",
    },
    result: { taskId: "task-1", saved: true },
    status: "success",
    createdAt: "2024-03-15T10:15:00Z",
  },
  {
    id: "tool-2",
    workspaceId: "ws-1",
    toolName: "save_task",
    arguments: {
      title: "Prepare competitive positioning deck",
    },
    result: { taskId: "task-2", saved: true },
    status: "success",
    createdAt: "2024-03-14T09:30:00Z",
  },
  {
    id: "tool-3",
    workspaceId: "ws-1",
    toolName: "send_slack_summary",
    arguments: {
      channel: "#product-updates",
      message: "Q3 priorities: mobile v2.0, billing refactor, onboarding.",
    },
    result: { messageId: "slack-123", sent: true },
    status: "success",
    createdAt: "2024-03-14T16:00:00Z",
  },
  {
    id: "tool-4",
    workspaceId: "ws-1",
    toolName: "save_task",
    arguments: { title: "" },
    result: null,
    status: "error",
    createdAt: "2024-03-13T11:20:00Z",
  },
  {
    id: "tool-5",
    workspaceId: "ws-2",
    toolName: "save_task",
    arguments: {
      title: "Summarize transformer architecture papers",
      description: "Focus on attention mechanisms",
    },
    result: { taskId: "task-4", saved: true },
    status: "success",
    createdAt: "2024-03-12T11:00:00Z",
  },
];

export const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  name: "Alex Chen",
  avatarUrl: null,
};
