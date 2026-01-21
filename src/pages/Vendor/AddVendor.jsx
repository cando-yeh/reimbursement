import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Building } from 'lucide-react';

export default function AddVendor() {
    const navigate = useNavigate();
    const { addVendor } = useApp();
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return; // Basic validation
        addVendor(formData);
        navigate('/vendors');
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <Link to="/vendors" className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back to Vendors
                </Link>
                <h1 className="heading-lg">Add New Vendor</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Enter vendor details for payments.</p>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Vendor Name
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Building size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                required
                                className="input"
                                style={{
                                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                    fontSize: '0.95rem'
                                }}
                                placeholder="e.g. Acme Corp"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Contact Person
                        </label>
                        <input
                            type="text"
                            className="input"
                            style={{
                                width: '100%', padding: '0.75rem 1rem',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                fontSize: '0.95rem'
                            }}
                            placeholder="e.g. John Smith"
                            value={formData.contact}
                            onChange={e => setFormData({ ...formData, contact: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            className="input"
                            style={{
                                width: '100%', padding: '0.75rem 1rem',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                fontSize: '0.95rem'
                            }}
                            placeholder="e.g. billing@acme.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <Link to="/vendors" className="btn btn-ghost">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save Vendor</button>
                    </div>
                </div>
            </form>
        </div>
    );
}
