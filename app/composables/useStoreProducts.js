import { products as demoProducts } from "~/data/products";

export function useStoreProducts() {
  const config = useRuntimeConfig();

  const fallbackDescription =
    "Un bijou Maison JLA imaginé pour illuminer le quotidien.";

  const getDescriptionText = (description) => {
    if (typeof description === "string") return description.trim() || fallbackDescription;
    if (!Array.isArray(description)) return fallbackDescription;

    const readNode = (node) => {
      if (typeof node?.text === "string") return node.text;
      if (!Array.isArray(node?.children)) return "";
      return node.children.map(readNode).join("");
    };

    const text = description
      .map(readNode)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .join("\n");

    return text || fallbackDescription;
  };

  const normalizeProduct = (product) => {
    const source =
      product.images?.[0]?.url || product.image || demoProducts[0].image;
    const stock = Number(product.stock);

    return {
      id: product.documentId || product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      stock: Number.isInteger(stock) && stock >= 0 ? stock : 0,
      description: getDescriptionText(product.description),
      category: String(product.category || "Bijou").trim(),
      categorySlug: String(product.category || "Bijou")
        .trim()
        .toLowerCase(),
      image: source.startsWith("/")
        ? `${config.public.strapiUrl}${source}`
        : source,
    };
  };

  const demoCatalog = () =>
    demoProducts.map((product) => normalizeProduct({ ...product, stock: 10 }));

  const listProducts = async () => {
    try {
      const { find } = useStrapi();
      const response = await find("products", {
        fields: ["name", "slug", "price", "stock", "category", "description"],
        populate: ["images"],
        pagination: { pageSize: 100 },
      });

      return response.data?.length
        ? response.data.map(normalizeProduct)
        : demoCatalog();
    } catch {
      return demoCatalog();
    }
  };

  return { listProducts, normalizeProduct };
}
