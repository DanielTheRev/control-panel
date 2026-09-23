import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { IProduct, ProductStatus } from '../interfaces/product.interface';

@Injectable({
  providedIn: 'root',
})
export class ExcelExportService {
  /**
   * Exporta un listado de productos a un archivo Excel (.xlsx) profesional con 2 hojas:
   * 1. "Catálogo y Finanzas"
   * 2. "Variantes e Inventario"
   */
  exportProductsToExcel(
    products: IProduct[],
    storeName: string = 'Tienda',
    storeConfig?: any,
    allKnownProducts: IProduct[] = []
  ): void {
    if (!products || products.length === 0) {
      throw new Error('No hay productos para exportar');
    }

    // Mapa auxiliar para resolver nombres de prendas combinadas (lookbook)
    const productMap = new Map<string, IProduct>();
    allKnownProducts.forEach((p) => {
      if (p?._id) productMap.set(p._id.toString(), p);
    });
    products.forEach((p) => {
      if (p?._id && !productMap.has(p._id.toString())) {
        productMap.set(p._id.toString(), p);
      }
    });

    // 1. Crear nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // 2. Construir Hoja 1: Catálogo y Finanzas
    const sheet1Data = this.#buildCatalogFinanceSheet(products, storeConfig, productMap);
    const sheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    this.#applySheet1Styles(sheet1, sheet1Data);
    XLSX.utils.book_append_sheet(workbook, sheet1, 'Catálogo y Finanzas');

    // 3. Construir Hoja 2: Variantes e Inventario
    const sheet2Data = this.#buildVariantsInventorySheet(products);
    const sheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    this.#applySheet2Styles(sheet2, sheet2Data);
    XLSX.utils.book_append_sheet(workbook, sheet2, 'Variantes e Inventario');

    // 4. Nombre de archivo con marca de tiempo
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const cleanStoreName = (storeName || 'tienda').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `catalogo_${cleanStoreName}_${dateStr}.xlsx`;

    // 5. Descargar archivo en el navegador
    XLSX.writeFile(workbook, filename);
  }

