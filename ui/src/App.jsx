import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TenantInit from './pages/TenantInit';
import Cycles from './pages/Cycles';
import Approvals from './pages/Approvals';
import AgentDependencyMap from './pages/AgentDependencyMap';
import SystemCoreArchitecture from './pages/SystemCoreArchitecture';
import IntelligenceLayer from './pages/IntelligenceLayer';
import ContinuousLearning from './pages/ContinuousLearning';
import ContentViewer from './pages/ContentViewer';
import ProfileEditor from './pages/ProfileEditor';
import CompetitorIntelligence from './pages/CompetitorIntelligence';
import Audit from './pages/Audit';
import './index.css';

function App() {
  const [healthStatus, setHealthStatus] = useState('Checking...');
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data.status === 'ok' ? 'Online' : 'Offline'))
      .catch(() => setHealthStatus('Offline (Backend not running)'));

    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => setTenants(data.tenants || []))
      .catch(err => console.error("Error fetching tenants", err));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout healthStatus={healthStatus} />}>
          <Route index element={<Dashboard tenants={tenants} />} />
          <Route path="onboarding" element={<TenantInit tenants={tenants} />} />
          <Route path="onboarding/editor/:tenantId" element={<ProfileEditor />} />
          <Route path="architecture" element={<SystemCoreArchitecture />} />
          <Route path="intelligence-layer" element={<IntelligenceLayer />} />
          <Route path="dependency-map" element={<AgentDependencyMap />} />
          <Route path="cycles" element={<Cycles tenants={tenants} />} />
          <Route path="learning-loop" element={<ContinuousLearning />} />
          <Route path="content" element={<ContentViewer tenants={tenants} />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="competitor-intelligence" element={<CompetitorIntelligence />} />
          <Route path="audit" element={<Audit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

