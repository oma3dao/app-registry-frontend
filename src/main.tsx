// src/main.tsx
import { ThirdwebProvider } from "thirdweb/react";
import App from "./app";

function Main() {
  return (
    <ThirdwebProvider>
      <App />
    </ThirdwebProvider>
  );
}

export default Main;
