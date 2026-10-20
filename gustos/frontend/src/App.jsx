import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppProvider } from "./AppContext.jsx";
import Layout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import RecipePage from "./pages/RecipePage.jsx";
import RecipeEditPage from "./pages/RecipeEditPage.jsx";
import ImportPage from "./pages/ImportPage.jsx";
import MenusPage from "./pages/MenusPage.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import MenuEditPage from "./pages/MenuEditPage.jsx";
import ShoppingPage from "./pages/ShoppingPage.jsx";
import { PrintMenu, PrintRecipe, PrintShopping } from "./pages/PrintPages.jsx";
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
      { path: "meniu", element: <MenusPage /> },
      { path: "meniu/nou", element: <MenuEditPage key="nou" /> },
      { path: "meniu/:id", element: <MenuPage /> },
      { path: "meniu/:id/editeaza", element: <MenuEditPage key="edit" /> },
      { path: "cumparaturi", element: <ShoppingPage /> },
      { path: "setari", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  // paginile de tipar / PDF, fără bara de sus și panoul cu categorii
  { path: "tipar/reteta/:id", element: <PrintRecipe /> },
  { path: "tipar/meniu/:id", element: <PrintMenu /> },
  { path: "tipar/cumparaturi", element: <PrintShopping /> },
]);

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
