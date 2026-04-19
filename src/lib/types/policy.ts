export type Policy = {
  id: string;
  ruleId: string;
  description: string;
  priority: number;
  scope: string;
  enforce: boolean;
  type: string | null;
  config: Record<string, unknown> | null;
  createdAt: string;
};
