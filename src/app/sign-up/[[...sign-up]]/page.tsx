import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c1c1e",
      }}
    >
      <SignUp
        forceRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorPrimary: "#d4a843",
            colorBackground: "#242426",
            colorInput: "#2c2c2e",
            colorInputForeground: "#f5f5f5",
            colorForeground: "#f5f5f5",
            colorMutedForeground: "#9ca3af",
            colorNeutral: "#6b6b6b",
            borderRadius: "0px",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
          },
          elements: {
            card: {
              boxShadow: "none",
              border: "1px solid #2a2a2c",
              background: "#242426",
            },
            headerTitle: {
              fontFamily: "DM Sans, sans-serif",
              fontWeight: "700",
              letterSpacing: "-0.02em",
              color: "#f5f5f5",
            },
            headerSubtitle: {
              color: "#9ca3af",
            },
            socialButtonsBlockButton: {
              border: "1px solid #2a2a2c",
              background: "#2c2c2e",
              color: "#f5f5f5",
            },
            socialButtonsBlockButtonText: {
              color: "#f5f5f5",
            },
            dividerLine: {
              background: "#2a2a2c",
            },
            dividerText: {
              color: "#6b6b6b",
            },
            formFieldLabel: {
              color: "#9ca3af",
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            },
            formFieldInput: {
              background: "#2c2c2e",
              border: "1px solid #2a2a2c",
              color: "#f5f5f5",
              borderRadius: "0px",
            },
            formButtonPrimary: {
              background: "#d4a843",
              color: "#1c1c1e",
              fontWeight: "600",
              borderRadius: "0px",
              border: "none",
            },
            footerActionLink: {
              color: "#d4a843",
            },
            identityPreviewText: {
              color: "#f5f5f5",
            },
            identityPreviewEditButton: {
              color: "#d4a843",
            },
            formResendCodeLink: {
              color: "#d4a843",
            },
            otpCodeFieldInput: {
              background: "#2c2c2e",
              border: "1px solid #2a2a2c",
              color: "#f5f5f5",
            },
            footer: {
              background: "#1e1e20",
              borderTop: "1px solid #2a2a2c",
            },
            footerActionText: {
              color: "#9ca3af",
            },
          },
        }}
      />
    </div>
  );
}
