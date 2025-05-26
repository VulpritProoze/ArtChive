import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faSignInAlt } from "@fortawesome/free-solid-svg-icons";
import { faGoogle, faGithub } from "@fortawesome/free-brands-svg-icons";

export default function Login() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="text-center mb-6">
              <motion.div
                whileHover={{ rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                className="inline-block mb-4"
              >
                <img 
                  src="favicon/favicon.ico" 
                  alt="ArtChive Logo" 
                  className="w-16 h-16"
                />
              </motion.div>
              <h2 className="text-2xl font-bold">Welcome back to ArtChive</h2>
              <p className="text-base-content/70">Sign in to continue your creative journey</p>
            </div>

            <form className="space-y-4">
              <div className="form-control">
                <label className="label" htmlFor="email">
                  <span className="label-text">Email</span>
                </label>
                <label className="input-group">
                  <span className="bg-base-200">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="input input-bordered w-full"
                    required
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label" htmlFor="password">
                  <span className="label-text">Password</span>
                </label>
                <label className="input-group">
                  <span className="bg-base-200">
                    <FontAwesomeIcon icon={faLock} />
                  </span>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered w-full"
                    required
                  />
                </label>
                <label className="label">
                  <a href="#" className="label-text-alt link link-hover">Forgot password?</a>
                </label>
              </div>

              <motion.button
                type="submit"
                className="btn btn-primary w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
                Sign In
              </motion.button>
            </form>

            <div className="divider">or continue with</div>

            <div className="flex gap-4 justify-center">
              <motion.button
                type="button"
                className="btn btn-outline"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <FontAwesomeIcon icon={faGoogle} className="mr-2" />
                Google
              </motion.button>
              <motion.button
                type="button"
                className="btn btn-outline"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <FontAwesomeIcon icon={faGithub} className="mr-2" />
                GitHub
              </motion.button>
            </div>

            <div className="text-center mt-6">
              <p className="text-base-content/70">
                Don't have an account?{' '}
                <a href="#" className="link link-primary font-medium">
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}