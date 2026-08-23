import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 20px", textAlign: "center", lineHeight: "1.6" }}>
      <h1>Vortiq</h1>
      <p style={{ fontSize: "1.2rem", margin: "20px 0" }}>
        Vortiq is an AI-powered meeting assistant that helps you schedule meetings, 
        manage your calendar, and generate meeting transcriptions — all in one place.
      </p>
      <p>
        Vortiq integrates with Google Calendar, Gmail, and Google Drive to bring your 
        meetings and notes together automatically.
      </p>
      <div style={{ marginTop: "40px" }}>
        <Link to="/login" style={{ marginRight: "20px" }}>Log In</Link>
        <Link to="/register">Sign Up</Link>
      </div>
      <div style={{ marginTop: "60px", fontSize: "0.9rem" }}>
        <Link to="/privacy" style={{ marginRight: "20px" }}>Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
      </div>
    </div>
  );
}