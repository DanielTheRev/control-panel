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
    const simpleFields = ['model', 'brand', 'category', 'shortDescription', 'largeDescription'];
    simpleFields.forEach(field => {
      if (productData[field] !== originalProduct[field]) {
        changes.formData.append(field, productData[field]);
        changes.hasChanges = true;
      }
    });

    // 2. Compare Arrays (Colors, Storage, Features)
    const arrayFields = ['colors', 'storage', 'features'];
    arrayFields.forEach(field => {
      // Ensure we compare arrays, defaulting to empty array if null/undefined
      const originalArray = originalProduct[field] || [];
      const newArray = productData[field] || [];
      
      if (JSON.stringify(newArray) !== JSON.stringify(originalArray)) {
        changes.formData.append(field, JSON.stringify(newArray));
        changes.hasChanges = true;
      }
    });

    // 3. Compare Specifications (Array of Objects)
    const originalSpecs = (originalProduct.specifications || []).map((s: any) => ({ key: s.key, value: s.value }));
    // Ensure we ignore internal Angular properties like _key or id if they exist, but here we rebuild the object
    const newSpecs = productData.specifications || [];
    
    if (JSON.stringify(newSpecs) !== JSON.stringify(originalSpecs)) {
      changes.formData.append('specifications', JSON.stringify(newSpecs));
      changes.hasChanges = true;
    }

    // 4. Handle Images
    // Only append NEW images (files)
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
