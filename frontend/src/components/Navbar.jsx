import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, LayoutDashboard, Shield } from "lucide-react";

const Logo = () => (
  <Link to="/" data-testid="nav-logo" className="flex items-center gap-2">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-green-800 text-white font-heading font-bold">L</span>
    <span className="font-heading text-xl font-bold tracking-tight text-stone-900">localink</span>
  </Link>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const dashboardPath = user?.role === "admin" ? "/admin" : user?.role === "local" ? "/local" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/browse"
            data-testid="nav-browse"
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              location.pathname.startsWith("/browse") ? "text-green-800" : "text-stone-700 hover:text-green-800"
            }`}
          >
            Browse locals
          </Link>
          <Link to="/#how" data-testid="nav-how" className="px-4 py-2 text-sm font-medium text-stone-700 rounded-md hover:text-green-800">
            How it works
          </Link>
          <Link to="/#pricing" data-testid="nav-pricing" className="px-4 py-2 text-sm font-medium text-stone-700 rounded-md hover:text-green-800">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Button
                variant="ghost"
                data-testid="nav-login-btn"
                onClick={() => navigate("/login")}
                className="text-stone-700 hover:text-green-800 hover:bg-green-50"
              >
                Log in
              </Button>
              <Button
                data-testid="nav-signup-btn"
                onClick={() => navigate("/register")}
                className="bg-green-800 text-white hover:bg-green-900 hover:text-white"
              >
                Get started
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="nav-user-menu" className="gap-2 border-stone-200">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-heading">{user.name}</div>
                  <div className="text-xs font-normal text-stone-500 capitalize">{user.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-dashboard" onClick={() => navigate(dashboardPath)}>
                  {user.role === "admin" ? <Shield className="mr-2 h-4 w-4" /> : <LayoutDashboard className="mr-2 h-4 w-4" />}
                  Dashboard
                </DropdownMenuItem>
                {user.role === "local" && (
                  <DropdownMenuItem data-testid="menu-profile" onClick={() => navigate("/local/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    My guide profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="menu-logout"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="text-red-600 focus:text-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </nav>
    </header>
  );
}
