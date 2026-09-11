import { products as demoProducts } from "~/data/products";

export function useStoreProducts() {
  const config = useRuntimeConfig();
  const categorySlugs = {
    collier: "colliers",
    colliers: "colliers",
    boucle: "boucles",
    boucles: "boucles",
    bracelet: "bracelets",
    bracelets: "bracelets",
    bague: "bagues",
    bagues: "bagues",
  };

  const fallbackDescription =
    "Un bijou Maison JLA imaginé pour illuminer le quotidien.";

  const getDescriptionText = (description) => {
    if (typeof description === "string")
      return description.trim() || fallbackDescription;
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

  const categorySlugFor = (category) => {
    const normalized = String(category || "Bijou")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    return categorySlugs[normalized] || normalized;
  };

  const normalizeProduct = (product) => {
    const imageSources = (product.images || [])
      .map((image) => image?.url)
      .filter(Boolean);
    const sources = imageSources.length
      ? imageSources
      : [product.image || demoProducts[0].image];
    const images = sources.map((source) =>
      source.startsWith("/") ? `${config.public.strapiUrl}${source}` : source,
    );
    const stock = Number(product.stock);
    const safety = product.productSafety || {};
    const hasSafetyInformation = [
      safety.productReference,
      safety.mainMaterials,
      safety.manufacturerBrand,
      safety.manufacturerCompany,
      safety.manufacturerPostalAddress,
      safety.manufacturerEmail,
      safety.safetyWarnings,
    ].every((field) => typeof field === "string" && field.trim());

    return {
      id: product.documentId || product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      stock: Number.isInteger(stock) && stock >= 0 ? stock : 0,
      description: getDescriptionText(product.description),
      category: String(product.category || "Bijou").trim(),
      categorySlug: categorySlugFor(product.category),
      image: images[0],
      images,
      safety: hasSafetyInformation
        ? {
            productReference: safety.productReference.trim(),
            batchNumber: String(safety.batchNumber || "").trim(),
            mainMaterials: safety.mainMaterials.trim(),
            manufacturerBrand: safety.manufacturerBrand.trim(),
            manufacturerCompany: safety.manufacturerCompany.trim(),
            manufacturerPostalAddress: safety.manufacturerPostalAddress.trim(),
            manufacturerEmail: safety.manufacturerEmail.trim(),
            safetyWarnings: safety.safetyWarnings.trim(),
          }
        : null,
    };
  };

  const demoCatalog = () =>
    demoProducts.map((product, index) =>
      normalizeProduct({
        ...product,
        stock: 10,
        productSafety: {
          productReference: `DEMO-${index + 1}`,
          mainMaterials: "Acier inoxydable.",
          manufacturerBrand: "Maison JLA",
          manufacturerCompany: "Touret Julia",
          manufacturerPostalAddress: "5 Rue Joliot-Curie\n80200 Doingt\nFrance",
          manufacturerEmail: "contact@maisonjla.fr",
          safetyWarnings: "Démonstration locale uniquement.",
        },
      }),
    );

  const listProducts = async () => {
    try {
      const { find } = useStrapi();
      const response = await find("products", {
        fields: ["name", "slug", "price", "stock", "category", "description"],
        populate: {
          images: { fields: ["url"] },
          productSafety: {
            fields: [
              "productReference",
              "batchNumber",
              "mainMaterials",
              "manufacturerBrand",
              "manufacturerCompany",
              "manufacturerPostalAddress",
              "manufacturerEmail",
              "safetyWarnings",
            ],
          },
        },
        pagination: { pageSize: 100 },
      });

      return response.data?.length
        ? response.data.map(normalizeProduct).filter((product) => product.safety)
        : import.meta.dev
          ? demoCatalog()
          : [];
    } catch {
      return import.meta.dev ? demoCatalog() : [];
    }
  };

  return { listProducts, normalizeProduct };
}
