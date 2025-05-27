// app

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Index, Login, Register } from "@app/index";
import { ThemeProvider } from "@src/components";
import "@src/assets/fontawesome";

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
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
