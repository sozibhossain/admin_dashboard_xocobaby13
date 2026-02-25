"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  Users,
  Banknote,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/shared/logo-mark";
import { logoutApi } from "@/lib/api";

export function Sidebar({ name, email, avatar }: { name: string; email: string; avatar?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isUserListOpen, setIsUserListOpen] = useState(pathname.startsWith("/users"));
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navClass = (active: boolean) =>
    cn(
      "flex h-12 items-center gap-3 rounded-lg px-4 text-[16px] font-medium transition-all",
      active 
        ? "bg-[#168bd3] text-white shadow-md" 
        : "text-[#4b5563] hover:bg-[#d8e8f8] hover:text-[#168bd3]"
    );

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutApi();
    } catch {
      // no-op: proceed with local signout even if API logout fails
    } finally {
      await signOut({ redirect: false });
      router.replace("/login");
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };

  return (
    <>
      <aside className="flex h-screen sticky top-0 flex-col bg-[#eaf4fd] px-4 pb-6 pt-4 border-r border-blue-100/50">
        {/* Centered Logo Section */}
        <div className="flex justify-center pb-10 pt-4">
          <LogoMark />
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className={navClass(pathname === "/dashboard")}>
            <LayoutGrid className="h-5 w-5" />
            Dashboard Overview
          </Link>

          {/* User List Dropdown */}
          <button
            className={navClass(pathname.startsWith("/users"))}
            onClick={() => setIsUserListOpen(!isUserListOpen)}
          >
            <Users className="h-5 w-5" />
            <span className="flex-1 text-left">User List</span>
            {isUserListOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {isUserListOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-[#168bd3]/20 pl-4">
              <Link href="/users/fishermen" className="block py-2 text-sm text-[#4b5563] hover:text-[#168bd3]">Fisherman List</Link>
              <Link href="/users/spot-owners" className="block py-2 text-sm text-[#4b5563] hover:text-[#168bd3]">Spot Owner List</Link>
            </div>
          )}

          <Link href="/commission-report" className={navClass(pathname === "/commission-report")}>
            <Banknote className="h-5 w-5" />
            Commission Report
          </Link>

          <Link href="/settings" className={navClass(pathname === "/settings")}>
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>

        {/* User Profile & Logout */}
        <div className="mt-auto space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="bg-blue-200">{name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-[#168bd3]">{name}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-[#fca5a5] bg-white text-base font-semibold text-[#ef4444] shadow-sm hover:bg-[#fef2f2]"
            onClick={() => setShowLogoutDialog(true)}
          >
            <LogOut className="mr-2 h-5 w-5 rotate-180" />
            Log out
          </Button>
        </div>
      </aside>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              disabled={isLoggingOut}
            >
              No
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
