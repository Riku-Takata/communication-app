// pages/index.tsx
import type { NextPage } from "next";
import dynamic from "next/dynamic";

// Dynamically import NetworkGraph with SSR disabled
const NetworkGraph = dynamic(() => import("../components/NetworkGraph"), {
  ssr: false,
});

const Home: NextPage = () => {
  return (
    <div>
      <h1>
        Welcome to the Network Graph
      </h1>
      <NetworkGraph />
    </div>
  );
};

export default Home;
