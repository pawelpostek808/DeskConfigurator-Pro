
export interface ProductOption {
  id: string;
  label: string;
  price: number;
  type?: 'color' | 'image' | 'text' | 'button';
  value?: string; // Hex code for colors, dimension string for sizes
  description?: string;
  incompatibleWith?: string[];
}

export interface ConfigStep {
  id: string;
  number: number;
  title: string;
  options: ProductOption[];
  allowMultiple?: boolean;
}

export interface CustomElement {
  id: string;
  name: string;
  url: string; // Blob URL
}

export interface ModelOverride {
  url: string;
  scale: number;
  position: [number, number, number]; // [x, y, z] offset
  fileName: string;
  textureUrl?: string; // Texture for the override model
}

export interface CatalogOverrides {
  [key: string]: ModelOverride;
}

export interface DeskState {
  size: string;
  customWidth: number;
  customDepth: number;
  topColor: string;
  frameType: string;
  frameColor: string;
  accessories: string[];
  addons: string[];
  
  // Custom Desk Top (Blat) - User Upload
  customDeskModelUrl?: string; 
  customDeskScale: number;
  customTextureUrl?: string; // Added texture support
  customDeskPosition: [number, number, number]; // Manual offset
  customDeskOnFrame: boolean; // Auto-lift toggle

  // Custom Frame (Stelaż) - User Upload
  customFrameUrl?: string;
  customFrameScale: number;
  customFramePosition: [number, number, number]; // Manual offset

  customElements: CustomElement[]; // Additional .fbx props
}

export const INITIAL_STATE: DeskState = {
  size: '140x70',
  customWidth: 140,
  customDepth: 70,
  topColor: 'oak',
  frameType: 'electric',
  frameColor: 'black',
  accessories: [],
  addons: [],
  customDeskScale: 1.0,
  customDeskPosition: [0, 0, 0],
  customDeskOnFrame: false,
  customFrameScale: 1.0,
  customFramePosition: [0, 0, 0],
  customElements: []
};
