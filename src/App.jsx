import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import VendorList from './pages/Vendor/VendorList';
import AddVendor from './pages/Vendor/AddVendor';
import EmployeeReimbursement from './pages/Reimbursement/EmployeeReimbursement';
import PaymentRequest from './pages/Reimbursement/PaymentRequest';
import ApplicationDetail from './pages/Application/ApplicationDetail';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendors" element={<VendorList />} />
            <Route path="/vendors/add" element={<AddVendor />} />
            <Route path="/reimburse" element={<EmployeeReimbursement />} />
            <Route path="/payment-request" element={<PaymentRequest />} />
            <Route path="/claims/:id" element={<ApplicationDetail />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
