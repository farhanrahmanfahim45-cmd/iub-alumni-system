import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { ArrowLeft } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 pt-20">
      <span className="font-display text-6xl font-bold text-purple-200">404</span>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-body max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Button
        variant="primary"
        icon={<ArrowLeft size={16} />}
        iconPosition="left"
        onClick={() => navigate("/")}
        className="mt-6"
      >
        Back to Home
      </Button>
    </div>
  );
}
