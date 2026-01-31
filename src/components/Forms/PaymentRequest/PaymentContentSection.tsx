'use client';

import React from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import FormSection from '@/components/Common/FormSection';
import Field from '@/components/Common/Field';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import { formatNumberWithCommas } from '@/utils/format';

export default function PaymentContentSection(props: {
    expenseCategory: string;
    setExpenseCategory: (value: string) => void;
    amountInput: string;
    setAmountInput: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    memo: string;
    setMemo: (value: string) => void;
    isSubmitting: boolean;
    markTouched: (key: string) => void;
    getError: (key: string) => string | undefined;
}) {
    const {
        expenseCategory,
        setExpenseCategory,
        amountInput,
        setAmountInput,
        description,
        setDescription,
        memo,
        setMemo,
        isSubmitting,
        markTouched,
        getError
    } = props;

    return (
        <FormSection title="付款內容">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Field label="費用類別" required error={getError('expenseCategory')}>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={expenseCategory}
                                onChange={(e) => setExpenseCategory(e.target.value)}
                                onBlur={() => markTouched('expenseCategory')}
                                className="form-input"
                                style={{ appearance: 'none', paddingRight: '2rem' }}
                                disabled={isSubmitting}
                            >
                                <option value="">請選擇費用類別</option>
                                {EXPENSE_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </Field>
                    <Field label="請款金額" required error={getError('amount')}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, pointerEvents: 'none' }}>NT$</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amountInput}
                                onChange={(e) => setAmountInput(formatNumberWithCommas(e.target.value))}
                                onBlur={() => markTouched('amount')}
                                className="form-input"
                                style={{ paddingLeft: '2.8rem', textAlign: 'right', fontWeight: 600, fontSize: '1.1rem' }}
                                placeholder="0"
                                disabled={isSubmitting}
                            />
                        </div>
                    </Field>
                </div>

                <Field label="交易內容" required error={getError('description')}>
                    <div className="input-wrapper-icon">
                        <FileText size={18} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={() => markTouched('description')}
                            className="form-input has-icon"
                            placeholder="例如：12月份伺服器託管費用、辦公室文具採購"
                            disabled={isSubmitting}
                        />
                    </div>
                </Field>

                <Field label="付款人備註" error={getError('memo')}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value.slice(0, 10))}
                            onBlur={() => markTouched('memo')}
                            className="form-input"
                            placeholder="選填：顯示於對方銀行存摺，限 10 字內"
                            maxLength={10}
                            disabled={isSubmitting}
                        />
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {memo.length}/10
                        </div>
                    </div>
                </Field>
            </div>
        </FormSection>
    );
}
