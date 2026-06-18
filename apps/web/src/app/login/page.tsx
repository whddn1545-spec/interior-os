import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">InteriorOS</h1>
          <p className="text-gray-500 mt-2">인테리어 AI 업무 자동화</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
