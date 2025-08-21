import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ logout }) {
  const navLinks = [
    { name: 'Spare Parts', path: '/spareparts' },
    { name: 'StockIn', path: '/stockin' },
    { name: 'StockOut', path: '/stockout' },
    { name: 'Reports', path: '/reports' },
  ];

  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="text-2xl font-bold p-6 border-b border-gray-700">
        Stock Inventory Management System
      </div>
      <nav className="flex-grow p-4">
        <ul className="space-y-4">
          {navLinks.map(link => (
            <li key={link.name}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded hover:bg-gray-700 ${
                    isActive ? 'bg-gray-700 font-semibold' : ''
                  }`
                }
              >
                {link.name}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 rounded hover:bg-red-700/60 bg-red-700/50 font-semibold"
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
