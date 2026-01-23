import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Claim } from '../../types';
import { Save, Send, ArrowLeft, Mail, MapPin, Upload, Image } from 'lucide-react';
import { BANK_LIST } from '../../utils/constants';

export default function ServicePayment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addClaim, updateClaim, claims } = useApp();
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

    // Load existing data
    useEffect(() => {
        if (id) {
            const claim = claims.find(c => c.id === id);
            if (claim && claim.serviceDetails) {
                setFormData({
                    payeeName: claim.payee,
                    idNumber: claim.serviceDetails.idNumber,
                    email: claim.serviceDetails.email,
                    registeredAddress: claim.serviceDetails.registeredAddress,
                    description: claim.description,
                    servicePeriodStart: claim.serviceDetails.servicePeriodStart,
                    servicePeriodEnd: claim.serviceDetails.servicePeriodEnd,
                    amount: claim.amount,
                    bankCode: claim.serviceDetails.bankCode,
                    bankAccount: claim.serviceDetails.bankAccount,
                });
                // Note: Files cannot be restored to File objects. 
                // We should show them as "Existing: filename" and allow replace.
                // For simplicity in this demo, we won't force re-upload if logic allows, 
                // but currently validation requires files. 
                // I'll need to adjust validation or 'mock' the file presence state.
                // Let's rely on the user to re-upload for now if it's strict, 
                // OR add `existingFiles` state.
            }
        }
    }, [id, claims]);

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
            // Relaxed file validation for Edit mode if we assume files exist, 
            // but we don't track them well here. Let's warn if strictly submitting.
            if ((!idFrontFile || !idBackFile || !bankBookFile) && !id) {
                // If creating new, must have files. 
                // If editing, maybe we kept old ones? 
                // Ideally we should merge `serviceDetails` image paths if new ones are null.
                alert('請上傳所有必要附件');
                return;
            }
        }

        const selectedBank = BANK_LIST.find(b => b.code === formData.bankCode);

        const claimData = {
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
                // Update images only if new file provided, otherwise need to keep old strings.
                // Since I can't access old claim easily here without re-fetching or passing it,
                // simplest is: if id exists, we're assuming files handled or just re-upload.
                // Better: pass existing image names if not updating.
                // For this quick fix, I will use new names if exist.
                idFrontImage: idFrontFile?.name,
                idBackImage: idBackFile?.name,
                bankBookImage: bankBookFile?.name
            }
        };

        if (id) {
            // We need to preserve old image paths if not replacing.
            // Fetch current to merge?
            const currentClaim = claims.find(c => c.id === id);
            const currentDetails = currentClaim?.serviceDetails;

            const mergedDetails = {
                ...claimData.serviceDetails,
                idFrontImage: idFrontFile?.name || currentDetails?.idFrontImage,
                idBackImage: idBackFile?.name || currentDetails?.idBackImage,
                bankBookImage: bankBookFile?.name || currentDetails?.bankBookImage,
            };

            updateClaim(id, {
                ...claimData,
                serviceDetails: mergedDetails
            });
        } else {
            addClaim(claimData);
        }
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
