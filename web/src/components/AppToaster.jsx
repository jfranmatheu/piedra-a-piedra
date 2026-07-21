import { Toaster } from "react-hot-toast";

/** Global toast host — mount once near app root. */
export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      reverseOrder={false}
      gutter={10}
      toastOptions={{
        duration: 3200,
        style: {
          background: "#12121c",
          color: "#f4f4f8",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          fontSize: "13px",
          fontWeight: 500,
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        },
        success: {
          iconTheme: {
            primary: "#f59e0b",
            secondary: "#12121c",
          },
        },
        error: {
          iconTheme: {
            primary: "#fb7185",
            secondary: "#12121c",
          },
        },
      }}
    />
  );
}
