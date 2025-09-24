import React from 'react';
import ForbiddenIcon from '../../assets/icons/forbidden-icon.svg';
import LimitedIcon from '../../assets/icons/limited-icon.svg';
import SemiLimitedIcon from '../../assets/icons/semi-limited-icon.svg';

export type BanlistRestriction = 'forbidden' | 'limited' | 'semi_limited';

interface BanlistIconProps {
    restriction: BanlistRestriction;
    size?: number;
    className?: string;
    position?: 'top-left' | 'top-right';
}

const BanlistIcon: React.FC<BanlistIconProps> = ({
    restriction,
    size = 24,
    className = '',
    position = 'top-left'
}) => {
    const getIcon = () => {
        switch (restriction) {
            case 'forbidden':
                return ForbiddenIcon;
            case 'limited':
                return LimitedIcon;
            case 'semi_limited':
                return SemiLimitedIcon;
            default:
                return null;
        }
    };

    const icon = getIcon();

    if (!icon) return null;

    const positionClasses = position === 'top-left'
        ? 'absolute top-1 left-1 z-50'
        : 'absolute top-1 right-1 z-50';

    return (
        <div className={positionClasses}>
            <img
                src={icon}
                alt={`${restriction} card`}
                width={size}
                height={size}
                className={`banlist-icon shadow-lg border border-white rounded-full ${className}`}
                title={`${restriction.charAt(0).toUpperCase() + restriction.slice(1).replace('_', '-')} card`}
            />
        </div>
    );
};

export default BanlistIcon;