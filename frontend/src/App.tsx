// app

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  ThemeProvider,
  Index,
  Login,
  Register,
  GalleryIndex,
} from "@components";

function App() {
  useEffect(() => {
    document.title = "ArtChive";
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/gallery" element={<GalleryIndex />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
