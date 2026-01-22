import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Building } from 'lucide-react';


const BANK_LIST = [
    { code: '004', name: '臺灣銀行' },
    { code: '005', name: '土地銀行' },
    { code: '006', name: '合作金庫' },
    { code: '007', name: '第一銀行' },
    { code: '008', name: '華南銀行' },
    { code: '009', name: '彰化銀行' },
    { code: '011', name: '上海銀行' },
    { code: '012', name: '台北富邦' },
    { code: '013', name: '國泰世華' },
    { code: '015', name: '中國輸出' },
    { code: '016', name: '高雄銀行' },
    { code: '017', name: '兆豐銀行' },
    { code: '018', name: '農業金庫' },
    { code: '021', name: '花旗銀行' },
    { code: '048', name: '王道銀行' },
    { code: '050', name: '臺灣企銀' },
    { code: '052', name: '渣打銀行' },
    { code: '053', name: '台中銀行' },
    { code: '054', name: '京城銀行' },
    { code: '081', name: '滙豐銀行' },
    { code: '101', name: '瑞興銀行' },
    { code: '102', name: '華泰銀行' },
    { code: '103', name: '新光銀行' },
    { code: '108', name: '陽信銀行' },
    { code: '118', name: '板信銀行' },
    { code: '147', name: '三信銀行' },
    { code: '700', name: '中華郵政' },
    { code: '803', name: '聯邦銀行' },
    { code: '805', name: '遠東商銀' },
    { code: '806', name: '元大銀行' },
    { code: '807', name: '永豐銀行' },
    { code: '808', name: '玉山銀行' },
    { code: '809', name: '凱基銀行' },
    { code: '810', name: '星展銀行' },
    { code: '812', name: '台新銀行' },
    { code: '816', name: '安泰銀行' },
    { code: '822', name: '中國信託' },
    { code: '823', name: '將來銀行' },
    { code: '824', name: '連線銀行' },
    { code: '826', name: '樂天銀行' },
];

export default function AddVendor() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { requestAddVendor, requestUpdateVendor, vendors } = useApp();
    const [formData, setFormData] = useState({
        name: '',
        serviceContent: '',
        bankCode: '',
        bankAccount: ''
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
                    bankAccount: vendor.bankAccount || ''
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
        // Validation: All fields required
        if (!formData.name || !formData.serviceContent || !formData.bankCode || !formData.bankAccount) {
            alert('請填寫所有欄位。');
            return;
        }

        if (isEditMode) {
            requestUpdateVendor(id, formData);
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

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>銀行 <span className="required-star">*</span></label>
                            <select
                                required
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
                            <label>銀行帳號 <span className="required-star">*</span> <span className="input-hint">(僅限數字)</span></label>
                            <input
                                type="text"
                                required
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
