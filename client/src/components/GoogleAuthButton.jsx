export default function GoogleAuthButton() {
  return (
    <div className="google-auth">
      <div className="google-auth__divider"><span>or</span></div>
      <a className="btn btn--google" href="/api/v1/users/google">
        <span className="google-auth__icon" aria-hidden="true">G</span>
        Continue with Google
      </a>
    </div>
  );
}
