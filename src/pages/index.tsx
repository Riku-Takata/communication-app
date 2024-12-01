// src/pages/index.tsx

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled
const NetworkGraph = dynamic(() => import('../components/NetworkGraph'), { ssr: false });

const HomePage: React.FC = () => {

  return (
    <>
      <div style={{ width: '100%', height: '100vh' }}>
        <NetworkGraph  />
      </div>
    </>
  );
};

export default HomePage;