  // ==========================================================================
  // CONSTRUCCIÓN DE HOJA 1: CATÁLOGO Y FINANZAS
  // ==========================================================================
  #buildCatalogFinanceSheet(
    products: IProduct[],
    storeConfig: any,
    productMap: Map<string, IProduct>
  ): any[][] {
    const headers = [
      'ID Producto',
      'Modelo / Nombre',
      'Marca',
      'Categoría',
      'Estado',
      'Proveedor',
      'Link Proveedor',
      'Costo Proveedor ($ ARS)',
      'Costo Proveedor (USD)',
      'Tipo de Cambio ($/USD)',
      'Estrategia Margen',
      'Margen Pretendido (%)',
      'Costos Operativos Adicionales',
      'Precio Venta Transferencia/Efectivo ($)',
      'Precio Venta Lista ($)',
      'Descuento Transferencia (%)',
      'Precio 1 Pago Débito/Crédito ($)',
      '3 Cuotas sin interés ($ c/u)',
      '6 Cuotas sin interés ($ c/u)',
      'Ganancia Neta Transferencia ($)',
      'Ganancia Neta 1 Pago ($)',
      'Ganancia Neta 3 Cuotas ($)',
      'Ganancia Neta 6 Cuotas ($)',
      'Stock Total (Unidades)',
      'Outfit / Combina Con (Lookbook)',
    ];

    const rows: any[][] = [headers];

    products.forEach((p) => {
      // Estado traducido
      const statusLabels: Record<ProductStatus, string> = {
        published: 'Publicado',
        draft: 'Borrador',
        paused: 'Pausado',
        archived: 'Archivado',
      };
      const statusLabel = statusLabels[p.status] || p.status;

      // Margen
      const isCustomProfit =
        (p as any).useCustomProfit === true ||
        (p as any).useCustomProfit === 'true' ||
        (p as any).customProfitMargin !== undefined ||
        (p as any).customProfitMargin1Pay !== undefined ||
        (p.finance?.pricingStrategy?.targetProfit !== undefined && (p as any).useCustomProfit !== false);

      const marginPercent =
        p.finance?.pricingStrategy?.targetProfit ??
        (p as any).customProfitMargin ??
        (p as any).customProfitMargin1Pay ??
        storeConfig?.profit ??
        30;

      const marginStrategyLabel = isCustomProfit ? 'Margen Personalizado' : 'Margen Global Tienda';

      // Costos adicionales en texto
      const addCostsText = (p.finance?.additionalCosts || [])
        .map((c: any) => {
          const val = c.type === 'percent_over_provider' ? `${c.value}% s/proveedor` : `$${c.value}`;
          return `${c.concept}: ${val}`;
        })
        .join(' | ') || 'Ninguno';

      // Cuotas
      const listPrice = p.price?.listPrice || 0;
      const cuota3 = listPrice > 0 ? Math.round(listPrice / 3) : 0;
      const cuota6 = listPrice > 0 ? Math.round(listPrice / 6) : 0;

      // 1 Pago
      const isCard1PayDiscount = storeConfig?.pricingStrategy?.card1PayDiscount;
      const actual1PayPrice = isCard1PayDiscount
        ? (p.price?.cashTransferPrice || p.price?.card_ticket1PayPrice || listPrice)
        : listPrice;

      // Stock
      const totalStock =
        p.totalStock ??
        (p.variants && p.variants.length > 0
          ? p.variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0)
          : 0);

      // Combina con
      const combineList = (p as any).combineWith || [];
      const combineNames: string[] = [];
      if (Array.isArray(combineList)) {
        combineList.forEach((item: any) => {
          if (typeof item === 'object' && item !== null && item.model) {
            combineNames.push(item.model);
          } else {
            const id = typeof item === 'string' ? item : item?._id?.toString();
            const found = productMap.get(id);
            if (found) combineNames.push(found.model);
          }
        });
      }

      rows.push([
        p._id || '',
        p.model || '',
        p.brand || 'Vura',
        p.category || '',
        statusLabel,
        p.provider?.name || 'Sin asignar',
        p.linkProductProvider || '',
        p.finance?.providerCost?.inARS || 0,
        p.finance?.providerCost?.inUSD || 0,
        p.finance?.exchangeRateSnapshot || 0,
        marginStrategyLabel,
        marginPercent,
        addCostsText,
        p.price?.cashTransferPrice || 0,
        listPrice,
        p.price?.discountPercentageTransfer || 0,
        actual1PayPrice,
        cuota3,
        cuota6,
        p.finance?.calculatedProfits?.transfer || 0,
        p.finance?.calculatedProfits?.card_ticket1Pay || 0,
        p.finance?.calculatedProfits?.card3Installments || 0,
        p.finance?.calculatedProfits?.card6Installments || 0,
        totalStock,
        combineNames.join(' | ') || 'Ninguno',
      ]);
    });

    return rows;
  }

  // ==========================================================================
  // CONSTRUCCIÓN DE HOJA 2: VARIANTES E INVENTARIO
  // ==========================================================================
  #buildVariantsInventorySheet(products: IProduct[]): any[][] {
    const headers = [
      'ID Producto',
      'Modelo / Prenda',
      'ID Variante',
      'SKU',
      'Talle',
      'Color',
      'Código de Barras (EAN)',
      'Stock Disponible (Unidades)',
      'Variante Activa',
    ];

    const rows: any[][] = [headers];

    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v: any) => {
          rows.push([
            p._id || '',
            p.model || '',
            v._id || '',
            v.sku || '',
            v.size || 'Único',
            v.color?.name || 'Estándar',
            v.barcode || '',
            Number(v.stock) || 0,
            v.isActive !== false ? 'SÍ' : 'NO',
          ]);
        });
      } else {
        rows.push([
          p._id || '',
          p.model || '',
          'Directo',
          '',
          'Único',
          'Estándar',
          '',
          Number(p.totalStock) || 0,
          p.status === 'published' ? 'SÍ' : 'NO',
        ]);
      }
    });

    return rows;
  }

  // ==========================================================================
  // ESTILOS Y FORMATOS VISUALES
  // ==========================================================================
  #applySheet1Styles(sheet: XLSX.WorkSheet, data: any[][]): void {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Ancho de columnas calculado automáticamente
    const colWidths: { wch: number }[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v !== undefined && cell.v !== null) {
          const strVal = String(cell.v);
          if (strVal.length > maxLen) maxLen = strVal.length;
        }
      }
      colWidths[C] = { wch: Math.min(maxLen + 3, 40) };
    }
    sheet['!cols'] = colWidths;

    // Estilos de encabezado y datos
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '1E293B' } }, // Slate-800 elegante
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '0F172A' } },
        bottom: { style: 'medium', color: { rgb: '0F172A' } },
        left: { style: 'thin', color: { rgb: '334155' } },
        right: { style: 'thin', color: { rgb: '334155' } },
      },
    };

    const dataBorder = {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    };

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const isHeader = R === 0;
      const isEvenRow = R % 2 === 0;

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellRef];
        if (!cell) continue;

        if (isHeader) {
          cell.s = headerStyle;
        } else {
          // Columnas numéricas / monetarias
          const isCurrencyCol = [7, 8, 9, 13, 14, 16, 17, 18, 19, 20, 21, 22].includes(C);
          const isPercentCol = [11, 15].includes(C);
          const isIntegerCol = [23].includes(C);
          const isCenterCol = [0, 4, 10].includes(C);

          let align = 'left';
          if (isCurrencyCol || isPercentCol || isIntegerCol) {
            align = 'right';
          } else if (isCenterCol) {
            align = 'center';
          }

          cell.s = {
            font: { sz: 10, color: { rgb: '1E293B' } },
            fill: isEvenRow ? { fgColor: { rgb: 'F8FAFC' } } : { fgColor: { rgb: 'FFFFFF' } },
            alignment: { horizontal: align, vertical: 'center' },
            border: dataBorder,
          };

          if (isCurrencyCol && typeof cell.v === 'number') {
            cell.z = '$#,##0';
          } else if (isPercentCol && typeof cell.v === 'number') {
            cell.z = '0"%"';
          } else if (isIntegerCol && typeof cell.v === 'number') {
            cell.z = '#,##0';
          }
        }
      }
    }
  }

  #applySheet2Styles(sheet: XLSX.WorkSheet, data: any[][]): void {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Ancho de columnas calculado automáticamente
    const colWidths: { wch: number }[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v !== undefined && cell.v !== null) {
          const strVal = String(cell.v);
          if (strVal.length > maxLen) maxLen = strVal.length;
        }
      }
      colWidths[C] = { wch: Math.min(maxLen + 4, 40) };
    }
    sheet['!cols'] = colWidths;

    // Estilo verde esmeralda para el inventario
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '065F46' } }, // Emerald-800
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '022C22' } },
        bottom: { style: 'medium', color: { rgb: '022C22' } },
        left: { style: 'thin', color: { rgb: '047857' } },
        right: { style: 'thin', color: { rgb: '047857' } },
      },
    };

    const dataBorder = {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    };

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const isHeader = R === 0;
      const isEvenRow = R % 2 === 0;

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellRef];
        if (!cell) continue;

        if (isHeader) {
          cell.s = headerStyle;
        } else {
          const isStockCol = C === 7;
          const isCenterCol = [0, 2, 3, 4, 6, 8].includes(C);

          let align = 'left';
          if (isStockCol) align = 'right';
          else if (isCenterCol) align = 'center';

          cell.s = {
            font: { sz: 10, color: { rgb: '1E293B' } },
            fill: isEvenRow ? { fgColor: { rgb: 'F0FDF4' } } : { fgColor: { rgb: 'FFFFFF' } },
            alignment: { horizontal: align, vertical: 'center' },
            border: dataBorder,
          };

          if (isStockCol && typeof cell.v === 'number') {
            cell.z = '#,##0';
          }
        }
      }
    }
  }
}
