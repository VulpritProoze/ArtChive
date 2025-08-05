import { useNavigate } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from 'react-hook-form'

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(32, "Password must be less than 32 characters"),
  });

  type FormFields = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }, // destructuring formState
  } = useForm<FormFields>({
    // defaultValues: {
    //   email: "johndoe@gmail.com",
    // },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      await login(data.email, data.password);
      navigate("/home");
    } catch (error) {
      setError("root", {
        message: error,
      });
      console.error("Login failed ", error);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <form onSubmit={handleSubmit(onSubmit)}>
          <input type="text" {...register("email")} placeholder="email here..." />
          {/* errors.email etc. is the element that prints out the validation errors
          in the client */}
          {errors.email && (
            // validation element
            <div className="text-red-500">{errors.email.message}</div>
          )}
          <input type="password" {...register("password")} placeholder="password.. " />
          {errors.password && (
            <div className="text-red-500">{errors.password.message}</div>
          )}
          <button type="submit" className="btn btn-primary">
            Submit
          </button>
          {errors.root && (
            <div className="text-red-500">{errors.root.message}</div>
          )}
        </form>
      </div>
    </div>
  );
}
