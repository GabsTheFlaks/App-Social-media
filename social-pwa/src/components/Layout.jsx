import { Outlet, NavLink } from 'react-router-dom';
import { Home, Users, Bell, User } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/network', icon: Users, label: 'Rede' },
  { path: '/notifications', icon: Bell, label: 'Notificações' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">SocialPWA</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-primary-600">SocialPWA</h1>
        </header>

        <div className="max-w-3xl mx-auto p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Tab Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-safe z-20">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center p-2 rounded-lg',
                isActive ? 'text-primary-600' : 'text-gray-500'
              )
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
