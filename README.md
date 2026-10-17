
# Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project and configure the OAuth consent screen. Add your account as a test user while the app is in testing mode.
2. Create an OAuth client ID with application type **Web application**.
3. Add the frontend origin to **Authorized JavaScript origins**:
   - Local development: `http://localhost:5173`
   - Production: `https://yatrahub-9dw1.onrender.com`
4. Add this URL to **Authorized redirect URIs**:
   - Local development: `http://localhost:3000/api/v1/users/google/callback`
   - Production: `https://yatrahub-9dw1.onrender.com/api/v1/users/google/callback`
5. Put the OAuth client ID and secret in `config.env` (or your deployment's environment variables):

   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/users/google/callback
   CLIENT_URL=http://localhost:5173
   ```

   `GOOGLE_REDIRECT_URI` must exactly match the authorized redirect URI. `CLIENT_URL` is where users return after signing in; set it to your production app URL. The current app serves the frontend and API from the same origin. For the Render deployment, set `GOOGLE_REDIRECT_URI` to `https://yatrahub-9dw1.onrender.com/api/v1/users/google/callback` and `CLIENT_URL` and `APP_URL` to `https://yatrahub-9dw1.onrender.com` in Render's environment settings.
6. Restart the server. The **Continue with Google** option is available on both the login and signup pages. Google verifies the identity on the server; a first-time user is created automatically, and a verified matching email can sign in to an existing account.

Keep the OAuth client secret private and out of source control. Use HTTPS callback and frontend URLs in production.
