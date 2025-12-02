import { LoginForm } from "../components/LoginForm";

export default function AudienceLoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <LoginForm role="AUDIENCE" />
        </div>
    );
}
