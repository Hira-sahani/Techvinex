import TechvinexLoader from "@/components/TechvinexLoader";

/**
 * Page-level loader. Renders the same skeleton placeholder as TechvinexLoader
 * so users see content-shaped shimmer instead of a spinner.
 */
const PageDotLoader = () => <TechvinexLoader />;

export default PageDotLoader;
