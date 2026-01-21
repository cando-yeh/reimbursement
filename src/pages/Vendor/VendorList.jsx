import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Plus, Search, Building } from 'lucide-react';


export default function VendorList() {
    const { vendors } = useApp();

    return (
        <div>
            <header className="vendor-header">
                <div>
                    <h1 className="heading-lg">Vendor Management</h1>
                    <p className="vendor-subtitle">Manage your payment recipients.</p>
                </div>
                <Link to="/vendors/add" className="btn btn-primary">
                    <Plus size={18} />
                    Add Vendor
                </Link>
            </header>

            <div className="card search-card">
                <div className="search-field">
                    <Search size={20} color="var(--color-text-muted)" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        className="search-input"
                    />
                </div>
            </div>

            <div className="card vendor-table-container">
                <table className="vendor-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Vendor Name</th>
                            <th style={{ width: '30%' }}>Contact Person</th>
                            <th style={{ width: '30%' }}>Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vendors.map(vendor => (
                            <tr key={vendor.id}>
                                <td style={{ fontWeight: 500 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Building size={16} className="text-secondary" />
                                        {vendor.name}
                                    </div>
                                </td>
                                <td className="text-secondary" style={{ color: 'var(--color-text-secondary)' }}>{vendor.contact}</td>
                                <td className="text-secondary" style={{ color: 'var(--color-text-secondary)' }}>{vendor.email}</td>
                            </tr>
                        ))}
                        {vendors.length === 0 && (
                            <tr>
                                <td colSpan="3" className="empty-state">
                                    No vendors found. Add one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
