"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type GalleryImage = {
  url: string;
  alt?: string | null;
  colour?: string | null;
};

type Props = {
  images: GalleryImage[];
  productName: string;
  selectedColour?: string;
  onColourChange?: (colour: string) => void;
};

const SWIPE_THRESHOLD = 45;

export default function ProductGallery({
  images,
  productName,
  selectedColour = "",
  onColourChange,
}: Props) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const colourOrder = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const image of images) {
      const colour = (image.colour || "").trim();
      if (colour && !seen.has(colour)) {
        seen.add(colour);
        result.push(colour);
      }
    }

    return result;
  }, [images]);

  const filteredImages = useMemo(() => {
    if (!selectedColour) return images;

    const matching = images.filter(
      (image) =>
        (image.colour || "").trim().toLowerCase() ===
        selectedColour.trim().toLowerCase()
    );

    const general = images.filter(
      (image) => !(image.colour || "").trim()
    );

    return matching.length > 0
      ? [...matching, ...general]
      : images;
  }, [images, selectedColour]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedColour, filteredImages.length]);

  const activeImage =
    filteredImages[activeIndex] ||
    filteredImages[0] ||
    images[0] ||
    null;

  function changeColour(direction: 1 | -1) {
    if (!onColourChange || colourOrder.length < 2) return false;

    const currentIndex = colourOrder.findIndex(
      (colour) =>
        colour.toLowerCase() === selectedColour.toLowerCase()
    );

    const safeCurrentIndex =
      currentIndex >= 0 ? currentIndex : 0;

    const nextIndex =
      (safeCurrentIndex + direction + colourOrder.length) %
      colourOrder.length;

    const nextColour = colourOrder[nextIndex];

    if (!nextColour) return false;

    onColourChange(nextColour);
    setActiveIndex(0);
    return true;
  }

  function goNext() {
    if (filteredImages.length === 0) return;

    if (activeIndex < filteredImages.length - 1) {
      setActiveIndex((index) => index + 1);
      return;
    }

    if (changeColour(1)) return;

    if (filteredImages.length > 1) {
      setActiveIndex(0);
    }
  }

  function goPrevious() {
    if (filteredImages.length === 0) return;

    if (activeIndex > 0) {
      setActiveIndex((index) => index - 1);
      return;
    }

    if (changeColour(-1)) return;

    if (filteredImages.length > 1) {
      setActiveIndex(filteredImages.length - 1);
    }
  }

  function handleTouchStart(
    event: React.TouchEvent<HTMLDivElement>
  ) {
    const touch = event.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function handleTouchEnd(
    event: React.TouchEvent<HTMLDivElement>
  ) {
    if (
      touchStartX.current === null ||
      touchStartY.current === null
    ) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

    // Avoid hijacking normal vertical page scrolling.
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) {
      goNext();
    } else {
      goPrevious();
    }
  }

  if (!activeImage) {
    return (
      <div className="kk-product-gallery">
        <div className="product-main-image kk-gallery-empty">
          <span>KK CLOSET</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="kk-product-gallery">
        <div
          className="kk-gallery-main-wrap"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="product-main-image kk-gallery-main"
            style={{
              backgroundImage: `url(${activeImage.url})`,
            }}
            aria-label={`Open ${activeImage.alt || productName} image`}
            onClick={() => setLightboxOpen(true)}
          />

          {(filteredImages.length > 1 ||
            colourOrder.length > 1) && (
            <>
              <button
                type="button"
                className="kk-gallery-arrow kk-gallery-arrow-left"
                aria-label="Previous product image or colour"
                onClick={goPrevious}
              >
                ‹
              </button>

              <button
                type="button"
                className="kk-gallery-arrow kk-gallery-arrow-right"
                aria-label="Next product image or colour"
                onClick={goNext}
              >
                ›
              </button>
            </>
          )}

          {selectedColour && (
            <div className="kk-gallery-colour-label">
              {selectedColour}
            </div>
          )}
        </div>

        {filteredImages.length > 1 && (
          <div className="thumbnail-grid kk-gallery-thumbnails">
            {filteredImages.map((image, index) => (
              <button
                type="button"
                key={`${image.url}-${index}`}
                className={
                  index === activeIndex
                    ? "kk-gallery-thumbnail active"
                    : "kk-gallery-thumbnail"
                }
                style={{
                  backgroundImage: `url(${image.url})`,
                }}
                aria-label={`Show image ${index + 1}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        )}

        {colourOrder.length > 1 && (
          <p className="kk-gallery-swipe-hint">
            Swipe or use arrows to browse colours
          </p>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="kk-gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image preview`}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="kk-gallery-lightbox-close"
            aria-label="Close image preview"
            onClick={() => setLightboxOpen(false)}
          >
            ×
          </button>

          <button
            type="button"
            className="kk-gallery-lightbox-arrow kk-gallery-lightbox-left"
            aria-label="Previous image or colour"
            onClick={(event) => {
              event.stopPropagation();
              goPrevious();
            }}
          >
            ‹
          </button>

          <img
            src={activeImage.url}
            alt={activeImage.alt || productName}
            onClick={(event) => event.stopPropagation()}
          />

          <button
            type="button"
            className="kk-gallery-lightbox-arrow kk-gallery-lightbox-right"
            aria-label="Next image or colour"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
