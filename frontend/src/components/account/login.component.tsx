import { useState, useContext } from "react";
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@context/auth-context'

export default function Login() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {
      await login(email, password)
      navigate('/home')
    } catch (error) {
      console.error('Login failed ', error)
    }
  }

  return (
    <div className='card'>
      <form action={handleLogin}>
        <input type="email" onChange={(e) => setEmail(e.target.value)} placeholder='email here...' required />
        <input type="password" onChange={(e) => setPassword(e.target.value)} placeholder='password.. ' required />
        <button type='submit' className='btn btn-primary'>Submit</button>
      </form>
    </div>
  );
}
