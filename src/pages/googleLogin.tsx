import React, { useEffect, useState, useRef } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || "Client ID";
function GoogleLogin() {
  // ID token (JWT) from One Tap login for user info
  const [idToken, setIdToken] = useState<string | null>(() => {
    return localStorage.getItem("google_id_token");
  });
  const [userName, setUserName] = useState<string | null>(null);

  // OAuth Access Token for Sheets API
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("google_access_token");
  });

  const tokenClientRef = useRef<any>(null);

  useEffect(() => {
    // Decode user name from stored ID token on mount
    if (idToken) {
      try {
        const payload = JSON.parse(atob(idToken.split(".")[1]));
        setUserName(payload.name);
      } catch (e) {
        console.error("Failed to decode ID token", e);
        setUserName(null);
      }
    }

    // Initialize Google One Tap for user info ID token
    // @ts-ignore
    window.google?.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response: any) => {
        console.log("ID Token (JWT): " + response.credential);
        setIdToken(response.credential);
        localStorage.setItem("google_id_token", response.credential);

        try {
          const payload = JSON.parse(atob(response.credential.split(".")[1]));
          setUserName(payload.name);
        } catch (e) {
          console.error("Failed to decode ID token", e);
          setUserName(null);
        }
      },
    });

    // Render Google Sign-In button
    // @ts-ignore
    window.google?.accounts.id.renderButton(
      document.getElementById("g_id_signin")!,
      { theme: "outline", size: "large" }
    );

    // Show the One Tap prompt
    // @ts-ignore
    window.google?.accounts.id.prompt();

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
          setAccessToken(tokenResponse.access_token);
          localStorage.setItem(
            "google_access_token",
            tokenResponse.access_token
          );
          window.location.href = "/admin";
        },
      });
    } else {
      console.warn("Google OAuth2 library not loaded");
    }
  }, [idToken]);

  const requestAccessToken = () => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    } else {
      console.error("Token client not initialized");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("google_id_token");
    localStorage.removeItem("google_access_token");
    setIdToken(null);
    setAccessToken(null);
    setUserName(null);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <h2>Google Login</h2>
      <button
        onClick={requestAccessToken}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          backgroundColor: "#4285F4",
          color: "#fff",
          padding: "10px 16px",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          cursor: "pointer",
          marginTop: "1rem",
          fontWeight: "500",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="Google Logo"
          style={{ width: "20px", height: "20px" }}
        />
        Sign in with Google
      </button>

      {/* {!idToken && <div id="g_id_signin"></div>} */}

      {idToken && (
        <>
          <p>
            Signed in as <strong>{userName}</strong>
          </p>
          <textarea
            readOnly
            rows={5}
            style={{ width: "100%" }}
            value={idToken}
          />

          {accessToken && (
            <textarea
              readOnly
              rows={5}
              style={{ width: "100%", marginTop: "1rem" }}
              value={accessToken}
            />
          )}
          <button onClick={handleLogout} style={{ marginTop: "1rem" }}>
            Logout
          </button>
        </>
      )}
    </div>
  );
}

export default GoogleLogin;
