'use client';

import React from 'react';

const AnimatedCube: React.FC = () => {
    return (
        <div className="cube-wrap absolute pointer-events-none opacity-60">
            <div className="cube-container">
                <div className="cube-face cube-face-front">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                </div>
                <div className="cube-face cube-face-back">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                </div>
                <div className="cube-face cube-face-right" />
                <div className="cube-face cube-face-left" />
                <div className="cube-face cube-face-top" />
                <div className="cube-face cube-face-bottom" />
            </div>
        </div>
    );
};

export default AnimatedCube;
