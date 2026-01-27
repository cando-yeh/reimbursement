import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Check, AlertCircle, X } from 'lucide-react';
import { Vendor, VendorRequest } from '../../types';

interface SearchableVendorSelectProps {
    vendors: Vendor[];
    vendorRequests: VendorRequest[];
    value: string;
    onChange: (vendorId: string) => void;
    onBlur?: () => void;
    error?: string;
    placeholder?: string;
}

export default function SearchableVendorSelect({
    vendors,
    vendorRequests,
    value,
    onChange,
    onBlur,
    error,
    placeholder = "搜尋廠商..."
}: SearchableVendorSelectProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    // Controlled input value
    const [inputValue, setInputValue] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedVendor = vendors.find(v => v.id === value);

    // Sync input value with selection
    // But only if we are NOT currently searching/typing ourselves?
    // Actually, simpler logic: 
    // If 'value' changes externally, update 'inputValue'.
    // If user types, 'value' might be cleared or kept until they select.
    // Let's adopt a "Combobox" approach: Input is the source of truth for display.
    useEffect(() => {
        if (selectedVendor) {
            setInputValue(selectedVendor.name);
        } else if (!value) {
            // If value is empty, allows input to be whatever (user typing) or empty
            // But if we want to reset...
            // Let's only force it if not open?
            if (!isOpen) setInputValue('');
        }
    }, [value, selectedVendor, isOpen]);

    // Filter vendors based on input text
    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    // Handle clicking outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur, if input matches a vendor exactly, select it? 
                // Or if input is empty, clear it?
                // For safety, let's just trigger standard onBlur
                if (onBlur) onBlur();

                // If the input value doesn't match the selected vendor, revert it
                if (selectedVendor && inputValue !== selectedVendor.name) {
                    setInputValue(selectedVendor.name);
                } else if (!selectedVendor && inputValue !== '') {
                    setInputValue('');
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onBlur, selectedVendor, inputValue]);


    const handleSelect = (vendor: Vendor, isDisabled: boolean) => {
        if (isDisabled) return;
        onChange(vendor.id);
        setInputValue(vendor.name);
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        // Optional: Select all text on focus for easy replacement?
        // inputRef.current?.select();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setIsOpen(true);
        // If user clears input, clear selection
        if (e.target.value === '') {
            onChange('');
        }
    };

    const getVendorStatus = (vendorId: string) => {
        const pendingRequest = vendorRequests.find(
            r => r.status === 'pending' && r.vendorId === vendorId
        );
        return pendingRequest;
    };

    // Determine if we should show the "Add New" option
    // Always show it at the top or bottom of list? User image showed it at top.

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setInputValue('');
        inputRef.current?.focus();
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Combobox Input */}
            <div className="relative">
                <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none'
                }}>
                    <Search size={16} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className={`form-input ${error ? 'border-red-500' : ''}`}
                    style={{
                        paddingLeft: '2.5rem',
                        paddingRight: value ? '2.5rem' : '1rem', // Space for clear button
                        width: '100%',
                        borderColor: error ? 'var(--color-danger)' : undefined
                    }}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                />

                {value && (
                    <div
                        onClick={clearSelection}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            borderRadius: '50%'
                        }}
                        className="hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X size={14} />
                    </div>
                )}
            </div>


            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        marginTop: '0.25rem',
                        backgroundColor: 'white',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        maxHeight: '300px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Add New Vendor Link */}
                    <div
                        onClick={() => navigate('/vendors/add')}
                        style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-primary)',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Plus size={16} />
                        新增廠商
                    </div>

                    {/* Vendor List */}
                    <div className="overflow-y-auto no-scrollbar" style={{ overflowY: 'auto' }}>
                        {filteredVendors.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {inputValue ? '找不到符合的廠商' : '無廠商資料'}
                            </div>
                        ) : (
                            filteredVendors.map(vendor => {
                                const pendingRequest = getVendorStatus(vendor.id);
                                const isDisabled = !!pendingRequest;
                                const isSelected = vendor.id === value;

                                return (
                                    <div
                                        key={vendor.id}
                                        onClick={() => handleSelect(vendor, isDisabled)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            backgroundColor: isSelected ? 'var(--color-primary-bg)' : isDisabled ? 'var(--color-background)' : 'white',
                                            color: isDisabled ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                                            transition: 'background-color 0.1s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isDisabled && !isSelected) e.currentTarget.style.backgroundColor = 'var(--color-background)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isDisabled && !isSelected) e.currentTarget.style.backgroundColor = 'white';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>{vendor.name}</span>
                                            {isDisabled && (
                                                <span
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '999px',
                                                        backgroundColor: 'var(--color-warning-bg)',
                                                        color: 'var(--color-warning)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem'
                                                    }}
                                                >
                                                    <AlertCircle size={10} />
                                                    {pendingRequest?.type === 'delete' ? '待刪除' : '待更新'}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check size={16} className="text-primary" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
