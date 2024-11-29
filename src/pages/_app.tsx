// pages/_app.tsx
import type { AppProps } from "next/app";
import "../styles/globals.css";
import dynamic from "next/dynamic";

// Dynamically import NetworkGraph with SSR disabled
const NetworkGraph = dynamic(() => import("../components/NetworkGraph"), {
  ssr: false,
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <NetworkGraph />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
