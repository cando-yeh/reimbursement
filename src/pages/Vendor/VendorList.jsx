import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Plus, Search, Building } from 'lucide-react';

export default function VendorList() {
    const { vendors } = useApp();

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="heading-lg">Vendor Management</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Manage your payment recipients.</p>
                </div>
                <Link to="/vendors/add" className="btn btn-primary">
                    <Plus size={18} />
                    Add Vendor
                </Link>
            </header>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem' }}>
                    <Search size={20} color="var(--color-text-muted)" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {vendors.map(vendor => (
                    <div key={vendor.id} className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--color-primary)', opacity: 0.1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {/* Overlay trick or just strict color */}
                        </div>
                        {/* Retrying icon styling without opacity inheritance issues */}
                        <div style={{
                            width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'hsl(var(--primary-hue), var(--primary-sat), 94%)',
                            color: 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            position: 'absolute'
                        }}>
                            <Building size={24} />
                        </div>
                        {/* Spacer for absolute icon */}
                        <div style={{ width: '48px', height: '48px', flexShrink: 0 }}></div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>{vendor.name}</h3>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{vendor.contact}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{vendor.email}</div>
                        </div>
                    </div>
                ))}
                {vendors.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                        No vendors found. Add one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
