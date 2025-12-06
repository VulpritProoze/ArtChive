// Gallery Feature Exports - Centralized imports for gallery components

// Editor Components
export { CanvasStage } from './editor/canvas-stage.component';
export { CanvasTransformer } from './editor/canvas-transformer.component';
export { LayerPanel } from './editor/layer-panel.panel';
export { PropertiesPanel } from './editor/properties-panel.panel';
export { TemplateLibrary } from './editor/template-library.library';
export { ObjectsLibraryModal } from './editor/objects-library.modal';
export { Toolbar } from './editor/toolbar.component';
export { ShapesFloating } from './editor/shapes-floating.component';

// Cards
export { GalleryCard } from './cards/gallery-card.card';
export { GalleryCardMenu } from './cards/gallery-card-menu.component';

// Modals
export { GalleryCreationModal, type GalleryFormData } from './modal/gallery-creation.modal';
export { PublishGalleryModal } from './modal/publish-gallery.modal';
export { default as GalleryCommentsModal } from './modal/gallery-comments-modal.component';
export { default as GalleryCommentFormModal } from './modal/gallery-comment-form.modal';

// Components
export { default as GalleryAwardDisplay } from './gallery-award-display.component';
export { default as GalleryReplyComponent } from './gallery-reply.component';
export { default as GallerySidebarSection } from './gallery-sidebar-section.component';

// Sections
export { BestGalleriesSection } from './section/best-galleries-section.component';
export { BestGalleriesCarouselSingle } from './section/best-galleries-carousel-single.component';
export { BestGalleriesCarouselMulti } from './section/best-galleries-carousel-multi.component';
export { FellowsGallerySection } from './section/fellows-gallery-section.component';
export { OtherGalleriesSection } from './section/other-galleries-section.component';

// Editor Utils
export * from './editor/utils/serialize-canvas.util';
export * from './editor/utils/snap.util';
export * from './editor/utils/shape-factory.util';
