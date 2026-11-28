// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TestHelper} from 'utils/test_helper';

import type {GlobalState} from 'types/store';

import type {OwnProps} from './user_settings_display';

import {makeMapStateToProps} from './index';

// #26 — C1 of #17740: the "Animated images (GIFs)" setting is on by default and reflects the saved preference
describe('components/user_settings/display/index makeMapStateToProps - allowAnimatedImages', () => {
    const user = TestHelper.getUserMock({id: 'current_user_id', locale: 'en'});

    const makeState = (myPreferences: Record<string, unknown> = {}) => ({
        entities: {
            general: {
                config: {},
                license: {},
            },
            users: {
                currentUserId: user.id,
                profiles: {[user.id]: user},
            },
            preferences: {myPreferences},
            timezone: {},
        },
    } as unknown as GlobalState);

    const animatedImagesPreference = (value: string) => ({
        'display_settings--allow_animated_images': {
            user_id: user.id,
            category: 'display_settings',
            name: 'allow_animated_images',
            value,
        },
    });

    test('should default to "true" when the user never saved the preference', () => {
        const props = makeMapStateToProps()(makeState(), {user} as OwnProps);

        expect(props.allowAnimatedImages).toBe('true');
    });

    test('should return the saved value when the user turned animations off', () => {
        const props = makeMapStateToProps()(makeState(animatedImagesPreference('false')), {user} as OwnProps);

        expect(props.allowAnimatedImages).toBe('false');
    });

    test('should read the edited user\'s preferences in admin mode (System Console > Users)', () => {
        const props = makeMapStateToProps()(makeState(), {
            user,
            adminMode: true,
            userPreferences: animatedImagesPreference('false'),
        } as OwnProps);

        expect(props.allowAnimatedImages).toBe('false');
    });
});
