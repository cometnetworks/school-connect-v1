import Link from "next/link";
import Logo from "./Logo";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-elevated">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo size="md" />
          <p className="mt-4 max-w-sm text-sm text-fg-muted">
            {site.description}
          </p>
          <p className="mt-4 text-xs text-fg-muted">
            Piloto en {site.pilotCity}.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-fg">Producto</h4>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li><Link href="#como-funciona" className="hover:text-fg">Cómo funciona</Link></li>
            <li><Link href="#para-padres" className="hover:text-fg">Para padres</Link></li>
            <li><Link href="#precios" className="hover:text-fg">Precios</Link></li>
            <li><Link href="#faq" className="hover:text-fg">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-fg">Legal</h4>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li><Link href="/privacidad" className="hover:text-fg">Aviso de privacidad</Link></li>
            <li><Link href="/terminos" className="hover:text-fg">Términos</Link></li>
            <li>
              <a href={`mailto:${site.contactEmail}`} className="hover:text-fg">
                {site.contactEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-fg-muted">
          © {new Date().getFullYear()} {site.name}. Hecho con cariño desde Yucatán.
        </p>
      </div>
    </footer>
  );
}
