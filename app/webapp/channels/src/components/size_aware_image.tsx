// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable @mattermost/use-external-link */

import classNames from 'classnames';
import React from 'react';
import type {CSSProperties, KeyboardEvent, MouseEvent, SyntheticEvent} from 'react';
import {FormattedMessage, injectIntl} from 'react-intl';
import type {WrappedComponentProps} from 'react-intl';
import {connect} from 'react-redux';

import {DownloadOutlineIcon, LinkVariantIcon, CheckIcon, PlayIcon} from '@mattermost/compass-icons/components';
import {WithTooltip} from '@mattermost/shared/components/tooltip';
import type {FileInfo} from '@mattermost/types/files';
import type {PostImage} from '@mattermost/types/posts';

import {getBool} from 'mattermost-redux/selectors/entities/preferences';
import type {ActionResult} from 'mattermost-redux/types/actions';
import {getFileMiniPreviewUrl} from 'mattermost-redux/utils/file_utils';

import LoadingImagePreview from 'components/loading_image_preview';

import {FileTypes, Preferences} from 'utils/constants';
import {copyToClipboard, getFileType, isGIFImage} from 'utils/utils';

import type {GlobalState} from 'types/store';

const MIN_IMAGE_SIZE = 48;
const MIN_IMAGE_SIZE_FOR_INTERNAL_BUTTONS = 100;
const MAX_IMAGE_HEIGHT = 350;

export type Props = WrappedComponentProps & {

    /*
    * The source URL of the image
    */
    src: string;

    /*
    * dimensions object to create empty space required to prevent scroll pop
    */
    dimensions?: Partial<PostImage>;
    fileInfo?: FileInfo;

    /**
    * fileURL of the original image
    */
    fileURL?: string;

    alt?: string;
    height?: string;
    width?: string;
    title?: string;
    style?: CSSProperties;

    /*
    * Boolean value to pass for showing a loader when image is being loaded
    */
    showLoader?: boolean;

    /*
    * Keeps the dimension placeholder mounted without rendering image content
    */
    renderPlaceholderOnly?: boolean;

    /*
    * A callback that is called as soon as the image component has a height value
    */
    onImageLoaded?: ({height, width}: {height: number; width: number}) => void;

    /*
    * A callback that is called when image load fails
    */
    onImageLoadFail?: () => void;

    /*
    * Fetch the onClick function
    */
    onClick?: (e: (KeyboardEvent<HTMLImageElement> | MouseEvent<HTMLImageElement | HTMLDivElement>), link?: string) => void;

    /*
    * css classes that can added to the img as well as parent div on svg for placeholder
    */
    className?: string;

    /*
    * Enables the logic of surrounding small images with a bigger container div for better click/tap targeting
    */
    handleSmallImageContainer?: boolean;

    /**
    * Enables copy URL functionality through a button on image hover.
    */
    enablePublicLink?: boolean;

    /**
    * Action to fetch public link of an image from server.
    */
    getFilePublicLink?: () => Promise<ActionResult<{link: string}>>;

    /*
    * Prevents display of utility buttons when image in a location that makes them inappropriate
    */
    hideUtilities?: boolean;

    /*
    * Indicates whether the file has been rejected and should not show preview
    */
    isFileRejected?: boolean;

    /*
    * When false, animated images (GIFs) show a still first frame until the user plays them.
    * Comes from the "Animated images (GIFs)" display setting.
    */
    allowAnimatedImages?: boolean;
};

type State = {
    loaded: boolean;
    isSmallImage: boolean;
    linkCopiedRecently: boolean;
    linkCopyInProgress: boolean;
    error: boolean;
    imageWidth: number;
    playing: boolean;
};

// SizeAwareImage is a component used for rendering images where the dimensions of the image are important for
// ensuring that the page is laid out correctly.
export class SizeAwareImage extends React.PureComponent<Props, State> {
    public heightTimeout = 0;
    public mounted = false;
    public timeout: NodeJS.Timeout | null = null;

    constructor(props: Props) {
        super(props);
        const {dimensions} = props;

        this.state = {
            loaded: false,
            isSmallImage: this.dimensionsAvailable(dimensions) ? this.isSmallImage(
                dimensions?.width ?? 0, dimensions?.height ?? 0) : false,
            linkCopiedRecently: false,
            linkCopyInProgress: false,
            error: false,
            imageWidth: dimensions?.width ?? 0,
            playing: false,
        };

        this.heightTimeout = 0;
    }

    private imageRef = React.createRef<HTMLImageElement>();
    private canvasRef = React.createRef<HTMLCanvasElement>();

