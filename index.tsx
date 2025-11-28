
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <GoogleOAuthProvider clientId="660270935217-u1c4tntq4d5brpjr3i28c12rl0fpouol.apps.googleusercontent.com">
        <App />
    </GoogleOAuthProvider>
);
