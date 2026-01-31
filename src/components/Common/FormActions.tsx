import React from 'react';

type ActionButton = {
    label: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    variant: 'primary' | 'ghost';
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    show?: boolean;
};

export default function FormActions(props: {
    buttons: ActionButton[];
    containerClassName?: string;
    containerStyle?: React.CSSProperties;
}) {
    const { buttons, containerClassName, containerStyle } = props;
    return (
        <div className={containerClassName} style={containerStyle}>
            {buttons.filter(b => b.show !== false).map((button, index) => (
                <button
                    key={index}
                    type={button.type || 'button'}
                    onClick={button.onClick}
                    className={`${button.variant === 'primary' ? 'btn btn-primary' : 'btn btn-ghost'}${button.className ? ` ${button.className}` : ''}`}
                    style={button.style}
                    disabled={button.disabled}
                >
                    {button.icon}
                    {button.label}
                </button>
            ))}
        </div>
    );
}
