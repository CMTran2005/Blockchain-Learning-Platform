import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import MyCourses from './pages/MyCourses';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import { connectWallet } from './utils/connectWallet';
import { getContract } from './utils/contract';
import { assertContractNetwork, getWeb3PaymentErrorMessage } from './utils/web3Payment';
import { LanguageProvider } from './context/LanguageContext';

const TOAST_DURATION = 3500;

const ToastIcon = ({ type }) => {
  if (type === 'success') return <span className="toast-icon">✅</span>;
  if (type === 'error')   return <span className="toast-icon">❌</span>;
  return <span className="toast-icon">ℹ️</span>;
};

function App() {
  const [account, setAccount]   = useState('');
  const [contract, setContract] = useState(null);
  const [toasts, setToasts]     = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION);
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      const { provider, signer, address } = await connectWallet();
      await assertContractNetwork(provider);
      setAccount(address);
      setContract(getContract(signer));
      showToast('Wallet connected!', 'success');
    } catch (err) {
      showToast(getWeb3PaymentErrorMessage(err) || err.message || 'Failed to connect wallet', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if (accounts.length > 0) handleConnect();
    });
    window.ethereum.on('accountsChanged', accounts => {
      if (accounts.length > 0) handleConnect();
      else { setAccount(''); setContract(null); showToast('Wallet disconnected', 'info'); }
    });
  }, [handleConnect, showToast]);

  return (
    <LanguageProvider>
      <Router>
        <div className="app-wrapper">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />

          <div className="app-container">
            <Navbar account={account} onConnect={handleConnect} />
            <Routes>
              <Route path="/"           element={<Home         contract={contract} account={account} showToast={showToast} />} />
              <Route path="/course/:id" element={<CourseDetail contract={contract} account={account} showToast={showToast} />} />
              <Route path="/my-courses" element={<MyCourses   contract={contract} account={account} />} />
              <Route path="/profile"    element={<Profile      account={account} showToast={showToast} />} />
              <Route path="/admin"      element={<AdminDashboard account={account} showToast={showToast} />} />
            </Routes>
          </div>

          <div className="toast-stack">
            {toasts.map(toast => (
              <div key={toast.id} className={`toast toast-${toast.type}`}>
                <ToastIcon type={toast.type} />
                <span className="toast-msg">{toast.message}</span>
                <div className="toast-progress" style={{ animationDuration: `${TOAST_DURATION}ms` }} />
              </div>
            ))}
          </div>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
