"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, FileText, LogOut, ChevronsUpDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setOpenMobile } = useSidebar();
  const token = useAuthToken();
  const user = useQuery({
    queryKey: ["auth", token],
    queryFn: () => api.me(token!),
    enabled: !!token,
    refetchOnMount: false,
  });

  function signOut() {
    sessionStorage.removeItem("ripple_token");
    queryClient.clear();
    router.replace("/sign-in");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="group/logo flex h-8 items-center">
          <Image
            width={100}
            height={100}
            alt="Ripple"
            src="/main-logo.png"
            className="h-auto w-[100px] group-data-[collapsible=icon]:hidden"
          />
          <SidebarTrigger
            aria-label="Collapse sidebar"
            className="ml-auto group-data-[collapsible=icon]:hidden"
          />
          <span className="relative hidden size-6 group-data-[collapsible=icon]:block">
            <Image
              width={24}
              height={24}
              alt="Ripple"
              src="/icon.png"
              className="absolute inset-0 size-6 object-contain transition-opacity group-hover/logo:opacity-0 group-focus-within/logo:opacity-0"
            />
            <SidebarTrigger
              aria-label="Expand sidebar"
              className="absolute inset-0 size-6 opacity-0 transition-opacity group-hover/logo:opacity-100 focus-visible:opacity-100"
            />
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/project" />}
                  isActive={pathname.startsWith("/project")}
                  tooltip="Projects"
                  onClick={() => setOpenMobile(false)}
                >
                  <FolderKanban />
                  <span>Projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/briefs" />}
                  isActive={pathname.startsWith("/briefs")}
                  tooltip="Briefs"
                  onClick={() => setOpenMobile(false)}
                >
                  <FileText />
                  <span>Briefs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                render={<SidebarMenuButton size="lg" tooltip="Account" />}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white font-bold text-black">
                  {(user.data?.username || user.data?.email || "R")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <strong className="truncate">
                    {user.data?.username || "Account"}
                  </strong>
                  <small className="truncate text-[11px] text-neutral-400">
                    {user.data?.email || ""}
                  </small>
                </span>
                <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="min-w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {user.data?.email || "Account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
