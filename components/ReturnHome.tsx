import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ReturnHome() {
  return (
    <Link
      href="/"
      className="absolute left-8 top-8 p-2 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group"
    >
      <ChevronLeft size={16} />
      Back
    </Link>
  );
}
