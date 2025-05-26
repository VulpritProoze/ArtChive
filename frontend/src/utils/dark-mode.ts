// utils/dark-mode

/*  Custom hook for toggling between dark mode/light mode 
**
*/

import { useState, useEffect } from 'react'

export default function useToggleDarkMode() {
    console.log('Dark mode toggle')
    const getInitMode = () => {
        const mode = localStorage.getItem('isDarkMode')
        const prefersDark = window.matchMedia("(prefers-color-scheme:dark)").matches
        
        return mode ? JSON.parse(mode) : prefersDark
    }

    const [isDarkMode, setDarkMode] = useState<boolean>(getInitMode)

    const toggleDarkMode = () => {
        setDarkMode(prev => !prev)
    }
    
    useEffect(() => {
        if (isDarkMode) {
            document.body.setAttribute('data-theme', 'dark')
        } else {
            document.body.setAttribute('data-theme', 'light')
        }
        localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode))
    }, [isDarkMode])

    return { 
        isDarkMode,
        setDarkMode,
        toggleDarkMode
    }
}