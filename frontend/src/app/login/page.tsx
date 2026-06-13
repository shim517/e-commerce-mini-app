import LoginForm from '@/components/auth/LoginForm';

export const metadata = { title: 'Login — E-Commerce' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <LoginForm />
    </main>
  );
}
