// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {act, renderWithContext, screen, userEvent} from 'tests/react_testing_utils';

import AnimatedImageToggle, {ANIMATED_IMAGE_TOGGLE_HIDE_DELAY_MS} from './animated_image_toggle';

describe('components/AnimatedImageToggle', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should show a play button when paused and a pause button when playing', () => {
        const {rerender} = renderWithContext(
            <AnimatedImageToggle
                playing={false}
                onToggle={jest.fn()}
            />,
        );
        expect(screen.getByRole('button', {name: 'Play animation'})).toBeInTheDocument();

        rerender(
            <AnimatedImageToggle
                playing={true}
                onToggle={jest.fn()}
            />,
        );
        expect(screen.getByRole('button', {name: 'Pause animation'})).toBeInTheDocument();
    });

    test('should call onToggle when clicked', async () => {
        const onToggle = jest.fn();
        renderWithContext(
            <AnimatedImageToggle
                playing={false}
                onToggle={onToggle}
            />,
        );

        await userEvent.setup({advanceTimers: jest.advanceTimersByTime}).click(screen.getByRole('button', {name: 'Play animation'}));

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test('should be visible on mount and hide itself after 5 seconds', () => {
        renderWithContext(
            <AnimatedImageToggle
                playing={false}
                onToggle={jest.fn()}
            />,
        );
        const button = screen.getByRole('button', {name: 'Play animation'});
        expect(button).not.toHaveClass('animated-image-toggle--hidden');

        act(() => {
            jest.advanceTimersByTime(ANIMATED_IMAGE_TOGGLE_HIDE_DELAY_MS - 1);
        });
        expect(button).not.toHaveClass('animated-image-toggle--hidden');

        act(() => {
            jest.advanceTimersByTime(1);
        });
        expect(button).toHaveClass('animated-image-toggle--hidden');
    });

    test('should stay in the DOM and keep an accessible name once hidden', () => {
        renderWithContext(
            <AnimatedImageToggle
                playing={false}
                onToggle={jest.fn()}
            />,
        );

        act(() => {
            jest.advanceTimersByTime(ANIMATED_IMAGE_TOGGLE_HIDE_DELAY_MS);
        });

        expect(screen.getByRole('button', {name: 'Play animation'})).toBeInTheDocument();
    });

    test('should show again and restart the countdown when playing changes', () => {
        const {rerender} = renderWithContext(
            <AnimatedImageToggle
                playing={false}
                onToggle={jest.fn()}
            />,
        );

        act(() => {
            jest.advanceTimersByTime(ANIMATED_IMAGE_TOGGLE_HIDE_DELAY_MS);
        });
        expect(screen.getByRole('button', {name: 'Play animation'})).toHaveClass('animated-image-toggle--hidden');

        rerender(
            <AnimatedImageToggle
                playing={true}
                onToggle={jest.fn()}
            />,
        );
        const pause = screen.getByRole('button', {name: 'Pause animation'});
        expect(pause).not.toHaveClass('animated-image-toggle--hidden');

        act(() => {
            jest.advanceTimersByTime(ANIMATED_IMAGE_TOGGLE_HIDE_DELAY_MS - 1);
        });
        expect(pause).not.toHaveClass('animated-image-toggle--hidden');

        act(() => {
            jest.advanceTimersByTime(1);
        });
        expect(pause).toHaveClass('animated-image-toggle--hidden');
    });

    test('should clear its timer on unmount', () => {
        const {unmount} = renderWithContext(
            <AnimatedImageToggle
                playing={false}
                onToggle={jest.fn()}
            />,
        );

        unmount();

        expect(jest.getTimerCount()).toBe(0);
    });
});
