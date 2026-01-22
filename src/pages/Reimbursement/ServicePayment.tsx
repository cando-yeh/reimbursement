import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Claim } from '../../types';
import { Save, Send, ArrowLeft, Mail, MapPin, Upload, Image } from 'lucide-react';

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

export default function ServicePayment() {
    const navigate = useNavigate();
    const { addClaim } = useApp();
    const [formData, setFormData] = useState({
        payeeName: '',
        idNumber: '',
        email: '',
        registeredAddress: '',
        description: '',
        servicePeriodStart: new Date().toISOString().split('T')[0],
        servicePeriodEnd: new Date().toISOString().split('T')[0],
        amount: '' as string | number,
        bankCode: '',
        bankAccount: '',
    });

    const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
    const [idBackFile, setIdBackFile] = useState<File | null>(null);
    const [bankBookFile, setBankBookFile] = useState<File | null>(null);

    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setFormData({ ...formData, bankAccount: value });
        }
    };

    const handleSubmit = (action: 'submit' | 'draft') => {
        const status: Claim['status'] = action === 'submit' ? 'pending' : 'draft';
        const amountNum = Number(formData.amount);

        if (action === 'submit') {
            if (!amountNum || !formData.payeeName || !formData.idNumber || !formData.email ||
                !formData.registeredAddress || !formData.description || !formData.bankCode || !formData.bankAccount) {
                alert('請填寫所有必填欄位');
                return;
            }
            if (!idFrontFile || !idBackFile || !bankBookFile) {
                alert('請上傳所有必要附件');
                return;
            }
        }

        const selectedBank = BANK_LIST.find(b => b.code === formData.bankCode);

        addClaim({
            description: formData.description || '勞務報酬申請',
            date: new Date().toISOString().split('T')[0],
            type: 'service',
            payee: formData.payeeName,
            status: status,
            items: [{
                id: '1',
                amount: amountNum,
                date: formData.servicePeriodStart,
                description: formData.description,
            }],
            serviceDetails: {
                idNumber: formData.idNumber,
                email: formData.email,
                registeredAddress: formData.registeredAddress,
                servicePeriodStart: formData.servicePeriodStart,
                servicePeriodEnd: formData.servicePeriodEnd,
                bankName: selectedBank?.name || '',
                bankCode: formData.bankCode,
                bankAccount: formData.bankAccount,
                idFrontImage: idFrontFile?.name,
                idBackImage: idBackFile?.name,
                bankBookImage: bankBookFile?.name
            }
        });
        navigate('/');
    };

    const renderFileUpload = (label: string, file: File | null, setFile: (f: File | null) => void, id: string) => (
        <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                {label} <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div
                style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: file ? 'var(--color-success-bg)' : 'var(--color-bg)',
                    minHeight: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onClick={() => document.getElementById(id)?.click()}
            >
                <input
                    type="file"
                    id={id}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setFile(e.target.files[0]);
                        }
                    }}
                />
                {file ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Image size={18} style={{ color: 'var(--color-success)' }} />
                        <span style={{ color: 'var(--color-success)', fontWeight: 500, fontSize: '0.85rem' }}>{file.name}</span>
                    </div>
                ) : (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                        <Upload size={20} style={{ marginBottom: '0.25rem' }} />
                        <div>點擊上傳</div>
                    </div>
                )}
            </div>
        </div>
    );

    const requiredStar = <span style={{ color: 'var(--color-danger)' }}>*</span>;

    return (
        <div className="reimburse-container">
            <header className="reimburse-header">
                <Link to="/applications/new" className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> 返回選擇頁面
                </Link>
            </header>

            <div className="card">
                <div className="section-header" style={{ marginBottom: '1.5rem' }}>
                    <h1 className="heading-lg">勞務報酬單</h1>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('submit'); }}>
                    <div style={{ display: 'grid', gap: '1rem' }}>

                        {/* Row 1: Name, ID */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>姓名 {requiredStar}</label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    value={formData.payeeName}
                                    onChange={e => setFormData({ ...formData, payeeName: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>身分證字號 {requiredStar}</label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    value={formData.idNumber}
                                    onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Row 2: Email, Address */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>電子信箱 {requiredStar}</label>
                                <div className="input-wrapper-icon">
                                    <Mail size={18} className="input-icon" />
                                    <input
                                        type="email"
                                        required
                                        className="form-input has-icon"
                                        placeholder="example@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>戶籍地址 {requiredStar}</label>
                                <div className="input-wrapper-icon">
                                    <MapPin size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        required
                                        className="form-input has-icon"
                                        placeholder="請輸入詳盡地址"
                                        value={formData.registeredAddress}
                                        onChange={e => setFormData({ ...formData, registeredAddress: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Service Description */}
                        <div className="form-group">
                            <label>勞務內容 (事由) {requiredStar}</label>
                            <input
                                type="text"
                                required
                                className="form-input"
                                placeholder="例如：超慢跑教練課程"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Row 4: Dates, Amount */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px', gap: '1rem' }}>
                            <div className="form-group">
                                <label>勞務期間 (起) {requiredStar}</label>
                                <input
                                    type="date"
                                    required
                                    className="form-input"
                                    value={formData.servicePeriodStart}
                                    onChange={e => setFormData({ ...formData, servicePeriodStart: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>勞務期間 (訖) {requiredStar}</label>
                                <input
                                    type="date"
                                    required
                                    className="form-input"
                                    value={formData.servicePeriodEnd}
                                    onChange={e => setFormData({ ...formData, servicePeriodEnd: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>應付金額 {requiredStar}</label>
                                <input
                                    type="number"
                                    required
                                    className="form-input"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || '' })}
                                />
                            </div>
                        </div>

                        {/* Row 5: Bank Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>銀行 {requiredStar}</label>
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
                                <label>銀行帳號 {requiredStar} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>(僅限數字)</span></label>
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

                        {/* Row 6: File Uploads */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            {renderFileUpload('身分證正面', idFrontFile, setIdFrontFile, 'id-front')}
                            {renderFileUpload('身分證反面', idBackFile, setIdBackFile, 'id-back')}
                            {renderFileUpload('銀行存摺正面', bankBookFile, setBankBookFile, 'bank-book')}
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                        <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)' }}>
                            <Save size={18} />
                            儲存草稿
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Send size={18} />
                            提交申請
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
