// app

import { useEffect } from 'react'
import { Header, Footer, Index } from '@app/index'
import '@src/assets/fontawesome'

function App() {

  useEffect(() => {
    document.title = 'ArtChive'
  }, [])

  return (
    <>
      <Header />
      <Index />
      <Footer />
    </>
  )
}

export default App
