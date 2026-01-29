import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPages = () => {
        const pages = [];
        const maxVisible = 5;

        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '2rem',
            marginBottom: '1rem'
        }}>
            <button
                className="btn btn-ghost"
                style={{ padding: '0.5rem', minWidth: 'auto' }}
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                <ChevronLeft size={18} />
            </button>

            {getPages().map(page => (
                <button
                    key={page}
                    className={`btn ${page === currentPage ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                        minWidth: '2.5rem',
                        height: '2.5rem',
                        padding: 0,
                        backgroundColor: page === currentPage ? 'var(--color-primary)' : 'transparent',
                        color: page === currentPage ? 'white' : 'var(--color-text)'
                    }}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}

            <button
                className="btn btn-ghost"
                style={{ padding: '0.5rem', minWidth: 'auto' }}
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}
