import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Building } from 'lucide-react';
import { BANK_LIST } from '../../utils/constants';

export default function AddVendor() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { requestAddVendor, requestUpdateVendor, vendors } = useApp();
    const [formData, setFormData] = useState({
        name: '',
        serviceContent: '',
        bankCode: '',
        bankAccount: '',
        isFloatingAccount: false
    });

    const isEditMode = Boolean(id);

    useEffect(() => {
        if (isEditMode && vendors) {
            const vendor = vendors.find(v => v.id === id);
            if (vendor) {
                setFormData({
                    name: vendor.name,
                    serviceContent: vendor.serviceContent || '',
                    bankCode: vendor.bankCode || '',
                    bankAccount: vendor.bankAccount || '',
                    isFloatingAccount: vendor.isFloatingAccount || false
                });
            }
        }
    }, [id, vendors, isEditMode]);

    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setFormData({ ...formData, bankAccount: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validation: Name/Service required. Bank info required only if NOT floating.
        if (!formData.name || !formData.serviceContent) {
            alert('請填寫廠商名稱與服務內容。');
            return;
        }

        if (!formData.isFloatingAccount && (!formData.bankCode || !formData.bankAccount)) {
            alert('固定帳號廠商需填寫銀行資訊。');
            return;
        }

        if (isEditMode) {
            requestUpdateVendor(id!, formData);
            alert('更新申請已提交審核。');
        } else {
            requestAddVendor(formData);
            alert('新增廠商申請已提交審核。');
        }
        navigate('/vendors');
    };

    return (
        <div className="form-container">
            <header className="vendor-header simple">
                <Link to="/vendors" className="btn btn-ghost back-link">
                    <ArrowLeft size={16} /> 返回廠商清單
                </Link>
                <h1 className="heading-lg">{isEditMode ? '編輯廠商' : '新增廠商'}</h1>
                <p className="vendor-subtitle">
                    {isEditMode ? '修改廠商資料。' : '輸入廠商資料以進行付款。'}
                </p>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div className="form-grid">
                    <div className="form-group">
                        <label>廠商名稱 <span className="required-star">*</span></label>
                        <div className="input-wrapper-icon">
                            <Building size={18} className="input-icon" />
                            <input
                                type="text"
                                required
                                className="form-input has-icon"
                                placeholder="例如：某某有限公司"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>服務內容 <span className="required-star">*</span></label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="例如：辦公用品、IT 支援"
                            value={formData.serviceContent}
                            onChange={e => setFormData({ ...formData, serviceContent: e.target.value })}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={formData.isFloatingAccount}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    setFormData({
                                        ...formData,
                                        isFloatingAccount: checked,
                                        bankCode: checked ? '' : formData.bankCode,
                                        bankAccount: checked ? '' : formData.bankAccount
                                    });
                                }}
                                style={{ width: '16px', height: '16px' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>非固定帳號（無需預先填寫銀行資訊）</span>
                        </label>
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', opacity: formData.isFloatingAccount ? 0.5 : 1 }}>
                        <div className="form-group">
                            <label>銀行 {!formData.isFloatingAccount && <span className="required-star">*</span>}</label>
                            <select
                                required={!formData.isFloatingAccount}
                                disabled={formData.isFloatingAccount}
                                className="form-input"
                                value={formData.bankCode}
                                onChange={e => setFormData({ ...formData, bankCode: e.target.value })}
                            >
                                <option value="">==請選擇==</option>
                                {BANK_LIST.map(bank => (
                                    <option key={bank.code} value={bank.code}>
                                        {bank.code} {bank.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>銀行帳號 {!formData.isFloatingAccount && <span className="required-star">*</span>} <span className="input-hint">(僅限數字)</span></label>
                            <input
                                type="text"
                                required={!formData.isFloatingAccount}
                                disabled={formData.isFloatingAccount}
                                pattern="[0-9]*"
                                inputMode="numeric"
                                className="form-input"
                                placeholder="例如：123456789012"
                                value={formData.bankAccount}
                                onChange={handleAccountChange}
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <Link to="/vendors" className="btn btn-ghost">取消</Link>
                        <button type="submit" className="btn btn-primary">
                            {isEditMode ? '提交更新申請' : '提交新增申請'}
                        </button>
                    </div>
                </div>
            </form>

        </div>
    );
}
