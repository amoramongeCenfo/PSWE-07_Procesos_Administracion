// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React, {useEffect, useState} from 'react';
import type {KeyboardEvent, MouseEvent} from 'react';
import {useIntl} from 'react-intl';

import {PlayIcon} from '@mattermost/compass-icons/components';
import {WithTooltip} from '@mattermost/shared/components/tooltip';

import './animated_image_toggle.scss';

export const ANIMATED_IMAGE_TOGGLE_HIDE_DELAY_MS = 5000;

type Props = {

    /*
    * True while the animation is playing (the button then offers to pause it)
    */
    playing: boolean;

    onToggle: (e: MouseEvent | KeyboardEvent) => void;
};

// Play/pause control centered over an animated image. It fades out 5 seconds after it appears (or after every
// play/pause change) and comes back on hover or keyboard focus. It stays in the DOM so it remains reachable.
export default function AnimatedImageToggle({playing, onToggle}: Props) {
    const {formatMessage} = useIntl();
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setHidden(false);
        const timer = setTimeout(() => setHidden(true), ANIMATED_IMAGE_TOGGLE_HIDE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [playing]);

    const label = playing ? formatMessage({id: 'size_aware_image.pause_animation', defaultMessage: 'Pause animation'}) : formatMessage({id: 'size_aware_image.play_animation', defaultMessage: 'Play animation'});

    return (
        <WithTooltip title={label}>
            <button
                className={classNames('style--none', 'animated-image-toggle', {'animated-image-toggle--hidden': hidden})}
                aria-label={label}
                onClick={onToggle}
            >
                {playing ? (
                    <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path d='M6 5h4v14H6zM14 5h4v14h-4z'/>
                    </svg>
                ) : (
                    <PlayIcon
                        className={'style--none'}
                        size={20}
                    />
                )}
            </button>
        </WithTooltip>
    );
}
