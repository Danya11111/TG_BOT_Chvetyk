import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import './BottomNavigation.css';

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'catalog',
      label: 'Каталог',
      path: '/catalog',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    {
      id: 'cart',
      label: 'Корзина',
      path: '/cart',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      )
    },
    {
      id: 'profile',
      label: 'Профиль',
      path: '/profile',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="5"></circle>
          <path d="M3 21c0-5 4-9 9-9s9 4 9 9"></path>
        </svg>
      )
    }
  ];

  return (
    <div className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button 
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={clsx('bottom-nav__item', isActive && 'bottom-nav__item--active')}
          >
            <div className="bottom-nav__icon-wrapper">
              {tab.icon(isActive)}
            </div>
            <span className="bottom-nav__label">
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
