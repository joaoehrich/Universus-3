import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import UniverseBackground from "./components/UniverseBackground";

function App() {
  return (
    <UniverseBackground>
      <RouterProvider router={router} />
    </UniverseBackground>
  );
}

export default App;