import Link from "next/link";
import { Icon } from "@/components/icon";

export default function NotFound() {
  return (
    <main id="sadrzaj" className="container not-found">
      <div className="eyebrow">404 - STRANICA NIJE PRONAĐENA</div>
      <h1>Ovaj put ne vodi kući.</h1>
      <p>
        Stranica koju tražite nije dostupna. Istražite kategorije ili se vratite na početnu
        stranicu.
      </p>
      <div className="prose-links">
        <Link href="/" className="button button-red">
          Povratak na početnu <Icon name="arrow" size={18} />
        </Link>
        <Link href="/kategorije" className="text-link">
          Istražite kategorije <Icon name="arrow" size={18} />
        </Link>
      </div>
    </main>
  );
}
