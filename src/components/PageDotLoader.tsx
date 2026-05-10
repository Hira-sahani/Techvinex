import JetraLoader from "@/components/JetraLoader";

/**
 * Page-level loader. Renders the same skeleton placeholder as JetraLoader
 * so users see content-shaped shimmer instead of a spinner.
 */
const PageDotLoader = () => <JetraLoader />;

export default PageDotLoader;
