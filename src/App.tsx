import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import VendorList from './pages/Vendor/VendorList';
import AddVendor from './pages/Vendor/AddVendor';
import VendorRequests from './pages/Vendor/VendorRequests';
import EmployeeReimbursement from './pages/Reimbursement/EmployeeReimbursement';
import PaymentRequest from './pages/Reimbursement/PaymentRequest';
import ApplicationDetail from './pages/Application/ApplicationDetail';
import ApplicationTypeSelect from './pages/Application/ApplicationTypeSelect';
import ServicePayment from './pages/Reimbursement/ServicePayment';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendors" element={<VendorList />} />
            <Route path="/vendors/add" element={<AddVendor />} />
            <Route path="/vendors/edit/:id" element={<AddVendor />} />
            <Route path="/vendors/requests" element={<VendorRequests />} />
            <Route path="/applications/new" element={<ApplicationTypeSelect />} />
            <Route path="/applications/service" element={<ServicePayment />} />
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
