import { LogoutButton } from '@components'
import { toast } from 'react-toastify'
import { useToggleTheme } from '@hooks'

export default function Index() {
    const { isDarkMode } = useToggleTheme()
    const theme = isDarkMode ? "dark" : "light"
    const handleClick = () => {
        toast.success('test')
        toast.warning('idiot')
        toast.info('wow')
        toast.error('enk!', { theme: "dark"})
        toast('uhm', {
            theme: theme
        })
    }

    return (
        <div>
            <div>homie</div>
            <button className='btn btn-secondary' onClick={handleClick}>toast test</button>
            <LogoutButton />
        </div>
    )
}