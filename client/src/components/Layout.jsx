import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Settings, 
  LogOut,
  ChevronRight,
  Zap,
  Palette
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { path: '/templates', icon: Palette, label: 'Templates' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path, end) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-900)' }}>
      {/* Sidebar */}
      <aside className="sidebar hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <Link to="/" className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))',
                boxShadow: '0 4px 14px var(--glow-primary)'
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gradient">WP Auto</span>
              <p className="text-xs" style={{ color: 'var(--text-500)' }}>Automation Platform</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-500)' }}>
              Menu
            </span>
          </div>
          {navItems.map(({ path, icon: Icon, label, end }) => {
            const active = isActive(path, end);
            return (
              <NavLink
                key={path}
                to={path}
                end={end}
                className="nav-item group"
                style={active ? {
                  background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))',
                  color: 'white'
                } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-4 h-4 opacity-70" />}
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--bg-700)', color: 'var(--text-200)' }}
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-100)' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item w-full justify-start"
            style={{ margin: 0 }}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header 
          className="lg:hidden px-4 py-3 border-b flex items-center justify-between"
          style={{ background: 'var(--bg-800)', borderColor: 'var(--glass-border)' }}
        >
          <Link to="/" className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))'
              }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gradient">WP Auto</span>
          </Link>
          <div className="flex items-center gap-4">
            <NavLink to="/settings" style={{ color: 'var(--text-400)' }}>
              <Settings className="w-5 h-5" />
            </NavLink>
            <button onClick={handleLogout} style={{ color: 'var(--text-400)' }}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
