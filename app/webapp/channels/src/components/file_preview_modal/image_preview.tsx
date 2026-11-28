// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';

import type {FileInfo} from '@mattermost/types/files';

import {getFilePreviewUrl, getFileDownloadUrl} from 'mattermost-redux/utils/file_utils';

import AnimatedImageToggle from 'components/animated_image_toggle/animated_image_toggle';

import {FileTypes} from 'utils/constants';
import {getFileType, isGIFImage} from 'utils/utils';

import './image_preview.scss';

interface Props {
    fileInfo: FileInfo;
    canDownloadFiles: boolean;
    scale?: number;
    translate?: {x: number; y: number};
    isZoomed?: boolean;
    isDragging?: boolean;

    /*
    * When false, a GIF opens paused (still first frame) until the user plays it. Defaults to animating.
    */
    allowAnimatedImages?: boolean;
    onWheel?: (e: WheelEvent) => void;
    onMouseDown?: (e: React.MouseEvent<HTMLElement>) => void;
}

function buildTransform(scale?: number, translate?: {x: number; y: number}): string | undefined {
    const hasScale = scale !== undefined && scale !== 1;
    const hasTranslate = translate && (translate.x !== 0 || translate.y !== 0);
    if (!hasScale && !hasTranslate) {
        return undefined;
    }
    const parts: string[] = [];
    if (hasTranslate) {
        parts.push(`translate(${translate.x}px, ${translate.y}px)`);
    }
    if (hasScale) {
        parts.push(`scale(${scale})`);
    }
    return parts.join(' ');
}

export default function ImagePreview({fileInfo, canDownloadFiles, scale, translate, isZoomed, isDragging, allowAnimatedImages = true, onWheel, onMouseDown}: Props) {
    const {formatMessage} = useIntl();
    const isExternalFile = !fileInfo.id;

    // React's synthetic wheel events are passive by default in modern React, so
    // e.preventDefault() inside them is a no-op. Bind a native non-passive
    // listener via ref so the page can't scroll while zooming the image.
    const wrapperRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const node = wrapperRef.current;
        if (!node || !onWheel) {
            return undefined;
        }
        node.addEventListener('wheel', onWheel, {passive: false});
        return () => node.removeEventListener('wheel', onWheel);
    }, [onWheel]);

    const [loaded, setLoaded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    let fileUrl;
    let previewUrl;
    if (isExternalFile) {
        fileUrl = fileInfo.link;
        previewUrl = fileInfo.link;
    } else {
        fileUrl = getFileDownloadUrl(fileInfo.id);
        previewUrl = fileInfo.has_preview_image ? getFilePreviewUrl(fileInfo.id) : fileUrl;
    }

    // A GIF opens paused when animations are turned off; the user can play and pause it from here.
    const stillMode = allowAnimatedImages === false && isGIFImage(fileInfo.extension);
    const showingStill = stillMode && !playing;

    useEffect(() => {
        setLoaded(false);
    }, [previewUrl]);

    useEffect(() => {
        setPlaying(false);
    }, [previewUrl, allowAnimatedImages]);

    useEffect(() => {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        if (!showingStill || !loaded || !image || !canvas || !image.naturalWidth) {
            return;
        }
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d')?.drawImage(image, 0, 0);
    }, [showingStill, loaded, previewUrl]);

    const play = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        setPlaying(true);
    };
    const pause = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        setPlaying(false);
    };

    const transform = buildTransform(scale, translate);
    const imgStyle: React.CSSProperties = {};
    if (transform) {
        imgStyle.transform = transform;
    }
    if (isZoomed) {
        imgStyle.cursor = 'grab';
    }
    const imgClassName = classNames('image_preview__image', {
        'image_preview__image--zoomed': isZoomed,
    });
    const wrapperClassName = classNames('image_preview', {
        'image_preview--dragging': isDragging,
    });

    // While showing the still frame the <img> stays mounted (hidden) only to load the GIF;
    // the <canvas> holding its first frame is what the user sees.
    const hideImage = (style: React.CSSProperties): React.CSSProperties => (showingStill ? {...style, display: 'none'} : style);
    const handleLoad = () => setLoaded(true);

    const finalImgStyle: React.CSSProperties = {...imgStyle};
    if (canDownloadFiles && getFileType(fileInfo.extension) === FileTypes.SVG) {
        finalImgStyle.width = fileInfo.width;
        finalImgStyle.height = 'auto';
    }

    const stillFrame = showingStill && loaded && (
        <canvas
            ref={canvasRef}
            role='img'
            aria-label={formatMessage({id: 'size_aware_image.still_image', defaultMessage: 'Animation paused, select to play: {name}'}, {name: fileInfo.name})}
            tabIndex={0}
            className={imgClassName}
            style={finalImgStyle}
            onClick={play}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    play(e);
                }
            }}
            draggable={false}
        />
    );

    // The toggle sits next to the wrapper (a button can't live inside the <a>) and is centered over the image
    const withAnimationToggle = (preview: React.ReactElement) => {
        if (!stillMode) {
            return preview;
        }

        // The container exists from the start so the <img> isn't remounted once it loads
        return (
            <div className='image_preview__animated'>
                {preview}
                {loaded && (
                    <AnimatedImageToggle
                        playing={!showingStill}
                        onToggle={showingStill ? play : pause}
                    />
                )}
            </div>
        );
    };

    if (!canDownloadFiles) {
        return withAnimationToggle(
            <span
                ref={wrapperRef as React.RefObject<HTMLSpanElement>}
                className={wrapperClassName}
                onMouseDown={onMouseDown}
            >
                <img
                    ref={imageRef}
                    className={imgClassName}
                    src={previewUrl}
                    style={hideImage(imgStyle)}
                    onLoad={handleLoad}
                    draggable={false}
                />
                {stillFrame}
            </span>,
        );
    }

    const preventLinkNav = (e: React.SyntheticEvent) => e.preventDefault();

    return withAnimationToggle(
        <a
            ref={wrapperRef as React.RefObject<HTMLAnchorElement>}
            className={wrapperClassName}
            href='#'
            onMouseDown={onMouseDown}
            onClick={preventLinkNav}
            onDragStart={preventLinkNav}
        >
            <img
                ref={imageRef}
                className={imgClassName}
                loading={stillMode ? undefined : 'lazy'} // a lazy <img> that is display:none would never load
                data-testid='imagePreview'
                alt={'preview url image'}
                src={previewUrl}
                style={hideImage(finalImgStyle)}
                onLoad={handleLoad}
                draggable={false}
            />
            {stillFrame}
        </a>,
    );
}
