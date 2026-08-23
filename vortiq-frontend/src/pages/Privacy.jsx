export default function Privacy() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", lineHeight: "1.6" }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: August 2026</em></p>

      <p>Vortiq ("we", "our", "us") provides an AI-powered meeting and productivity assistant that integrates with Google Workspace services (Calendar, Gmail, and Drive) to help users manage meetings, schedules, and related content.</p>

      <h2>1. Information We Collect</h2>
      <p>When you sign in with Google, we collect and store:</p>
      <ul>
        <li>Your name and email address (from your Google profile)</li>
        <li>Google OAuth access and refresh tokens, stored securely and encrypted, used solely to access the Google services you've authorized</li>
        <li>Calendar event data you choose to view or create through Vortiq</li>
        <li>Meeting transcriptions and related content you generate within the app</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To authenticate you and maintain your account</li>
        <li>To display and manage your Google Calendar events within Vortiq</li>
        <li>To compose and send emails via Gmail on your explicit request</li>
        <li>To create and access files in Google Drive that you specifically authorize Vortiq to manage</li>
        <li>To provide meeting transcription and AI-assisted features you use within the app</li>
      </ul>

      <h2>3. Data Storage and Security</h2>
      <p>Your data is stored in an encrypted PostgreSQL database. Google OAuth tokens are encrypted at rest. We do not sell, rent, or share your personal data with third parties for advertising purposes.</p>

      <h2>4. Google API Services User Data Policy</h2>
      <p>Vortiq's use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>

      <h2>5. Data Retention and Deletion</h2>
      <p>You may revoke Vortiq's access to your Google account at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Google Account permissions page</a>. You may request deletion of your Vortiq account and associated data by contacting us at the email below.</p>

      <h2>6. Third-Party Sharing</h2>
      <p>We do not share your Google user data with third parties, except as required to operate core functionality (e.g. our AI processing provider, Groq, used only to generate responses within your active session) or as required by law.</p>

      <h2>7. Contact</h2>
      <p>Questions about this policy can be sent to: <strong>[YOUR SUPPORT EMAIL HERE]</strong></p>
    </div>
  );
}