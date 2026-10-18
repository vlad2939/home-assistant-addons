import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Pagina nu există" />
      <Link to="/" className="font-medium text-accent hover:underline">
        Înapoi la Acasă
      </Link>
    </>
  );
}
