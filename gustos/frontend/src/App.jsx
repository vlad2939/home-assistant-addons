import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppProvider } from "./AppContext.jsx";
import Layout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import RecipePage from "./pages/RecipePage.jsx";
import RecipeEditPage from "./pages/RecipeEditPage.jsx";
import ImportPage from "./pages/ImportPage.jsx";
import { NotFoundPage } from "./pages/Placeholders.jsx";

// Router „cu date”, necesar pentru avertizarea la părăsirea formularului cu modificări nesalvate.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "retete", element: <RecipesPage /> },
      { path: "reteta/:id", element: <RecipePage /> },
      { path: "adauga", element: <RecipeEditPage key="nou" /> },
      { path: "editeaza/:id", element: <RecipeEditPage key="edit" /> },
      { path: "import", element: <ImportPage /> },
      { path: "setari", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
