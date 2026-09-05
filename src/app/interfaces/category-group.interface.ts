export interface ICategoryGroup {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  targetCategories: string[];
  synonyms: string[];
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICategoryGroupCreateDTO {
  name: string;
  slug?: string;
  description?: string;
  targetCategories: string[];
  synonyms?: string[];
  isActive?: boolean;
  order?: number;
}

export interface ICategoryGroupUpdateDTO {
  name?: string;
  slug?: string;
  description?: string;
  targetCategories?: string[];
  synonyms?: string[];
  isActive?: boolean;
  order?: number;
}

export interface IRawCategoryCount {
  category: string;
  count: number;
}
