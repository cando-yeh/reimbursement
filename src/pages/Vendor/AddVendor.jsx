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
        <div className="form-container">
            <header className="vendor-header simple">
                <Link to="/vendors" className="btn btn-ghost back-link">
                    <ArrowLeft size={16} /> Back to Vendors
                </Link>
                <h1 className="heading-lg">Add New Vendor</h1>
                <p className="vendor-subtitle">Enter vendor details for payments.</p>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div className="form-grid">
                    <div className="form-group">
                        <label>Vendor Name</label>
                        <div className="input-wrapper-icon">
                            <Building size={18} className="input-icon" />
                            <input
                                type="text"
                                required
                                className="form-input has-icon"
                                placeholder="e.g. Acme Corp"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Contact Person</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. John Smith"
                            value={formData.contact}
                            onChange={e => setFormData({ ...formData, contact: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            required
                            className="form-input"
                            placeholder="e.g. billing@acme.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="form-actions">
                        <Link to="/vendors" className="btn btn-ghost">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save Vendor</button>
                    </div>
                </div>
            </form>
        </div>
    );
}
