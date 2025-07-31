// Updated GoogleLogin.tsx with Auth Context
import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || "Client ID";

function GoogleLogin() {
  const { login, logout, isAuthenticated, userName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tokenClientRef = useRef<any>(null);

  // Get the page user was trying to access before login
  const from = location.state?.from?.pathname || "/admin";

  useEffect(() => {
    // If already authenticated, redirect to admin
    if (isAuthenticated) {
      navigate(from, { replace: true });
      return;
    }

    // Initialize Google One Tap for user info ID token
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response: any) => {
          console.log("ID Token (JWT): " + response.credential);

          try {
            const payload = JSON.parse(atob(response.credential.split(".")[1]));
            const userName = payload.name;

            // Store ID token, but we still need access token for Sheets API
            localStorage.setItem("google_id_token", response.credential);

            // Automatically request access token after ID token
            if (tokenClientRef.current) {
              tokenClientRef.current.requestAccessToken();
            }
          } catch (e) {
            console.error("Failed to decode ID token", e);
          }
        },
      });

      // Render Google Sign-In button
      const signInDiv = document.getElementById("g_id_signin");
      if (signInDiv) {
        window.google.accounts.id.renderButton(signInDiv, {
          theme: "outline",
          size: "large",
        });
      }

      // Show the One Tap prompt
      window.google.accounts.id.prompt();
    }

    // Initialize OAuth token client for Sheets API
    if (window.google?.accounts?.oauth2) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error("OAuth Token Error:", tokenResponse);
            return;
          }

          console.log("Access Token:", tokenResponse.access_token);

          // Get stored ID token
          const storedIdToken = localStorage.getItem("google_id_token");
          if (storedIdToken) {
            try {
              const payload = JSON.parse(atob(storedIdToken.split(".")[1]));
              const userName = payload.name;

              // Login with both tokens
              login(storedIdToken, tokenResponse.access_token, userName);

              // Navigate to intended page or admin
              navigate(from, { replace: true });
            } catch (e) {
              console.error("Failed to process tokens", e);
            }
          }
        },
      });
    } else {
      console.warn("Google OAuth2 library not loaded");
    }
  }, [isAuthenticated, login, navigate, from]);

  const requestAccessToken = () => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    } else {
      console.error("Token client not initialized");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // If already authenticated, show user info and logout option
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome back!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You are signed in as <strong>{userName}</strong>
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => navigate("/admin")}
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md group hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            Access your rosemary oil business dashboard
          </p>
        </div>
        <div className="space-y-4">
          <div id="g_id_signin" className="flex justify-center"></div>

          <button
            onClick={requestAccessToken}
            className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google Logo"
              className="w-5 h-5 mr-2"
            />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoogleLogin;
