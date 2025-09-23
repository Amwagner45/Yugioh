import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/binder', label: 'Binder', icon: '📚' },
        { path: '/deck-builder', label: 'Deck Builder', icon: '🃏' },
    ];

    return (
        <nav className="bg-white shadow-lg border-b">
            <div className="relative h-16">
                {/* Logo - Absolute left aligned to page */}
                <div className="absolute left-4 top-0 h-16 flex items-center">
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="text-2xl">🎯</div>
                        <span className="text-xl font-bold text-gray-900">YuGiOh Deck Builder</span>
                    </Link>
                </div>

                {/* Navigation Links - Centered to page */}
                <div className="absolute left-1/2 transform -translate-x-1/2 top-0 h-16 flex items-center">
                    <div className="flex space-x-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.path)
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }
                    `}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
