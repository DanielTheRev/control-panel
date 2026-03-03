export class ProductFormUtils {
  static hasChanges(productData: any, originalProduct: any, deletedImages: string[]): { hasChanges: boolean, formData: FormData } {
    let changes = {
      hasChanges: false,
      formData: new FormData()
    };

    if (!originalProduct) {
        return changes;
    }

    if (productData.price !== originalProduct.prices.costPrice) {
      changes.formData.append('price', productData.price);
      changes.hasChanges = true;
    }

    // 1. Compare Simple Fields
    const simpleFields = ['model', 'brand', 'category', 'shortDescription', 'largeDescription', 'productType'];
    simpleFields.forEach(field => {
      if (productData[field] !== originalProduct[field]) {
        changes.formData.append(field, productData[field]);
        changes.hasChanges = true;
      }
    });

    // 2. Compare Array Fields (features, storage)
    const arrayFields = ['features', 'storage'];
    arrayFields.forEach(field => {
      const originalArray = originalProduct[field] || [];
      const newArray = productData[field] || [];

      if (JSON.stringify(newArray) !== JSON.stringify(originalArray)) {
        changes.formData.append(field, JSON.stringify(newArray));
        changes.hasChanges = true;
      }
    });

    // 3. Compare Variants
    const originalVariants = (originalProduct.variants || []).map((v: any) => ({
      sku: v.sku,
      attributes: v.attributes,
      color: v.color,
      stock: v.stock,
      isActive: v.isActive
    }));
    const newVariants = productData.variants || [];
    if (JSON.stringify(newVariants) !== JSON.stringify(originalVariants)) {
      changes.formData.append('variants', JSON.stringify(newVariants));
      changes.hasChanges = true;
    }

    // 4. Compare Specifications (Array of Objects)
    const originalSpecs = (originalProduct.specifications || []).map((s: any) => ({ key: s.key, value: s.value }));
    const newSpecs = productData.specifications || [];

    if (JSON.stringify(newSpecs) !== JSON.stringify(originalSpecs)) {
      changes.formData.append('specifications', JSON.stringify(newSpecs));
      changes.hasChanges = true;
    }

    // 5. Compare tech-specific fields
    const techFields = ['ram', 'processor', 'screenSize', 'os'];
    techFields.forEach(field => {
      if (productData[field] !== undefined && productData[field] !== (originalProduct[field] || '')) {
        changes.formData.append(field, productData[field]);
        changes.hasChanges = true;
      }
    });

    // 6. Compare clothing-specific fields
    const clothingSimple = ['gender', 'fit', 'material', 'sizeType', 'season'];
    clothingSimple.forEach(field => {
      if (productData[field] !== undefined && productData[field] !== (originalProduct[field] || '')) {
        changes.formData.append(field, productData[field]);
        changes.hasChanges = true;
      }
    });

    // Composition
    const origComp = JSON.stringify(originalProduct.composition || []);
    const newComp = JSON.stringify(productData.composition || []);
    if (newComp !== origComp) {
      changes.formData.append('composition', newComp);
      changes.hasChanges = true;
    }

    // Care instructions
    const origCare = JSON.stringify(originalProduct.careInstructions || []);
    const newCare = JSON.stringify(productData.careInstructions || []);
    if (newCare !== origCare) {
      changes.formData.append('careInstructions', newCare);
      changes.hasChanges = true;
    }

    // 7. Handle Images
    if (productData.images && Array.isArray(productData.images)) {
        const newFiles = productData.images.filter((img: any) => img.file instanceof File);
        if (newFiles.length > 0) {
        changes.hasChanges = true;
        newFiles.forEach((img: any) => {
            changes.formData.append('images', img.file);
        });
        }
    }

    if (deletedImages.length > 0) {
      changes.hasChanges = true;
      changes.formData.append('deletedImages', JSON.stringify(deletedImages));
    }

    return changes;
  }
}
