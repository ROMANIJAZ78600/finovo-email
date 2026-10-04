import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
const API_URL = "https://finovo-email.vercel.app"; // Replace with your backend API URL

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("sessionId", data.sessionId);

      onLogin({
        email: data.email,
        password,
      });
      toast.success("Login successful!");
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 5000,
          style: {
            background: "#ffffff",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "14px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#16a34a",
              secondary: "#ffffff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#dc2626",
              secondary: "#ffffff",
            },
          },
        }}
        reverseOrder={false}
        gutter={8}
      />
      <div className="login-page">
        <div className="login-card">
          <h1>Email Sender</h1>

          <p className="login-subtitle">Login with your email account</p>

          <form onSubmit={handleLogin}>
            <label>Email Address</label>

            <input
              type="email"
              placeholder="example@finovoglobal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your email password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "LOGGING IN..." : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Login;
