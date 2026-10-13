import LoginView from "@/sections/login/LoginView";

export const metadata = {
  title: "Sign In",
};

interface Props {
  searchParams: Promise<{ expired?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  // "?expired" is added when an open page found its session had ended
  const { expired } = await searchParams;
  return <LoginView sessionExpired={expired !== undefined} />;
}
