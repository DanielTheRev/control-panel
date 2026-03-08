export class ProductFormUtils {
  static hasChanges(productData: any, originalProduct: any, deletedImages: string[]): { hasChanges: boolean, formData: FormData } {
    let changes = {
      hasChanges: false,
      formData: new FormData()
    };

    if (!originalProduct) {
      return changes;
    }

    if (productData.price !== originalProduct.prices.costPrice.inUSD) {
      console.warn(`[DEBUG] Change detected in price. New: '${productData.price}', Orig: '${originalProduct.prices.costPrice.inUSD}'`);
      changes.formData.append('price', productData.price);
      changes.hasChanges = true;
    }

    // 1. Compare Simple Fields
    const simpleFields = ['model', 'brand', 'category', 'shortDescription', 'largeDescription', 'productType', 'customProfitMargin'];
    simpleFields.forEach(field => {
      const prodVal = productData[field];
      const origVal = originalProduct[field];

      // Normalize string/undefined comparison to avoid false positives
      const normalizedProdVal = prodVal !== undefined && prodVal !== null ? String(prodVal).trim() : '';
      const normalizedOrigVal = origVal !== undefined && origVal !== null ? String(origVal).trim() : '';

      const isCustomMargin = field === 'customProfitMargin';
      const hasChanged = isCustomMargin 
        ? (normalizedProdVal !== normalizedOrigVal)
        : (prodVal !== origVal);

      if (hasChanged) {
        console.warn(`[DEBUG] Change detected in simple field: ${field}. ProdVal: '${prodVal}', OrigVal: '${origVal}'. Normalized: '${normalizedProdVal}' vs '${normalizedOrigVal}'`);
        changes.formData.append(field, prodVal !== undefined && prodVal !== null ? prodVal : '');
        changes.hasChanges = true;
      }
    });

    // 2. Compare Array Fields (features, storage)
    const arrayFields = ['features', 'storage'];
    arrayFields.forEach(field => {
      const originalArray = originalProduct[field] || [];
      const newArray = productData[field] || [];

      if (JSON.stringify(newArray) !== JSON.stringify(originalArray)) {
        console.warn(`[DEBUG] Change detected in array field: ${field}. New: '${JSON.stringify(newArray)}', Orig: '${JSON.stringify(originalArray)}'`);
        changes.formData.append(field, JSON.stringify(newArray));
        changes.hasChanges = true;
      }
    });

    // 3. Compare Variants
    const originalVariants = (originalProduct.variants || []).map((v: any) => {
      const origVar: any = {
        sku: v.sku,
        attributes: (v.attributes || []).map((a: any) => ({ key: a.key, value: a.value })),
        stock: v.stock,
        isActive: v.isActive
      };
      if (v.color && v.color.name) {
        origVar.color = { name: v.color.name, hex: v.color.hex };
      }
      return origVar;
    });
    const newVariants = (productData.variants || []).map((v: any) => {
      const variant: any = {
        sku: v.sku,
        attributes: (v.attributes || []).map((a: any) => ({ key: a.key, value: a.value })),
        stock: v.stock,
        isActive: v.isActive
      };
      if (v.color && v.color.name) {
        variant.color = { name: v.color.name, hex: v.color.hex };
      }
      return variant;
    });
    
    if (JSON.stringify(newVariants) !== JSON.stringify(originalVariants)) {
      console.warn(`[DEBUG] Change detected in variants. New: '${JSON.stringify(newVariants)}', Orig: '${JSON.stringify(originalVariants)}'`);
      changes.formData.append('variants', JSON.stringify(productData.variants || []));
      changes.hasChanges = true;
    }

    // 4. Compare Specifications (Array of Objects)
    const originalSpecs = (originalProduct.specifications || []).map((s: any) => ({ key: s.key, value: s.value }));
    const newSpecs = productData.specifications || [];

    if (JSON.stringify(newSpecs) !== JSON.stringify(originalSpecs)) {
      console.warn(`[DEBUG] Change detected in specs. New: '${JSON.stringify(newSpecs)}', Orig: '${JSON.stringify(originalSpecs)}'`);
      changes.formData.append('specifications', JSON.stringify(newSpecs));
      changes.hasChanges = true;
    }

    // 5. Compare tech-specific fields
    // 5. Compare tech-specific fields
    const techFields = ['ram', 'processor', 'screenSize', 'os'];
    techFields.forEach(field => {
      const prodVal = productData[field] !== undefined && productData[field] !== null ? String(productData[field]).trim() : '';
      const origVal = originalProduct[field] !== undefined && originalProduct[field] !== null ? String(originalProduct[field]).trim() : '';
      
      if (prodVal !== origVal) {
        console.warn(`[DEBUG] Change detected in tech field: ${field}. ProdVal: '${prodVal}', OrigVal: '${origVal}'`);
        changes.formData.append(field, productData[field]);
        changes.hasChanges = true;
      }
    });

    // 6. Compare clothing-specific fields
    const clothingSimple = ['gender', 'fit', 'material', 'sizeType', 'season'];
    clothingSimple.forEach(field => {
      const prodVal = productData[field] !== undefined && productData[field] !== null ? String(productData[field]).trim() : '';
      const origVal = originalProduct[field] !== undefined && originalProduct[field] !== null ? String(originalProduct[field]).trim() : '';
      
      if (prodVal !== origVal) {
        console.warn(`[DEBUG] Change detected in clothing field: ${field}. ProdVal: '${prodVal}', OrigVal: '${origVal}'`);
        changes.formData.append(field, productData[field]);
        changes.hasChanges = true;
      }
    });

    // Composition
    const origComp = JSON.stringify(originalProduct.composition || []);
    const newComp = JSON.stringify(productData.composition || []);
    if (newComp !== origComp) {
      console.warn(`[DEBUG] Change detected in composition. New: '${newComp}', Orig: '${origComp}'`);
      changes.formData.append('composition', newComp);
      changes.hasChanges = true;
    }

    // Care instructions
    const origCare = JSON.stringify(originalProduct.careInstructions || []);
    const newCare = JSON.stringify(productData.careInstructions || []);
    if (newCare !== origCare) {
      console.warn(`[DEBUG] Change detected in careInstructions. New: '${newCare}', Orig: '${origCare}'`);
      changes.formData.append('careInstructions', newCare);
      changes.hasChanges = true;
    }

    // 7. Handle Images
    if (productData.images && Array.isArray(productData.images)) {
      const newFiles = productData.images.filter((img: any) => img.file instanceof File);
      if (newFiles.length > 0) {
        console.warn(`[DEBUG] Change detected in images. ${newFiles.length} new files.`);
        changes.hasChanges = true;
        newFiles.forEach((img: any) => {
          changes.formData.append('images', img.file);
        });
      }
    }

    if (deletedImages.length > 0) {
      console.warn(`[DEBUG] Change detected in deletedImages.`);
      changes.hasChanges = true;
      changes.formData.append('deletedImages', JSON.stringify(deletedImages));
    }

    return changes;
  }
}
