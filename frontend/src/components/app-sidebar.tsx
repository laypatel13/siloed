import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  MessageSquare,
  FileText,
  CheckSquare,
  Wrench,
  Layers,
  LogOut,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspace } from "@/lib/workspace-context";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Tool Logs", url: "/tool-logs", icon: Wrench },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });
  const { workspaces, activeWorkspace, setActiveWorkspaceId } =
    useWorkspace();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  // AppShell's WorkspaceGate only renders children once a workspace is
  // active, so this only guards against a render race, not real usage.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (!activeWorkspace) return null;

  const initials = (email ?? "?").slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Siloed
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <div className="mb-4 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm hover:bg-accent transition-colors">
                <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left font-medium">
                      {activeWorkspace.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  className="cursor-pointer"
                  onSelect={() => setActiveWorkspaceId(ws.id)}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === activeWorkspace.id && (
                    <Check className="ml-2 h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={currentPath === item.url}
                tooltip={collapsed ? item.title : undefined}
              >
                <Link
                  to={item.url}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 min-w-0 items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-medium">
                  {email ?? "Signed in"}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
