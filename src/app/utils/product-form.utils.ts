
export class ProductFormUtils {
  static hasChanges(productData: any, originalProduct: any, deletedImages: string[]): { hasChanges: boolean, formData: FormData } {
    let changes = {
      hasChanges: false,
      formData: new FormData()
    };

    if (!originalProduct) {
      return changes;
    }

    // =============================================
    // --- BLOQUE DE PRICING (se envía completo) ---
    // =============================================
    // Si CUALQUIER campo de pricing cambió, enviamos TODOS los campos
    // para que el backend tenga el payload completo para recalcular.

    const origPrice = originalProduct.finance?.providerCost?.inARS;
    const origMargin = originalProduct.finance?.pricingStrategy?.targetProfit;
    const origHasCustomMargin = origMargin !== undefined && origMargin !== null;
    const origPricingMethod = originalProduct.finance?.pricingStrategy?.method ?? '';
    const origAdditionalCosts = originalProduct.finance?.additionalCosts || [];

    // Valores actuales del formulario
    const newPrice = productData.price;
    const newUseCustomProfit = !!productData.useCustomProfit;
    const newMargin = productData.customProfitMargin;
    const newPricingMethod = (productData.useCustomProfit && productData.pricingMethodChoice !== 'global')
      ? (productData.pricingMethodChoice || '')
      : '';
    const newAdditionalCosts = productData.additionalCosts || [];

    // Normalizar costos adicionales para comparación justa
    const normalizedOrigCosts = JSON.stringify(origAdditionalCosts.map((c: any) => ({ concept: c.concept, value: Number(c.value), type: c.type })));
    const normalizedNewCosts = JSON.stringify(newAdditionalCosts.map((c: any) => ({ concept: c.concept, value: Number(c.value), type: c.type })));

    // Detectar si ALGO del pricing cambió
    const pricingChanged =
      Number(newPrice) !== Number(origPrice) ||
      newUseCustomProfit !== origHasCustomMargin ||
      Number(newMargin) !== Number(origMargin ?? 0) ||
      newPricingMethod !== origPricingMethod ||
      normalizedNewCosts !== normalizedOrigCosts;

    if (pricingChanged) {
      console.warn(`[DEBUG] Pricing block changed. Sending complete pricing payload.`);
      console.warn(`[DEBUG]   providerCost: ${newPrice} (orig: ${origPrice})`);
      console.warn(`[DEBUG]   useCustomProfit: ${newUseCustomProfit} (orig: ${origHasCustomMargin})`);
      console.warn(`[DEBUG]   customProfitMargin: ${newMargin} (orig: ${origMargin})`);
      console.warn(`[DEBUG]   pricingMethodChoice: ${newPricingMethod} (orig: ${origPricingMethod})`);
      console.warn(`[DEBUG]   additionalCosts: ${normalizedNewCosts} (orig: ${normalizedOrigCosts})`);

      changes.formData.append('providerCost', String(newPrice));
      changes.formData.append('useCustomProfit', String(newUseCustomProfit));
      changes.formData.append('customProfitMargin', String(newMargin ?? ''));
      changes.formData.append('pricingMethodChoice', newPricingMethod || 'global');
      changes.formData.append('additionalCosts', JSON.stringify(newAdditionalCosts));
      changes.hasChanges = true;
    }

    // --- DISCOUNT PERCENTAGE TRANSFER (separado, no es input del cálculo de precios) ---
    const origDiscount = originalProduct.price?.discountPercentageTransfer ?? 0;
    const newDiscount = productData.discountPercentageTransfer ?? 0;
    if (Number(newDiscount) !== Number(origDiscount)) {
      console.warn(`[DEBUG] Change detected in discountPercentageTransfer. New: '${newDiscount}', Orig: '${origDiscount}'`);
      changes.formData.append('discountPercentageTransfer', String(newDiscount));
      changes.hasChanges = true;
    }

    // --- 1. CAMPOS SIMPLES ---
    const simpleFields = ['model', 'brand', 'category', 'shortDescription', 'largeDescription', 'productType', 'isActive', 'isFeatured'];

    // --- PROVIDER (comparar contra ._id porque originalProduct.provider es un objeto poblado) ---
    const origProviderId = originalProduct.provider?._id || '';
    const newProviderId = productData.provider || '';
    if (newProviderId !== origProviderId) {
      console.warn(`[DEBUG] Change detected in provider. New: '${newProviderId}', Orig: '${origProviderId}'`);
      changes.formData.append('provider', newProviderId);
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

    // --- 3. VARIANTES (CON SOPORTE POLIMÓRFICO) ---

    // Función auxiliar para saber qué índice le corresponde a la URL vieja
    const originalImageUrls = (originalProduct.images || []).map((img: any) => img.url || img);

    const originalVariants = (originalProduct.variants || []).map((v: any) => {
      const origVar: any = {
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

    // --- 9. SIZE GUIDE ---
    const origSizeGuide = originalProduct.sizeGuide || null;
    const newSizeGuide = productData.sizeGuide || null;
    
    // Normalize before compare to avoid key ordering issues
    const normalizedOrig = origSizeGuide ? JSON.stringify({
      headers: origSizeGuide.headers || [],
      rows: origSizeGuide.rows || [],
      tolerance: origSizeGuide.tolerance || ''
    }) : 'null';
    
    const normalizedNew = newSizeGuide ? JSON.stringify({
      headers: newSizeGuide.headers || [],
      rows: newSizeGuide.rows || [],
      tolerance: newSizeGuide.tolerance || ''
    }) : 'null';

    if (normalizedNew !== normalizedOrig) {
      console.warn(`[DEBUG] Change detected in sizeGuide. New: '${normalizedNew}', Orig: '${normalizedOrig}'`);
      if (newSizeGuide) {
        changes.formData.append('sizeGuide', JSON.stringify(newSizeGuide));
      } else {
        changes.formData.append('sizeGuide', 'null');
      }
      changes.hasChanges = true;
    }

    return changes;
  }
}