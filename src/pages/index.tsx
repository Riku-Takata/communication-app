// pages/index.tsx
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div>
      <h1 style={{ color: "white", textAlign: "center", marginTop: "20px" }}>
        Welcome to the Network Graph
      </h1>
      {/* The NetworkGraph is already included via _app.tsx */}
    </div>
  );
};

export default Home;
