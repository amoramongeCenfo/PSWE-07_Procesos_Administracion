// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react';
import React from 'react';

import ImagePreview from 'components/file_preview_modal/image_preview';

import {act, render, renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';

describe('components/view_image/ImagePreview', () => {
    const fileInfo1 = TestHelper.getFileInfoMock({id: 'file_id', extension: 'm4a', has_preview_image: false});
    const baseProps = {
        canDownloadFiles: true,
        fileInfo: fileInfo1,
    };

    test('should match snapshot, without preview', () => {
        const {container} = render(
            <ImagePreview {...baseProps}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, with preview', () => {
        const props = {
            ...baseProps,
            fileInfo: {
                ...fileInfo1,
                id: 'file_id_1',
                has_preview_image: true,
            },
        };

        const {container} = render(
            <ImagePreview {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, without preview, cannot download', () => {
        const props = {
            ...baseProps,
            canDownloadFiles: false,
        };

        const {container} = render(
            <ImagePreview {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, with preview, cannot download', () => {
        const props = {
            ...baseProps,
            canDownloadFiles: false,
            fileInfo: {
                ...fileInfo1,
                id: 'file_id_1',
                has_preview_image: true,
            },
        };

        const {container} = render(
            <ImagePreview {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should apply transform when scale is provided and not 1', () => {
        const props = {
            ...baseProps,
            scale: 2,
        };

        render(<ImagePreview {...props}/>);

        expect(screen.getByTestId('imagePreview')).toHaveStyle('transform: scale(2)');
    });

    test('should not apply transform when scale is 1', () => {
        const props = {
            ...baseProps,
            scale: 1,
        };

        render(<ImagePreview {...props}/>);

        expect(screen.getByTestId('imagePreview').getAttribute('style') || '').not.toContain('transform');
    });

    test('should call onWheel handler when wheel event fires on image', () => {
        const onWheel = jest.fn();
        const props = {
            ...baseProps,
            onWheel,
        };

        render(<ImagePreview {...props}/>);

        fireEvent.wheel(screen.getByRole('link'), {deltaY: -100});
        expect(onWheel).toHaveBeenCalledTimes(1);
    });

    test('should not download link for external file', () => {
        fileInfo1.link = 'https://example.com/image.png';
        const props = {
            ...baseProps,
            fileInfo: {
                ...fileInfo1,
                link: 'https://example.com/image.png',
                id: '',
            },
        };

        render(
            <ImagePreview {...props}/>,
        );

        expect(screen.getByRole('link')).toHaveAttribute('href', '#');
        expect(screen.getByTestId('imagePreview')).toHaveAttribute('src', props.fileInfo.link);
    });

    describe('animated images (GIFs)', () => {
        const gifProps = {
            ...baseProps,
            fileInfo: {
                ...fileInfo1,
                id: 'gif_id',
                extension: 'gif',
                has_preview_image: true,
            },
            allowAnimatedImages: false,
        };

        function loadImage(img: HTMLElement) {
            Object.defineProperty(img, 'naturalWidth', {value: 300, configurable: true});
            Object.defineProperty(img, 'naturalHeight', {value: 200, configurable: true});
            return act(() => {
                img.dispatchEvent(new Event('load', {bubbles: true}));
            });
        }

        beforeEach(() => {
            jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({drawImage: jest.fn()} as unknown as CanvasRenderingContext2D);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should open a GIF paused (still frame) when animated images are turned off', async () => {
            const {container} = renderWithContext(<ImagePreview {...gifProps}/>);

            await loadImage(screen.getByTestId('imagePreview'));

            expect(container.querySelector('canvas')).not.toBeNull();
            expect(screen.getByTestId('imagePreview')).toHaveStyle({display: 'none'});
            expect(screen.getByRole('button', {name: 'Play animation'})).toBeInTheDocument();
        });

        test('should never show the animated image while paused, even before it finishes loading', () => {
            renderWithContext(<ImagePreview {...gifProps}/>);

            expect(screen.getByTestId('imagePreview')).toHaveStyle({display: 'none'});
        });

        test('should keep animating a GIF when animated images are turned on', async () => {
            const {container} = renderWithContext(
                <ImagePreview
                    {...gifProps}
                    allowAnimatedImages={true}
                />,
            );

            await loadImage(screen.getByTestId('imagePreview'));

            expect(container.querySelector('canvas')).toBeNull();
            expect(screen.getByTestId('imagePreview')).not.toHaveStyle({display: 'none'});
            expect(screen.queryByRole('button', {name: 'Play animation'})).not.toBeInTheDocument();
        });

        test('should default to animating when the setting is not provided', async () => {
            const {allowAnimatedImages, ...propsWithoutSetting} = gifProps;
            expect(allowAnimatedImages).toBe(false);
            const {container} = renderWithContext(<ImagePreview {...propsWithoutSetting}/>);

            await loadImage(screen.getByTestId('imagePreview'));

            expect(container.querySelector('canvas')).toBeNull();
        });

        test('should not make a non-GIF image static when animated images are turned off', async () => {
            const {container} = renderWithContext(
                <ImagePreview
                    {...gifProps}
                    fileInfo={{...gifProps.fileInfo, extension: 'png'}}
                />,
            );

            await loadImage(screen.getByTestId('imagePreview'));

            expect(container.querySelector('canvas')).toBeNull();
            expect(screen.getByTestId('imagePreview')).not.toHaveStyle({display: 'none'});
            expect(screen.queryByRole('button', {name: 'Play animation'})).not.toBeInTheDocument();
        });

        test('should play with the button and pause again', async () => {
            const {container} = renderWithContext(<ImagePreview {...gifProps}/>);
            await loadImage(screen.getByTestId('imagePreview'));

            await userEvent.click(screen.getByRole('button', {name: 'Play animation'}));

            expect(container.querySelector('canvas')).toBeNull();
            expect(screen.getByTestId('imagePreview')).not.toHaveStyle({display: 'none'});

            await userEvent.click(screen.getByRole('button', {name: 'Pause animation'}));

            expect(container.querySelector('canvas')).not.toBeNull();
        });

        test('should play when the still frame is clicked', async () => {
            const {container} = renderWithContext(<ImagePreview {...gifProps}/>);
            await loadImage(screen.getByTestId('imagePreview'));

            await userEvent.click(container.querySelector('canvas') as HTMLCanvasElement);

            expect(container.querySelector('canvas')).toBeNull();
            expect(screen.getByRole('button', {name: 'Pause animation'})).toBeInTheDocument();
        });

        test('should keep playing when the animated image is clicked', async () => {
            const {container} = renderWithContext(<ImagePreview {...gifProps}/>);
            await loadImage(screen.getByTestId('imagePreview'));
            await userEvent.click(screen.getByRole('button', {name: 'Play animation'}));

            await userEvent.click(screen.getByTestId('imagePreview'));

            expect(container.querySelector('canvas')).toBeNull();
        });

        test('should apply zoom and pan to the still frame too', async () => {
            const {container} = renderWithContext(
                <ImagePreview
                    {...gifProps}
                    scale={2}
                    translate={{x: 10, y: 5}}
                    isZoomed={true}
                />,
            );
            await loadImage(screen.getByTestId('imagePreview'));

            expect(container.querySelector('canvas')).toHaveStyle({transform: 'translate(10px, 5px) scale(2)'});
        });

        test('should also pause GIFs when the user cannot download files', async () => {
            const {container} = renderWithContext(
                <ImagePreview
                    {...gifProps}
                    canDownloadFiles={false}
                />,
            );

            await loadImage(container.querySelector('img') as HTMLElement);

            expect(container.querySelector('canvas')).not.toBeNull();
        });
    });
});
