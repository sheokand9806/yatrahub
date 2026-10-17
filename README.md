
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

# YatraHub chatbot setup

The floating travel assistant is displayed on every page. Its requests go through the Express API; the Gemini API key is never sent to the browser.

1. Create an API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. For local development, put the key in the ignored `config.env` file:

   ```env
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. Restart the server with `npm run dev` and use the chat button in the lower-right corner. If the key is missing, the widget displays a configuration message.
4. For Render, add `GEMINI_API_KEY` and `GEMINI_MODEL` under **Dashboard → your service → Environment**. Save the changes and wait for the service to redeploy. Do not commit or expose the API key in frontend code.

The chatbot endpoint allows up to 10 requests per IP per 10 minutes and sends a bounded conversation history to Gemini. Model choice can be changed using `GEMINI_MODEL` if needed.

If the assistant reports a provider error, check the server logs and verify the Gemini key, enabled API, quota, and model name in the server environment. Chat history sent to Gemini starts with the first user message; the UI greeting is not included.
