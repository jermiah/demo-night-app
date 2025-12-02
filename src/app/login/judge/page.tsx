import { LoginForm } from "../components/LoginForm";

export default function JudgeLoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <LoginForm role="JUDGE" />
        </div>
    );
}