    componentDidMount() {
        this.mounted = true;
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        // Draw the still frame when the canvas has just appeared or the image changed
        if (this.isShowingStill() && (!this.wasShowingStill(prevProps, prevState) || prevProps.src !== this.props.src)) {
            this.drawStillFrame();
        }

        // A manual "play" only lasts while the setting stays unchanged and for the same image
        if (this.state.playing && (prevProps.allowAnimatedImages !== this.props.allowAnimatedImages || prevProps.src !== this.props.src)) {
            this.setState({playing: false});
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    isAnimatedImage = (props: Props = this.props) => {
        const {dimensions, fileInfo, src} = props;

        // The server's metadata is the most reliable signal: it also covers proxied and extension-less URLs
        if (isGIFImage(fileInfo?.extension ?? '') || dimensions?.format === 'gif' || (dimensions?.frameCount ?? 0) > 1) {
            return true;
        }

        try {
            const url = new URL(src, 'http://localhost');
            if (url.pathname.toLowerCase().endsWith('.gif')) {
                return true;
            }

            // Image proxy URLs (/api/v4/image?url=<original>) carry the original address in the query
            const original = url.searchParams.get('url');
            return Boolean(original) && new URL(original!, 'http://localhost').pathname.toLowerCase().endsWith('.gif');
        } catch {
            return false;
        }
    };

    // True when the user turned animations off and this image is an animated one
    isStillMode = (props: Props = this.props) => props.allowAnimatedImages === false && this.isAnimatedImage(props);

    isShowingStill = () => this.isStillMode() && !this.state.playing && this.state.loaded;

    wasShowingStill = (prevProps: Props, prevState: State) => this.isStillMode(prevProps) && !prevState.playing && prevState.loaded;

    drawStillFrame = () => {
        const image = this.imageRef.current;
        const canvas = this.canvasRef.current;
        if (!image || !canvas || !image.naturalWidth) {
            return;
        }

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d')?.drawImage(image, 0, 0);
    };

    playAnimation = (e?: MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        this.setState({playing: true});
    };

    pauseAnimation = (e?: MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        this.setState({playing: false});
    };

    dimensionsAvailable = (dimensions?: Partial<PostImage>) => {
        return dimensions && dimensions.width && dimensions.height;
    };

    isSmallImage = (width: number, height: number) => {
        return width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE;
    };

    handleLoad = (event: SyntheticEvent<HTMLImageElement, Event>) => {
        if (this.mounted) {
            const image = event.target as HTMLImageElement;
            const isSmallImage = this.isSmallImage(image.naturalWidth, image.naturalHeight);
            this.setState({
                loaded: true,
                error: false,
                isSmallImage,
                imageWidth: image.naturalWidth,
            }, () => { // Call onImageLoaded prop only after state has already been set
                if (this.props.onImageLoaded && image.naturalHeight) {
                    this.props.onImageLoaded({height: image.naturalHeight, width: image.naturalWidth});
                }
            });
        }
    };

    handleError = () => {
        if (this.mounted) {
            if (this.props.onImageLoadFail) {
                this.props.onImageLoadFail();
            }
            this.setState({error: true});
        }
    };

    handleImageClick = (e: MouseEvent<HTMLImageElement | HTMLCanvasElement>) => {
        if (!this.state.loaded) {
            return;
        }

        if (this.isShowingStill()) {
            this.playAnimation(e);
            return;
        }

        e.stopPropagation();
        this.props.onClick?.(e as MouseEvent<HTMLImageElement>, this.props.src);
    };

    onEnterKeyDown = (e: KeyboardEvent<HTMLImageElement | HTMLCanvasElement>) => {
        if (e.key === 'Enter') {
            if (this.isShowingStill()) {
                this.playAnimation(e);
                return;
            }

            e.stopPropagation();
            this.props.onClick?.(e as KeyboardEvent<HTMLImageElement>, this.props.src);
        }
    };

    renderImageLoaderIfNeeded = () => {
        const renderPlaceholderOnly = this.props.renderPlaceholderOnly ?? false;

        if (!renderPlaceholderOnly && !this.state.loaded && this.props.showLoader && !this.state.error) {
            return (
                <div style={{position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', left: '50%'}}>
                    <LoadingImagePreview
                        containerClass={'file__image-loading'}
                    />
                </div>
            );
        }
        return null;
    };

    renderImageWithContainerIfNeeded = () => {
        const {
            fileInfo,
            dimensions,
            src,
            fileURL,
            enablePublicLink,
            intl,
            renderPlaceholderOnly,
            ...props
        } = this.props;
        Reflect.deleteProperty(props, 'allowAnimatedImages');
        Reflect.deleteProperty(props, 'showLoader');
        Reflect.deleteProperty(props, 'onImageLoaded');
        Reflect.deleteProperty(props, 'onImageLoadFail');
        Reflect.deleteProperty(props, 'dimensions');
        Reflect.deleteProperty(props, 'handleSmallImageContainer');
        Reflect.deleteProperty(props, 'enablePublicLink');
        Reflect.deleteProperty(props, 'onClick');
        Reflect.deleteProperty(props, 'hideUtilities');
        Reflect.deleteProperty(props, 'getFilePublicLink');
        Reflect.deleteProperty(props, 'isFileRejected');
        Reflect.deleteProperty(props, 'intl');
        Reflect.deleteProperty(props, 'style');

        let ariaLabelImage = intl.formatMessage({id: 'file_attachment.thumbnail', defaultMessage: 'file thumbnail'});
        if (fileInfo) {
            ariaLabelImage += ` ${fileInfo.name}`.toLowerCase();
        }

        const fileType = getFileType(fileInfo?.extension ?? '');

        let conditionalSVGStyleAttribute: CSSProperties | undefined;
        if (fileType === FileTypes.SVG) {
            conditionalSVGStyleAttribute = {
                width: dimensions?.width || MIN_IMAGE_SIZE,
                height: 'auto',
            };
        }

        let mergedImgStyle: CSSProperties | undefined = this.props.style;
        if (conditionalSVGStyleAttribute) {
            mergedImgStyle = {...conditionalSVGStyleAttribute, ...this.props.style};
        }

        const imageClassName = this.props.className +
            (this.props.handleSmallImageContainer && this.state.isSmallImage ? ' small-image--inside-container' : '');

        // While showing the still frame the <img> stays mounted (hidden) only to load the GIF;
        // the <canvas> holding its first frame is what the user sees.
        const showingStill = this.isShowingStill();

        // The canvas bitmap is sized to the GIF's natural size, so it needs the same sizing limits as the <img>
        const canvasStyle: CSSProperties = {
            maxWidth: '100%',
            maxHeight: MAX_IMAGE_HEIGHT,
            height: 'auto',
            ...(Number(props.width) ? {width: Number(props.width)} : {}),
            ...mergedImgStyle,
        };

        const image = (
            <>
                <img
                    {...props}
                    ref={this.imageRef}
                    aria-label={ariaLabelImage}
                    tabIndex={showingStill ? -1 : 0}
                    onClick={this.handleImageClick}
                    onKeyDown={this.onEnterKeyDown}
                    className={imageClassName}
                    src={src}
                    onError={this.handleError}
                    onLoad={this.handleLoad}
                    style={showingStill ? {...mergedImgStyle, display: 'none'} : mergedImgStyle}
                />
                {showingStill && (
                    <canvas
                        ref={this.canvasRef}
                        role='img'
                        aria-label={intl.formatMessage({id: 'size_aware_image.still_image', defaultMessage: 'Animation paused, select to play: {name}'}, {name: ariaLabelImage})}
                        tabIndex={0}
                        onClick={this.handleImageClick}
                        onKeyDown={this.onEnterKeyDown}
                        className={imageClassName}
                        style={canvasStyle}
                    />
                )}
            </>
        );

        let animationToggle;

        // Small images skip the toggle (like the copy/download buttons); they play with a click or Enter on the frame
        const isTooSmallForToggle = this.state.isSmallImage || this.state.imageWidth < MIN_IMAGE_SIZE_FOR_INTERNAL_BUTTONS;
        if (this.isStillMode() && this.state.loaded && !isTooSmallForToggle) {
            const toggleLabel = showingStill ? intl.formatMessage({id: 'size_aware_image.play_animation', defaultMessage: 'Play animation'}) : intl.formatMessage({id: 'size_aware_image.pause_animation', defaultMessage: 'Pause animation'});
            animationToggle = (
                <WithTooltip title={toggleLabel}>
                    <button
                        className='style--none size-aware-image__animation-toggle'
                        aria-label={toggleLabel}
                        onClick={showingStill ? this.playAnimation : this.pauseAnimation}
                    >
                        {showingStill ? (
                            <PlayIcon
                                className={'style--none'}
                                size={18}
                            />
                        ) : (
                            <svg
                                width='18'
                                height='18'
                                viewBox='0 0 24 24'
                                aria-hidden='true'
                            >
                                <path d='M6 5h4v14H6zM14 5h4v14h-4z'/>
                            </svg>
                        )}
                    </button>
                </WithTooltip>
            );
        }

        // copyLink, download are two buttons overlayed on image preview
        // copyLinkTooltip, downloadTooltip are tooltips for the buttons respectively.
        // if linkCopiedRecently is true, defaultMessage would be 'Copy Link', else 'Copied!'

        const copyLinkTooltipText = this.state.linkCopiedRecently ? (
            <FormattedMessage
                id={'single_image_view.copied_link_tooltip'}
                defaultMessage={'Copied'}
            />
        ) : (
            <FormattedMessage
                id={'single_image_view.copy_link_tooltip'}
                defaultMessage={'Copy link'}
            />
        );
        const copyLink = (
            <WithTooltip
                title={copyLinkTooltipText}
            >
                <button
                    className={classNames('style--none', 'size-aware-image__copy_link', {
                        'size-aware-image__copy_link--recently_copied': this.state.linkCopiedRecently,
                    })}
                    aria-label={intl.formatMessage({id: 'single_image_view.copy_link_tooltip', defaultMessage: 'Copy link'})}
                    onClick={this.copyLinkToAsset}
                >
                    {this.state.linkCopiedRecently ? (
                        <CheckIcon
                            className={'svg-check style--none'}
                            size={20}
                        />
                    ) : (
                        <LinkVariantIcon
                            className={'style--none'}
                            size={20}
                        />
                    )}
                </button>
            </WithTooltip>
        );

        const downloadTooltipText = (
            <FormattedMessage
                id='single_image_view.download_tooltip'
                defaultMessage='Download'
            />
        );
        const download = (
            <WithTooltip
                title={downloadTooltipText}
            >
                <a
                    target='_blank'
                    rel='noopener noreferrer'
                    href={this.isInternalImage ? fileURL : src}
                    className='style--none size-aware-image__download'
                    download={true}
                    role={this.isInternalImage ? 'button' : undefined}
                    aria-label={intl.formatMessage({id: 'single_image_view.download_tooltip', defaultMessage: 'Download'})}
                >
                    <DownloadOutlineIcon
                        className={'style--none'}
                        size={20}
                    />
                </a>
            </WithTooltip>
        );

        let utilityButtons;
        if (this.props.handleSmallImageContainer && this.state.isSmallImage) {
            // 24 is the offset on a 48px wide image, for every pixel added to the width of the image, it's added to the left offset to buttons
            const wideImageButtonsOffset = (24 + this.state.imageWidth) - MIN_IMAGE_SIZE;

            /**
             * creation of left offset for 2 nested cases
             *  - if a small image with larger width
             *  - if copy link button is enabled
             */
            const modifierCopyButton = enablePublicLink ? 0 : 8;

            // decrease modifier if imageWidth > 100
            const modifierLargerWidth = this.state.imageWidth > MIN_IMAGE_SIZE_FOR_INTERNAL_BUTTONS ? 40 : 0;

            // since there is a max-width constraint on images, a max-left clause follows.
            const leftStyle = this.state.imageWidth > MIN_IMAGE_SIZE ? {
                left: `min(${wideImageButtonsOffset + (modifierCopyButton - modifierLargerWidth)}px, calc(100% - ${31 - (modifierCopyButton - modifierLargerWidth)}px))`,
            } : {};

            utilityButtons = (
                <span
                    className={classNames('image-preview-utility-buttons-container', 'image-preview-utility-buttons-container--small-image', {
                        'image-preview-utility-buttons-container--small-image-no-copy-button': !enablePublicLink,
                    })}
                    style={leftStyle}
                >
                    {enablePublicLink && copyLink}
                    {download}
                </span>
            );
        } else if (!this.props.hideUtilities && (!this.state.isSmallImage || this.isInternalImage)) {
            // handling external small images (OR) handling all large internal / large external images
            utilityButtons = (
                <span
                    className={classNames('image-preview-utility-buttons-container', {

                        // cases for when image isn't a small image but width is < 100px
                        'image-preview-utility-buttons-container--small-image': this.state.imageWidth < MIN_IMAGE_SIZE_FOR_INTERNAL_BUTTONS,
                        'image-preview-utility-buttons-container--small-image-no-copy-button': (!enablePublicLink || !this.isInternalImage) && this.state.imageWidth < MIN_IMAGE_SIZE_FOR_INTERNAL_BUTTONS,
                    })}
                >
                    {(enablePublicLink || !this.isInternalImage) && copyLink}
                    {download}
                </span>
            );
        }

        const shouldShowImg = !renderPlaceholderOnly && (!this.dimensionsAvailable(dimensions) || this.state.loaded);

        return this.renderImageContainer(
            <>
                {image}
                {animationToggle}
                {utilityButtons}
            </>,
            shouldShowImg ? 'block' : 'none',
        );
    };

    renderImageOrFallback = () => {
        const {
            dimensions,
            fileInfo,
        } = this.props;
        const renderPlaceholderOnly = this.props.renderPlaceholderOnly ?? false;

        let fallback;

        if (this.dimensionsAvailable(dimensions) && (!this.state.loaded || renderPlaceholderOnly)) {
            const ratio = (dimensions?.height ?? 0) > MAX_IMAGE_HEIGHT ? MAX_IMAGE_HEIGHT / (dimensions?.height ?? 1) : 1;
            const height = (dimensions?.height ?? 0) * ratio;
            const width = (dimensions?.width ?? 0) * ratio;

            // Placeholder-only mode reserves layout without rendering image-derived content;
            // rejected files should also avoid preview content.
            const shouldShowMiniPreview = !renderPlaceholderOnly && !this.props.isFileRejected;
            const miniPreview = shouldShowMiniPreview ? getFileMiniPreviewUrl(fileInfo) : null;

            const fallbackSrc = miniPreview ?? emptyImageForDimensions(width, height);

            fallback = this.renderImageContainer(
                <div className={'image-loading__container'}>
                    {this.renderImageLoaderIfNeeded()}
                    <img
                        role='presentation'
                        className={classNames('image-loading__placeholder', this.props.className)}
                        src={fallbackSrc}
                        height={height}
                        width={width}
                    />
                </div>,
            );
        }

        return (
            <>
                {fallback}
                {!renderPlaceholderOnly && this.renderImageWithContainerIfNeeded()}
            </>
        );
    };

    renderImageContainer = (children: React.ReactNode, display?: string) => {
        let containerClass;
        let containerStyle;
        if (this.props.handleSmallImageContainer && this.state.isSmallImage) {
            containerClass = 'small-image__container cursor--pointer a11y--active';
            if (this.state.imageWidth < MIN_IMAGE_SIZE) {
                containerClass += ' small-image__container--min-width';
            }

            containerStyle = this.state.imageWidth > MIN_IMAGE_SIZE ? {
                width: this.state.imageWidth + 2, // 2px to account for the border
            } : {};
        } else {
            containerClass = 'image-loaded-container';
        }

        return (
            <div
                className='file-preview__button'
                style={{display}}
            >
                <figure
                    className={containerClass}
                    style={containerStyle}
                >
                    {children}
                </figure>
            </div>
        );
    };

    isInternalImage = (this.props.fileInfo !== undefined) && (this.props.fileInfo !== null);

    startCopyTimer = () => {
        // set linkCopiedRecently to true, and reset to false after 1.5 seconds
        this.setState({linkCopiedRecently: true});
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
            this.setState({linkCopiedRecently: false, linkCopyInProgress: false});
        }, 1500);
    };

    copyLinkToAsset = async () => {
        // if linkCopyInProgress is true return
        if (this.state.linkCopyInProgress !== true) {
            // set linkCopyInProgress to true to prevent multiple api calls
            this.setState({linkCopyInProgress: true});

            // check if image is external, if not copy this.props.src
            if (!this.isInternalImage) {
                copyToClipboard(this.props.src ?? '');
                this.startCopyTimer();
                return;
            }

            // copying public link to clipboard
            if (this.props.getFilePublicLink) {
                const data: any = await this.props.getFilePublicLink();
                const fileURL = data.data?.link;
                copyToClipboard(fileURL ?? '');
                this.startCopyTimer();
            }
        }
    };

    render() {
        return (
            this.renderImageOrFallback()
        );
    }
}

// Returns a transparent SVG data URI with the given intrinsic dimensions. Used as the src of the
// placeholder image so it reserves exactly the same space (once clamped by CSS) as the real image.
// The viewBox is required in addition to width/height: without it Firefox doesn't give the SVG an
// intrinsic aspect ratio when used as an <img>, so the placeholder collapses instead of reserving the
// image's box (Chrome infers the ratio from width/height alone, but Firefox does not).
function emptyImageForDimensions(width: number, height: number): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"/>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function mapStateToProps(state: GlobalState) {
    // Consumers rendered without a full store (isolated previews, some tests) keep animating.
    if (!state.entities?.preferences) {
        return {allowAnimatedImages: true};
    }

    return {
        allowAnimatedImages: getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.ALLOW_ANIMATED_IMAGES, true),
    };
}

// The empty dispatch map keeps connect from injecting a `dispatch` prop, which would be spread onto the <img>.
export default connect(mapStateToProps, {})(injectIntl(SizeAwareImage));
