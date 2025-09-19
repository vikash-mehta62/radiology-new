declare module 'cornerstone-core' {
  export interface Image {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    render: any;
    getPixelData: () => Uint8Array | Uint16Array | Int16Array;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
    invert: boolean;
    sizeInBytes: number;
  }

  export interface Element {
    canvas: HTMLCanvasElement;
    image?: Image;
    viewport: Viewport;
    invalid: boolean;
    needsRedraw: boolean;
  }

  export interface Viewport {
    scale: number;
    translation: {
      x: number;
      y: number;
    };
    voi: {
      windowWidth: number;
      windowCenter: number;
    };
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
  }

  export interface EnabledElement {
    element: HTMLElement;
    canvas: HTMLCanvasElement;
    image?: Image;
    viewport: Viewport;
    renderingTools: any;
  }

  export function enable(element: HTMLElement, options?: any): void;
  export function disable(element: HTMLElement): void;
  export function displayImage(element: HTMLElement, image: Image, viewport?: Partial<Viewport>): void;
  export function getImage(element: HTMLElement): Image | undefined;
  export function getViewport(element: HTMLElement): Viewport;
  export function setViewport(element: HTMLElement, viewport: Partial<Viewport>): void;
  export function reset(element: HTMLElement): void;
  export function resize(element: HTMLElement, forcedResize?: boolean): void;
  export function loadImage(imageId: string): Promise<Image>;
  export function loadAndCacheImage(imageId: string): Promise<Image>;
  export function getEnabledElement(element: HTMLElement): EnabledElement;
  export function addLayer(element: HTMLElement, image: Image, options?: any): void;
  export function removeLayer(element: HTMLElement, layerId: string): void;
  export function getActiveLayer(element: HTMLElement): any;
  export function setActiveLayer(element: HTMLElement, layerId: string): void;

  export const events: {
    IMAGE_RENDERED: string;
    IMAGE_CACHE_IMAGE_ADDED: string;
    IMAGE_CACHE_IMAGE_REMOVED: string;
    ELEMENT_ENABLED: string;
    ELEMENT_DISABLED: string;
    NEW_IMAGE: string;
  };

  export const imageCache: {
    putImagePromise: (imageId: string, imagePromise: Promise<Image>) => void;
    getImagePromise: (imageId: string) => Promise<Image> | undefined;
    removeImagePromise: (imageId: string) => void;
    setMaximumSizeBytes: (numBytes: number) => void;
    getCacheInfo: () => any;
  };

  export const metaData: {
    addProvider: (provider: (type: string, imageId: string) => any) => void;
    removeProvider: (provider: (type: string, imageId: string) => any) => void;
    get: (type: string, imageId: string) => any;
  };
}

declare module 'cornerstone-wado-image-loader' {
  export const external: ((dependencies: any) => void) | undefined;
  export function configure(options: any): void;
  export const wadouri: {
    dataSetCacheManager: any;
    loadImage: (imageId: string) => Promise<any>;
  };
}

declare module 'cornerstone-web-image-loader' {
  export const external: ((dependencies: any) => void) | undefined;
}

declare module 'dicom-parser' {
  export interface DataSet {
    byteArray: Uint8Array;
    elements: { [tag: string]: Element };
    string: (tag: string) => string | undefined;
    uint16: (tag: string) => number | undefined;
    int16: (tag: string) => number | undefined;
    uint32: (tag: string) => number | undefined;
    int32: (tag: string) => number | undefined;
    float: (tag: string) => number | undefined;
    double: (tag: string) => number | undefined;
    numStringValues: (tag: string) => number;
    intString: (tag: string, index?: number) => number | undefined;
    floatString: (tag: string, index?: number) => number | undefined;
  }

  export interface Element {
    tag: string;
    vr?: string;
    length: number;
    dataOffset?: number;
    hadUndefinedLength?: boolean;
    items?: DataSet[];
  }

  export function parseDicom(byteArray: Uint8Array, options?: any): DataSet;
  export function readTag(byteStream: any): string;
  export function readSequenceItemsExplicit(byteStream: any, element: Element): void;
  export function readSequenceItemsImplicit(byteStream: any, element: Element): void;
}