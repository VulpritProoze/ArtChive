import { useNavigate } from "react-router-dom";
import { MainLayout } from "@components/common/layout/MainLayout";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="flex flex-col justify-center items-center min-h-screen gap-6 px-4">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="text-3xl font-semibold text-base-content mt-4">
            Page Not Found
          </h2>
          <p className="text-base-content/70 mt-2 max-w-md">
            Oops! The page you're looking for doesn't exist. It might have been
            moved or deleted.
          </p>
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate("/home")}
            className="btn btn-primary"
          >
            Go to Home
          </button>
        </div>

        <div className="mt-8">
          <svg
            className="w-64 h-64 text-base-content/10"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
      </div>
    </MainLayout>
  );
}
