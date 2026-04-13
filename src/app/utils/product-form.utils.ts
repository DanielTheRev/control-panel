
export class ProductFormUtils {
  static hasChanges(productData: any, originalProduct: any, deletedImages: string[]): { hasChanges: boolean, formData: FormData } {
    let changes = {
      hasChanges: false,
      formData: new FormData()
    };

    if (!originalProduct) {
      return changes;
    }

    // --- PRECIO ---
    if (productData.price !== originalProduct.prices.costPrice.inUSD) {
      console.warn(`[DEBUG] Change detected in price. New: '${productData.price}', Orig: '${originalProduct.prices.costPrice.inUSD}'`);
      changes.formData.append('price', productData.price);
      changes.hasChanges = true;
    }

    const simpleFields = ['model', 'brand', 'category', 'shortDescription', 'largeDescription', 'productType', 'isActive', 'isFeatured'];
    // --- 1. CAMPOS SIMPLES ---

    // --- PROVIDER (comparar contra ._id porque originalProduct.provider es un objeto poblado) ---
    const origProviderId = originalProduct.provider?._id || '';
    const newProviderId = productData.provider || '';
    if (newProviderId !== origProviderId) {
      console.warn(`[DEBUG] Change detected in provider. New: '${newProviderId}', Orig: '${origProviderId}'`);
      changes.formData.append('provider', newProviderId);
      changes.hasChanges = true;
    }

    // --- PROFIT MARGIN 1 PAY ---
    const origMargin1Pay = originalProduct.prices?.profitMargin1Pay;
    const newMargin1Pay = productData.customProfitMargin1Pay;
    if (String(newMargin1Pay ?? '') !== String(origMargin1Pay ?? '')) {
      console.warn(`[DEBUG] Change detected in profitMargin1Pay. New: '${newMargin1Pay}', Orig: '${origMargin1Pay}'`);
      changes.formData.append('customProfitMargin1Pay', newMargin1Pay ?? '');
      changes.hasChanges = true;
    }

    // --- PROFIT MARGIN INSTALLMENTS ---
    const origMarginInstallments = originalProduct.prices?.profitMarginInstallments;
    const newMarginInstallments = productData.customProfitMarginInstallments;
    if (String(newMarginInstallments ?? '') !== String(origMarginInstallments ?? '')) {
      console.warn(`[DEBUG] Change detected in profitMarginInstallments. New: '${newMarginInstallments}', Orig: '${origMarginInstallments}'`);
      changes.formData.append('customProfitMarginInstallments', newMarginInstallments ?? '');
      changes.hasChanges = true;
    }

    simpleFields.forEach(field => {
      const prodVal = productData[field];
      let origVal = originalProduct[field];

      if (field === 'isActive' && origVal === undefined) origVal = true;
      if (field === 'isFeatured' && origVal === undefined) origVal = false;

      const normalizedProdVal = prodVal !== undefined && prodVal !== null ? String(prodVal).trim() : '';
      const normalizedOrigVal = origVal !== undefined && origVal !== null ? String(origVal).trim() : '';

      if (normalizedProdVal !== normalizedOrigVal) {
        console.warn(`[DEBUG] Change detected in simple field: ${field}. ProdVal: '${prodVal}', OrigVal: '${origVal}'. Normalized: '${normalizedProdVal}' vs '${normalizedOrigVal}'`);
        changes.formData.append(field, prodVal !== undefined && prodVal !== null ? prodVal : '');
        changes.hasChanges = true;
      }
    });

    // --- 2. CAMPOS ARRAY ---
    const arrayFields = ['features', 'storage', 'connectivity'];
    arrayFields.forEach(field => {
      const originalArray = originalProduct[field] || [];
      const newArray = productData[field] || [];

      if (JSON.stringify(newArray) !== JSON.stringify(originalArray)) {
        console.warn(`[DEBUG] Change detected in array field: ${field}. New: '${JSON.stringify(newArray)}', Orig: '${JSON.stringify(originalArray)}'`);
        changes.formData.append(field, JSON.stringify(newArray));
        changes.hasChanges = true;
      }
    });

    // --- 3. VARIANTES (CON SOPORTE POLIMÓRFICO) ---

    // Función auxiliar para saber qué índice le corresponde a la URL vieja
    const originalImageUrls = (originalProduct.images || []).map((img: any) => img.url || img);

    const originalVariants = (originalProduct.variants || []).map((v: any) => {
      const origVar: any = {
        sku: v.sku,
        stock: v.stock,
        isActive: v.isActive
      };

      // TRADUCCIÓN DE IMAGEN: Si la variante original tenía foto, buscamos su índice
      if (v.imageReference?.url) {
        const foundIndex = originalImageUrls.indexOf(v.imageReference.url);
        origVar.imageIndex = foundIndex !== -1 ? foundIndex : null;
      } else {
        origVar.imageIndex = null;
      }

      // Magia Polimórfica
      if (v.size !== undefined) origVar.size = v.size; // Es Ropa
      if (v.attributes !== undefined) origVar.attributes = v.attributes.map((a: any) => ({ key: a.key, value: a.value })); // Es Tech

      if (v.color && v.color.name) {
        origVar.color = { name: v.color.name, hex: v.color.hex };
      }
      return origVar;
    });

    const newVariants = (productData.variants || []).map((v: any) => {
      const variant: any = {
        sku: v.sku,
        stock: v.stock,
        isActive: v.isActive,
        // Agregamos el imageIndex que viene del frontend (o null si no hay)
        imageIndex: v.imageIndex !== undefined ? v.imageIndex : null
      };

      // Magia Polimórfica
      if (v.size !== undefined) variant.size = v.size;
      if (v.attributes !== undefined) variant.attributes = v.attributes.map((a: any) => ({ key: a.key, value: a.value }));

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

    // --- 4. ESPECIFICACIONES ---
    const originalSpecs = (originalProduct.specifications || []).map((s: any) => ({ key: s.key, value: s.value }));
    const newSpecs = productData.specifications || [];

    if (JSON.stringify(newSpecs) !== JSON.stringify(originalSpecs)) {
      console.warn(`[DEBUG] Change detected in specs. New: '${JSON.stringify(newSpecs)}', Orig: '${JSON.stringify(originalSpecs)}'`);
      changes.formData.append('specifications', JSON.stringify(newSpecs));
      changes.hasChanges = true;
    }

    // --- 5. CAMPOS ESPECÍFICOS DE TECH ---
    const techFields = ['ram', 'processor', 'screenSize', 'os'];
    techFields.forEach(field => {
      // Evitamos el .trim() si el valor no es un string (prevención de bugs futuros)
      const prodVal = productData[field] !== undefined && productData[field] !== null ? String(productData[field]) : '';
      const origVal = originalProduct[field] !== undefined && originalProduct[field] !== null ? String(originalProduct[field]) : '';

      if (prodVal !== origVal) {
        console.warn(`[DEBUG] Change detected in tech field: ${field}. ProdVal: '${prodVal}', OrigVal: '${origVal}'`);
        changes.formData.append(field, productData[field] || '');
        changes.hasChanges = true;
      }
    });

    // --- 6. CAMPOS ESPECÍFICOS DE ROPA ---
    const clothingSimple = ['gender', 'fit', 'material', 'sizeType', 'season'];
    clothingSimple.forEach(field => {
      const prodVal = productData[field] !== undefined && productData[field] !== null ? String(productData[field]) : '';
      const origVal = originalProduct[field] !== undefined && originalProduct[field] !== null ? String(originalProduct[field]) : '';

      if (prodVal !== origVal) {
        console.warn(`[DEBUG] Change detected in clothing field: ${field}. ProdVal: '${prodVal}', OrigVal: '${origVal}'`);
        changes.formData.append(field, productData[field] || '');
        changes.hasChanges = true;
      }
    });

    // Composition & Care
    const origComp = JSON.stringify(originalProduct.composition || []);
    const newComp = JSON.stringify(productData.composition || []);
    if (newComp !== origComp) {
      console.warn(`[DEBUG] Change detected in composition. New: '${newComp}', Orig: '${origComp}'`);
      changes.formData.append('composition', newComp);
      changes.hasChanges = true;
    }

    const origCare = JSON.stringify(originalProduct.careInstructions || []);
    const newCare = JSON.stringify(productData.careInstructions || []);
    if (newCare !== origCare) {
      console.warn(`[DEBUG] Change detected in careInstructions. New: '${newCare}', Orig: '${origCare}'`);
      changes.formData.append('careInstructions', newCare);
      changes.hasChanges = true;
    }

    // --- 7. IMÁGENES ---
    if (productData.images && Array.isArray(productData.images)) {
      const newFiles = productData.images.filter((img: any) => img.file instanceof File);
      if (newFiles.length > 0) {
        console.warn(`[DEBUG] Change detected in images. ${newFiles.length} new files.`);
        changes.hasChanges = true;
        newFiles.forEach((img: any) => {
          changes.formData.append('images', img.file);
        });
      }

      const originalImageUrls = (originalProduct.images || []).map((img: any) => img.url);
      const currentImageUrls = productData.images.map((img: any) => img.link);

      if (JSON.stringify(originalImageUrls) !== JSON.stringify(currentImageUrls)) {
        console.warn(`[DEBUG] Change detected in image order/content.`);
        changes.hasChanges = true;
        changes.formData.append('imagesOrder', JSON.stringify(currentImageUrls));
      }
    }

    if (deletedImages.length > 0) {
      console.warn(`[DEBUG] Change detected in deletedImages.`);
      changes.hasChanges = true;
      changes.formData.append('deletedImages', JSON.stringify(deletedImages));
    }

    // --- 8. SEO ---
    const originalSeo = originalProduct.seo || {};
    const newSeo = productData.seo || {};

    const originalImageUrl = originalSeo.metaImage?.url || '';
    const newSeoImage = newSeo.metaImage;

    const seoImageChanged =
      newSeoImage instanceof File ||
      (typeof newSeoImage === 'string' && newSeoImage !== originalImageUrl) ||
      (newSeoImage === null && originalImageUrl !== '');

    const normalizedOrigSeo = {
      metaTitle: (originalSeo.metaTitle || '').trim(),
      metaDescription: (originalSeo.metaDescription || '').trim(),
    };

    const normalizedNewSeo = {
      metaTitle: (newSeo.metaTitle || '').trim(),
      metaDescription: (newSeo.metaDescription || '').trim(),
    };

    const seoTextsChanged = JSON.stringify(normalizedNewSeo) !== JSON.stringify(normalizedOrigSeo);

    if (seoTextsChanged || seoImageChanged) {
      console.warn(`[DEBUG] Change detected in SEO. Texts: ${seoTextsChanged}, Image: ${seoImageChanged}`);

      const seoData: any = {
        metaTitle: newSeo.metaTitle || '',
        metaDescription: newSeo.metaDescription || '',
      };

      if (typeof newSeoImage === 'string' && newSeoImage.startsWith('http')) {
        seoData.metaImage = { url: newSeoImage, public_id: originalSeo.metaImage?.public_id || '' };
      }

      changes.formData.append('seo', JSON.stringify(seoData));

      if (newSeoImage instanceof File) {
        changes.formData.append('seoImage', newSeoImage);
      }
      changes.hasChanges = true;
    }

    return changes;
  }
}