import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Settings from './Settings';

const Navigation: React.FC = () => {
    const location = useLocation();
    const [showSettings, setShowSettings] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/binder', label: 'Binder', icon: '📚' },
        { path: '/deck-builder', label: 'Deck Builder', icon: '🃏' },
    ];

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-lg border-b dark:border-gray-700">
            <div className="relative h-16">
                {/* Logo - Absolute left aligned to page */}
                <div className="absolute left-4 top-0 h-16 flex items-center">
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="text-2xl">🎯</div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">YuGiOh Deck Builder</span>
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
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                                    }
                    `}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Settings Button - Absolute right aligned to page */}
                <div className="absolute right-4 top-0 h-16 flex items-center">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                        title="Settings"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Settings Modal */}
            <Settings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </nav>
    );
};

export default Navigation;
