// pages/index.tsx
// import CommunicationForm from "@/components/CommunicationForm";
import type { NextPage } from "next";
import dynamic from "next/dynamic";

// Dynamically import NetworkGraph with SSR disabled
const NetworkGraph = dynamic(() => import("../components/NetworkGraph"), {
  ssr: false,
});

const Home: NextPage = () => {
  return (
    <div>
      <h1 style={{ color: "white", textAlign: "center", marginTop: "20px" }}>
        Welcome to the Network Graph
      </h1>
      {/* <CommunicationForm /> */}
      <NetworkGraph />
    </div>
  );
};

export default Home;
